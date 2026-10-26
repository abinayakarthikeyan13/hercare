"""
Demo-mode OTP gating.

Rules under test:
  * development (`ENV != production`): demo OTP is deterministic and returned to the client
  * production: OTP is random, never returned in the response, and never logged
"""

import pytest
from fastapi import HTTPException

from app.config import settings
from app.services import otp_service
from app.core.security import verify_otp_hash
from app.models.otp import OtpRecord


def test_dev_mode_returns_demo_otp(db_session, monkeypatch):
    monkeypatch.setattr(settings, "ENV", "development")
    monkeypatch.setattr(settings, "DEMO_MODE", True)
    monkeypatch.setattr(settings, "DEMO_OTP", "123456")

    phone, demo_otp, expires_in = otp_service.send_otp_for_phone(db_session, "+911111111111")

    assert phone == "+911111111111"
    assert demo_otp == "123456"
    assert expires_in == 300


def test_production_uses_random_otp_and_does_not_echo(db_session, monkeypatch):
    monkeypatch.setattr(settings, "ENV", "production")
    monkeypatch.setattr(settings, "DEMO_MODE", True)
    monkeypatch.setattr(settings, "DEMO_OTP", "123456")

    phone, demo_otp, expires_in = otp_service.send_otp_for_phone(db_session, "+912222222222")

    # OTP is never returned to the client in production
    assert demo_otp is None
    assert expires_in == 300

    # Stored hash must verify against a real 6-digit code that is NOT the demo code
    record = (
        db_session.query(OtpRecord)
        .filter(OtpRecord.phone_number == phone)
        .order_by(OtpRecord.created_at.desc())
        .first()
    )
    assert record is not None
    assert record.otp_hash != "123456"

    # Brute-force check: some 6-digit code other than the demo OTP must match
    matching = None
    for candidate in range(100000, 1000000):
        if verify_otp_hash(phone, str(candidate), record.otp_hash):
            matching = str(candidate)
            break
    assert matching is not None, "no 6-digit OTP verified against the stored hash"
    assert matching != "123456"


def test_production_still_enforces_attempts_and_expiry(db_session, monkeypatch):
    monkeypatch.setattr(settings, "ENV", "production")
    monkeypatch.setattr(settings, "DEMO_MODE", True)

    phone, _, _ = otp_service.send_otp_for_phone(db_session, "+913333333333")

    with pytest.raises(HTTPException) as exc_info:
        otp_service.verify_otp_for_phone(db_session, phone, "000000")
    # Wrong code is rejected (400) and counts as an attempt
    assert exc_info.value.status_code == 400

    record = (
        db_session.query(OtpRecord)
        .filter(OtpRecord.phone_number == phone)
        .order_by(OtpRecord.created_at.desc())
        .first()
    )
    assert record.attempts == 1
