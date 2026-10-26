import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, LargeBinary, Integer, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base

class SymptomRecord(Base):
    """
    Daily symptom and mood logs.
    All sensitive health data:
      - Log date and flow -> encrypted in `dates_encrypted` (BYTEA)
      - Symptoms, mood, energy, pain -> encrypted in `symptoms_encrypted` (BYTEA)
      - Notes -> encrypted in `notes_encrypted` (BYTEA)
    Protected with AES-256-GCM.
    SHA-256 cryptographic integrity hash.
    """
    __tablename__ = "encrypted_symptom_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Encrypted fields (BYTEA in Postgres)
    dates_encrypted = Column(LargeBinary, nullable=False)
    symptoms_encrypted = Column(LargeBinary, nullable=False)
    notes_encrypted = Column(LargeBinary, nullable=True)

    # Security metadata
    encryption_version = Column(String(16), default="v1-aes256gcm")
    record_hash = Column(String(64), nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="symptoms")

    def __repr__(self):
        return f"<SymptomRecord id={self.id} user_id={self.user_id}>"
