import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Integer, DateTime
from app.core.database import Base

class OtpRecord(Base):
    """
    OTP records storing only salted hashes.
    Max 3 incorrect attempts.
    Expires in 5 minutes.
    """
    __tablename__ = "otp_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    phone_number = Column(String(20), nullable=False, index=True)
    otp_hash = Column(String(128), nullable=False) # Salted SHA-256 hash (never plaintext)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, default=False)
    attempts = Column(Integer, default=0) # Tracks incorrect attempts (max 3)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def __init__(self, **kwargs):
        # Allow otp_code alias in constructor for testing convenience
        if "otp_code" in kwargs and "otp_hash" not in kwargs:
            kwargs["otp_hash"] = kwargs.pop("otp_code")
        super().__init__(**kwargs)

    def is_valid(self) -> bool:
        """
        Check if OTP has not expired, not used, and attempts < 3.
        """
        if self.expires_at is None or self.is_used or self.attempts >= 3:
            return False
        
        expires = self.expires_at
        if expires.tzinfo is None:
            now = datetime.now(timezone.utc).replace(tzinfo=None)
        else:
            now = datetime.now(timezone.utc)

        return expires > now
