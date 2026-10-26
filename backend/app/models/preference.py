import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, LargeBinary
from sqlalchemy.orm import relationship
from app.core.database import Base

class Preference(Base):
    """
    User Preferences & Onboarding Data.
    Sensitive fields (nickname, food dislikes, exercise, energy) are encrypted using AES-256-GCM.
    Stored as LargeBinary (BYTEA in Postgres).
    SHA-256 integrity hash is stored in record_hash.
    """
    __tablename__ = "preferences"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # Encrypted fields (BYTEA in Postgres)
    nickname_encrypted = Column(LargeBinary, nullable=False)
    food_dislikes_encrypted = Column(LargeBinary, nullable=True)
    exercise_pref_encrypted = Column(LargeBinary, nullable=True)
    energy_level_encrypted = Column(LargeBinary, nullable=True)

    # Integrity verification (SHA-256)
    record_hash = Column(String(64), nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="preference")

    def __repr__(self):
        return f"<Preference user_id={self.user_id} hash={self.record_hash[:8]}...>"
