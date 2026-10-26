import secrets
import logging
from datetime import datetime, timedelta, timezone
from typing import Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from fastapi import HTTPException, status
from app.config import settings
from app.models.otp import OtpRecord
from app.models.user import User
from app.core.security import (
    validate_and_normalize_phone,
    hash_otp,
    verify_otp_hash,
    create_access_token
)

logger = logging.getLogger("hercare.otp")

def send_otp_for_phone(db: Session, raw_phone: str) -> Tuple[str, Optional[str], int]:
    """
    Validates phone number, enforces rate-limiting (60s), generates 6-digit OTP,
    hashes it, stores it, prints to backend console, and returns response metadata.
    """
    try:
        phone_number = validate_and_normalize_phone(raw_phone)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    now = datetime.now(timezone.utc)

    # 1. Rate-limiting check: 1 OTP request per 60 seconds per phone number
    latest_record = (
        db.query(OtpRecord)
        .filter(OtpRecord.phone_number == phone_number)
        .order_by(desc(OtpRecord.created_at))
        .first()
    )

    if latest_record and latest_record.created_at:
        record_created = latest_record.created_at
        if record_created.tzinfo is None:
            record_created = record_created.replace(tzinfo=timezone.utc)
        
        elapsed_seconds = (now - record_created).total_seconds()
        if elapsed_seconds < 60:
            remaining = int(60 - elapsed_seconds)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Please wait {remaining} seconds before requesting another OTP."
            )

    # 2. Invalidate any previous unused OTPs for this number
    db.query(OtpRecord).filter(
        OtpRecord.phone_number == phone_number,
        OtpRecord.is_used == False
    ).update({"is_used": True})

    # 3. Generate 6-digit cryptographically secure OTP.
    # A predictable demo code is ONLY used outside production (ENV != production),
    # so production accounts always receive a random single-use code.
    is_production = settings.ENV.strip().lower() == "production"
    otp_code = str(secrets.randbelow(900000) + 100000)

    if settings.DEMO_MODE and settings.DEMO_OTP and not is_production:
        otp_code = settings.DEMO_OTP

    # 4. Hash the OTP (Store ONLY salted SHA-256 hash)
    otp_hash_val = hash_otp(phone_number, otp_code)
    expires_at = now + timedelta(minutes=5)

    otp_entry = OtpRecord(
        phone_number=phone_number,
        otp_hash=otp_hash_val,
        expires_at=expires_at,
        is_used=False,
        attempts=0,
        created_at=now
    )
    db.add(otp_entry)
    db.commit()

    # 5. Print OTP to backend console in development/demo only.
    #    Production logs must NEVER contain OTP values.
    if not is_production:
        logger.info("=" * 60)
        logger.info("🔑 [HERCARE DEMO OTP DISPATCH]")
        logger.info(f"Recipient Mobile: {phone_number}")
        logger.info(f"Generated OTP   : {otp_code}")
        logger.info("Expires In      : 5 Minutes (Max 3 Incorrect Attempts)")
        logger.info("=" * 60)
        print(f"\n[HERCARE DEMO OTP] Mobile: {phone_number} | OTP: {otp_code} | Valid: 5 min\n", flush=True)

    # The OTP value is only ever returned to the client in development/demo mode.
    demo_return = otp_code if (settings.DEMO_MODE and not is_production) else None
    return phone_number, demo_return, 300

def verify_otp_for_phone(db: Session, raw_phone: str, otp_code: str) -> Tuple[User, str]:
    """
    Verifies OTP code against stored salted hash.
    Enforces maximum 3 attempts and 5-minute expiration.
    Returns authenticated User and signed JWT token.
    """
    try:
        phone_number = validate_and_normalize_phone(raw_phone)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    now = datetime.now(timezone.utc)

    # Fetch latest active OTP record for phone number
    otp_record = (
        db.query(OtpRecord)
        .filter(
            OtpRecord.phone_number == phone_number,
            OtpRecord.is_used == False
        )
        .order_by(desc(OtpRecord.created_at))
        .first()
    )

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active OTP found for this number. Please request an OTP first."
        )

    # Check expiration
    expires = otp_record.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)

    if expires < now:
        otp_record.is_used = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired (validity is 5 minutes). Please request a new OTP."
        )

    # Check if attempts exceeded limit
    if otp_record.attempts >= 3:
        otp_record.is_used = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum attempts exceeded. This OTP has been invalidated. Please request a new one."
        )

    # Verify salted hash
    is_valid = verify_otp_hash(phone_number, otp_code.strip(), otp_record.otp_hash)

    if not is_valid:
        otp_record.attempts += 1
        remaining_attempts = 3 - otp_record.attempts
        if remaining_attempts <= 0:
            otp_record.is_used = True
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect OTP. Maximum attempts exceeded. This OTP has been invalidated."
            )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Incorrect OTP. {remaining_attempts} attempt(s) remaining."
        )

    # Mark OTP as successfully consumed
    otp_record.is_used = True

    # Find or create User
    user = db.query(User).filter(User.phone_number == phone_number).first()
    if not user:
        user = User(
            phone_number=phone_number,
            is_demo_user=settings.DEMO_MODE,
            preferred_language="en",
            cloud_sync_enabled=False
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Generate JWT access token
    access_token = create_access_token(data={"sub": user.id, "phone": user.phone_number})
    db.commit()

    return user, access_token
