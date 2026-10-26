import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

logger = logging.getLogger(__name__)

# Canonical path to local SQLite fallback database
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FALLBACK_SQLITE_PATH = os.path.join(BASE_DIR, "hercare_dev.db")

def init_engine():
    db_url = settings.DATABASE_URL
    connect_args = {}

    if db_url.startswith("postgresql://") and not db_url.startswith("postgresql+psycopg2://"):
        db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    if db_url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
        return create_engine(db_url, connect_args=connect_args)

    try:
        candidate_engine = create_engine(
            db_url,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 3} if "postgres" in db_url else {}
        )
        # Attempt lightweight probe to check real availability
        with candidate_engine.connect() as conn:
            pass
        logger.info(f"Database connection verified: {db_url}")
        return candidate_engine
    except Exception as e:
        logger.warning(
            f"Primary DB unavailable ({settings.DATABASE_URL}). Error: {e}. "
            f"Falling back safely to local development SQLite database: {FALLBACK_SQLITE_PATH}"
        )
        return create_engine(
            f"sqlite:///{FALLBACK_SQLITE_PATH}",
            connect_args={"check_same_thread": False}
        )

engine = init_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency to retrieve database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

