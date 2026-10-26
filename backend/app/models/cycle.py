import uuid
from datetime import datetime, timezone, date
from sqlalchemy import Column, String, Integer, Date, DateTime, ForeignKey, LargeBinary
from sqlalchemy.orm import relationship
from app.core.database import Base

class CycleRecord(Base):
    """
    Menstrual cycle entries.
    All sensitive health data:
      - Cycle dates (start_date, end_date) -> encrypted in `dates_encrypted` (BYTEA)
      - Symptoms & mood -> encrypted in `symptoms_encrypted` (BYTEA)
      - Notes -> encrypted in `notes_encrypted` (BYTEA)
    Protected with AES-256-GCM.
    Cryptographically verified with SHA-256 integrity hash.
    """
    __tablename__ = "cycle_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Encrypted dates (BYTEA: AES-256-GCM encrypted JSON string of {"start_date": "...", "end_date": "..."})
    dates_encrypted = Column(LargeBinary, nullable=True)

    # Optional plain start_date for database indexing if needed, or nullable
    start_date = Column(Date, nullable=True, index=True)
    end_date = Column(Date, nullable=True)

    cycle_length = Column(Integer, nullable=True)   # e.g. 28 days
    period_length = Column(Integer, nullable=True)  # e.g. 5 days

    # Encrypted clinical data (BYTEA in Postgres)
    symptoms_encrypted = Column(LargeBinary, nullable=True) # Encrypted JSON array
    notes_encrypted = Column(LargeBinary, nullable=True)     # Encrypted personal notes

    # Cryptographic integrity check (SHA-256)
    record_hash = Column(String(64), nullable=False)
    sync_status = Column(String(20), default="synced")

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="cycles")

    def __repr__(self):
        return f"<CycleRecord id={self.id} user_id={self.user_id}>"
