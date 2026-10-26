"""
Tests for the additive schema migration (`app.core.migrations`).

These tests build a *stale* database (the schema HerCare shipped before the
email/agreement columns existed) and verify that:

  1. `run_additive_migrations()` adds the missing columns,
  2. existing rows survive untouched,
  3. running it twice is a no-op (idempotent),
  4. real model queries work against the repaired database.
"""

import os
import sqlite3
import tempfile

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.core.migrations import run_additive_migrations
from app.models.user import User


STALE_USERS_DDL = """
CREATE TABLE users (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    phone_number VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    is_demo_user BOOLEAN,
    preferred_language VARCHAR(5),
    cloud_sync_enabled BOOLEAN,
    created_at DATETIME,
    updated_at DATETIME
)
"""


@pytest.fixture()
def stale_db_path():
    """Create a temp SQLite file with the pre-migration schema and one legacy row."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)

    con = sqlite3.connect(path)
    cur = con.cursor()
    cur.execute(STALE_USERS_DDL)
    cur.execute(
        "INSERT INTO users (id, phone_number, password_hash, is_demo_user, "
        "preferred_language, cloud_sync_enabled) VALUES (?, ?, ?, ?, ?, ?)",
        ("legacy-user-id", "+919876543210", "bcrypt$hash", 1, "ta", 0),
    )
    con.commit()
    con.close()
    yield path
    if os.path.exists(path):
        os.remove(path)


def _columns_of(db_path: str, table: str) -> set:
    con = sqlite3.connect(db_path)
    cols = {row[1] for row in con.execute(f"PRAGMA table_info({table})").fetchall()}
    con.close()
    return cols


def test_additive_migration_adds_missing_user_columns(stale_db_path):
    engine = create_engine(f"sqlite:///{stale_db_path}")

    before = _columns_of(stale_db_path, "users")
    assert "email" not in before
    assert "privacy_agreement_accepted" not in before

    applied = run_additive_migrations(engine)

    after = _columns_of(stale_db_path, "users")
    for expected in (
        "email",
        "preferred_name",
        "privacy_agreement_accepted",
        "privacy_agreement_version",
        "privacy_agreement_date",
        "onboarding_completed",
    ):
        assert expected in after, f"migration did not add {expected}"

    # Every statement it ran is additive/repair DDL (no UPDATE/DELETE of user rows)
    assert len(applied) >= len(after - before)
    for stmt in applied:
        upper = stmt.upper()
        assert "UPDATE " not in upper and "DELETE FROM" not in upper
        assert any(
            marker in upper
            for marker in ("ADD COLUMN", "DROP NOT NULL", "CREATE TABLE", "INSERT INTO", "DROP TABLE", "RENAME TO")
        ), f"unexpected migration statement: {stmt}"

    engine.dispose()


def test_existing_rows_survive_migration(stale_db_path):
    engine = create_engine(f"sqlite:///{stale_db_path}")
    run_additive_migrations(engine)

    con = sqlite3.connect(stale_db_path)
    row = con.execute(
        "SELECT id, phone_number, preferred_language FROM users WHERE id = 'legacy-user-id'"
    ).fetchone()
    con.close()
    engine.dispose()

    assert row is not None, "existing user row was lost by the migration"
    assert row == ("legacy-user-id", "+919876543210", "ta")


def test_migration_is_idempotent(stale_db_path):
    engine = create_engine(f"sqlite:///{stale_db_path}")

    first = run_additive_migrations(engine)
    second = run_additive_migrations(engine)

    assert len(first) > 0
    assert second == [], "second run should be a no-op"

    engine.dispose()


def test_orm_queries_work_after_migration(stale_db_path):
    """The exact query that used to raise `no such column: users.email` now succeeds."""
    engine = create_engine(f"sqlite:///{stale_db_path}")
    run_additive_migrations(engine)

    TestingSession = sessionmaker(bind=engine)
    session = TestingSession()

    user = session.query(User).filter(User.email == "nobody@example.com").first()
    assert user is None

    legacy = session.query(User).filter(User.id == "legacy-user-id").first()
    assert legacy is not None
    assert legacy.phone_number == "+919876543210"
    assert legacy.privacy_agreement_accepted in (False, 0)
    assert legacy.onboarding_completed in (False, 0)

    session.close()
    engine.dispose()


def test_migration_relaxes_legacy_not_null_on_phone(stale_db_path):
    """The legacy schema forced phone_number NOT NULL; email-only accounts must now work."""
    engine = create_engine(f"sqlite:///{stale_db_path}")
    run_additive_migrations(engine)

    TestingSession = sessionmaker(bind=engine)
    session = TestingSession()

    email_only = User(
        id="email-only-user",
        email="someone@example.com",
        password_hash="bcrypt$hash",
        preferred_language="en",
    )
    session.add(email_only)
    session.commit()

    fetched = session.query(User).filter(User.email == "someone@example.com").first()
    assert fetched is not None
    assert fetched.phone_number is None

    # The legacy phone user still exists with its original data
    legacy = session.query(User).filter(User.id == "legacy-user-id").first()
    assert legacy is not None
    assert legacy.phone_number == "+919876543210"

    session.close()
    engine.dispose()


def test_migration_does_not_touch_current_schema():
    """On a freshly created database the migration must be a no-op."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)

    applied = run_additive_migrations(engine)
    assert applied == []

    engine.dispose()


def test_safe_with_engine_url_text():
    """Sanity check: helper compiles types against the dialect."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).fetchall()
    assert len(rows) > 0
    engine.dispose()
