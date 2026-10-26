import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, LargeBinary
from sqlalchemy.orm import relationship
from app.core.database import Base

class ChatHistory(Base):
    """
    AI Conversation History.
    Message content is encrypted using AES-256-GCM.
    Red flag audits track triage triggers without storing plaintext.
    """
    __tablename__ = "chat_history"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(String(64), nullable=False, index=True)
    role = Column(String(10), nullable=False) # 'user' or 'assistant'
    language = Column(String(5), default="en") # 'en' or 'ta'

    # Encrypted message content (BYTEA in Postgres)
    content_encrypted = Column(LargeBinary, nullable=False)

    # SHA-256 hash for message integrity checking
    record_hash = Column(String(64), nullable=False)

    # Safety triage metrics
    red_flag_detected = Column(Boolean, default=False)
    red_flag_category = Column(String(50), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="chat_logs")

    def __repr__(self):
        return f"<ChatHistory user_id={self.user_id} role={self.role} red_flag={self.red_flag_detected}>"
