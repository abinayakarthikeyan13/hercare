"""
Schema migrations for HerCare databases created by older revisions of the app.

Two classes of drift are repaired automatically at startup:

1. **Missing columns.** `Base.metadata.create_all()` only creates *missing tables*;
   it never adds columns to existing tables. Older databases lack newer columns
   (e.g. `users.email`), which makes every query touching them fail.
   Fixed with `ALTER TABLE ... ADD COLUMN`.

2. **Legacy NOT NULL constraints.** The original schema declared `users.phone_number`
   NOT NULL, but email/password accounts are legitimately phone-less.
   Fixed with `ALTER TABLE ... DROP NOT NULL` on PostgreSQL, and with a transactional
   table rebuild on SQLite (SQLite cannot alter column constraints).

Rules honoured by this module:
  * no row is ever deleted or modified — only schema changes,
  * every operation runs inside a single transaction (all-or-nothing),
  * the migration is idempotent (a second run is a no-op),
  * on SQLite the rebuild copies every existing row and preserves its values.
"""

import logging
from typing import List

from sqlalchemy import inspect, text
from sqlalchemy.schema import CreateTable

from app.core.database import Base

logger = logging.getLogger("hercare.migrations")


def _scalar_default_sql(column) -> str | None:
    """
    Return a SQL literal for a column's Python-side default, if it is a simple scalar
    that can safely back a `DEFAULT` clause. Callable defaults are skipped.
    """
    default = getattr(column, "default", None)
    if default is None:
        return None

    arg = getattr(default, "arg", None)
    if arg is None or callable(arg) or isinstance(arg, bool):
        return None

    if isinstance(arg, (int, float)):
        return str(arg)
    if isinstance(arg, str):
        return "'" + arg.replace("'", "''") + "'"
    return None


def _boolean_default_sql(column, dialect_name: str) -> str | None:
    default = getattr(column, "default", None)
    if default is None:
        return None
    arg = getattr(default, "arg", None)
    if arg is None or callable(arg) or not isinstance(arg, bool):
        return None
    if dialect_name == "sqlite":
        return "1" if arg else "0"
    return "TRUE" if arg else "FALSE"


def _default_sql_for(column, dialect_name: str) -> str | None:
    if column.type.__class__.__name__ == "Boolean":
        return _boolean_default_sql(column, dialect_name)
    return _scalar_default_sql(column)


def _add_missing_columns(conn, inspector, table, dialect_name: str) -> List[str]:
    """Add any model column that is missing from the live table."""
    applied: List[str] = []
    existing_columns = {c["name"] for c in inspector.get_columns(table.name)}

    for column in table.columns:
        if column.name in existing_columns:
            continue

        try:
            col_type = column.type.compile(dialect=conn.dialect)
        except Exception:
            col_type = str(column.type)

        default_sql = _default_sql_for(column, dialect_name)

        constraints = ""
        if not column.nullable:
            if default_sql is None:
                logger.warning(
                    "Skipping NOT NULL column %s.%s: no safe default for existing rows.",
                    table.name,
                    column.name,
                )
                continue
            constraints = f" NOT NULL DEFAULT {default_sql}"
        elif default_sql is not None:
            constraints = f" DEFAULT {default_sql}"

        ddl = f'ALTER TABLE "{table.name}" ADD COLUMN "{column.name}" {col_type}{constraints}'
        try:
            conn.execute(text(ddl))
            applied.append(ddl)
            logger.info("Applied additive migration: %s", ddl)
        except Exception as exc:
            logger.warning("Could not apply migration '%s': %s (skipping)", ddl, exc)

    return applied


def _rebuild_sqlite_table(conn, table) -> str:
    """
    SQLite cannot DROP a NOT NULL constraint, so rebuild the table the standard
    (SQLite-recipe) way inside the caller's transaction:

        create new table -> copy every row -> drop old -> rename

    Nothing is deleted: all existing rows and column values are carried across.
    """
    temp_name = f"{table.name}__hercare_migration"

    create_temp = str(CreateTable(table).compile(dialect=conn.dialect))
    create_temp = create_temp.replace(
        f'CREATE TABLE "{table.name}"', f'CREATE TABLE "{temp_name}"', 1
    ).replace(
        f"CREATE TABLE {table.name}", f"CREATE TABLE {temp_name}", 1
    )

    live_columns = [c["name"] for c in inspect(conn).get_columns(table.name)]
    model_columns = [c.name for c in table.columns]

    target_cols = ", ".join(f'"{c}"' for c in model_columns)
    source_exprs = []
    for column in table.columns:
        if column.name in live_columns:
            source_exprs.append(f'"{column.name}"')
        else:
            default_sql = _default_sql_for(column, conn.dialect.name)
            source_exprs.append(default_sql if default_sql is not None else "NULL")

    ddl_statements = [
        create_temp,
        f'INSERT INTO "{temp_name}" ({target_cols}) SELECT {", ".join(source_exprs)} FROM "{table.name}"',
        f'DROP TABLE "{table.name}"',
        f'ALTER TABLE "{temp_name}" RENAME TO "{table.name}"',
    ]

    for stmt in ddl_statements:
        conn.execute(text(stmt))

    return "; ".join(ddl_statements)


def run_additive_migrations(engine) -> List[str]:
    """
    Bring an existing database's schema in line with the current SQLAlchemy models.

    Returns the list of applied DDL statements (empty when the schema is current).
    """
    applied: List[str] = []
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    dialect_name = engine.dialect.name

    with engine.begin() as conn:
        inspector = inspect(conn)

        for table in Base.metadata.sorted_tables:
            if table.name not in existing_tables:
                # Missing tables are handled by `Base.metadata.create_all()`.
                continue

            # 1. Add missing columns
            applied.extend(_add_missing_columns(conn, inspector, table, dialect_name))

            # 2. Relax NOT NULL constraints that the model declares as nullable.
            #    (Re-inspect: step 1 may have added columns.)
            live_columns = {c["name"]: c for c in inspector.get_columns(table.name)}
            for column in table.columns:
                live = live_columns.get(column.name)
                if live is None:
                    continue
                if not column.nullable and live.get("nullable", True):
                    # Model is stricter than the database; leave that alone here.
                    continue
                if column.nullable and not live.get("nullable", True):
                    if dialect_name == "sqlite":
                        logger.info(
                            "Rebuilding SQLite table '%s' to relax NOT NULL on '%s' (all rows preserved).",
                            table.name,
                            column.name,
                        )
                        ddl = _rebuild_sqlite_table(conn, table)
                    else:
                        ddl = (
                            f'ALTER TABLE "{table.name}" '
                            f'ALTER COLUMN "{column.name}" DROP NOT NULL'
                        )
                        conn.execute(text(ddl))
                    applied.append(ddl)
                    # Only one rebuild per table is needed; re-inspect afterwards.
                    live_columns = {
                        c["name"]: c for c in inspector.get_columns(table.name)
                    }
                    break

    if applied:
        logger.info("Schema migration complete: %d statement(s) applied.", len(applied))
    else:
        logger.debug("Schema already up to date; no migration required.")

    return applied
