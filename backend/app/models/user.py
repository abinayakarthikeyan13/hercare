import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    phone_number = Column(String(50), unique=True, nullable=True, index=True)
    email = Column(String(255), unique=True, nullable=True, index=True)
    password_hash = Column(String(255), nullable=True)
    preferred_name = Column(String(100), nullable=True)
    is_demo_user = Column(Boolean, default=False)
    preferred_language = Column(String(5), default="en") # 'en' or 'ta'
    cloud_sync_enabled = Column(Boolean, default=False)
    privacy_agreement_accepted = Column(Boolean, default=False)
    privacy_agreement_version = Column(String(20), default="1.0")
    privacy_agreement_date = Column(DateTime(timezone=True), nullable=True)
    onboarding_completed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    preference = relationship("Preference", back_populates="user", uselist=False, cascade="all, delete-orphan")
    cycles = relationship("CycleRecord", back_populates="user", cascade="all, delete-orphan")
    symptoms = relationship("SymptomRecord", back_populates="user", cascade="all, delete-orphan")
    chat_logs = relationship("ChatHistory", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        ident = self.email or self.phone_number or self.id
        return f"<User ident={ident} demo={self.is_demo_user}>"
