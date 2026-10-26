import pytest
from app.models.otp import OtpRecord
from app.models.user import User
from app.core.security import hash_otp

def test_send_otp_success_and_hashing(client, db_session):
    phone = "+919876543210"
    response = client.post("/auth/send-otp", json={"phone_number": phone})
    assert response.status_code == 200
    data = response.json()
    assert data["phone_number"] == phone
    assert "demo_otp" in data
    assert data["expires_in_seconds"] == 300

    # Verify that the plaintext OTP is NOT stored in the database
    otp_record = db_session.query(OtpRecord).filter(OtpRecord.phone_number == phone).first()
    assert otp_record is not None
    assert otp_record.otp_hash != data["demo_otp"]
    # Verify the stored hash matches our salted SHA-256 hash
    expected_hash = hash_otp(phone, data["demo_otp"])
    assert otp_record.otp_hash == expected_hash

def test_send_otp_invalid_phone(client):
    response = client.post("/auth/send-otp", json={"phone_number": "invalid-123"})
    assert response.status_code == 400
    assert "Invalid phone number format" in response.json()["detail"]

def test_send_otp_rate_limiting(client):
    phone = "+919123456789"
    # First request
    res1 = client.post("/auth/send-otp", json={"phone_number": phone})
    assert res1.status_code == 200

    # Immediate second request should be rate-limited (429)
    res2 = client.post("/auth/send-otp", json={"phone_number": phone})
    assert res2.status_code == 429
    assert "Rate limit exceeded" in res2.json()["detail"]

def test_verify_otp_flow(client, db_session):
    phone = "+919988776655"
    res_send = client.post("/auth/send-otp", json={"phone_number": phone})
    assert res_send.status_code == 200
    demo_otp = res_send.json()["demo_otp"]

    # Verify with correct OTP
    res_verify = client.post("/auth/verify-otp", json={
        "phone_number": phone,
        "otp_code": demo_otp
    })
    assert res_verify.status_code == 200
    data = res_verify.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["phone_number"] == phone

    # Verify protected route /auth/me with the token
    headers = {"Authorization": f"Bearer {data['access_token']}"}
    res_me = client.get("/auth/me", headers=headers)
    assert res_me.status_code == 200
    assert res_me.json()["phone_number"] == phone

def test_verify_otp_max_attempts(client):
    phone = "+919555666777"
    client.post("/auth/send-otp", json={"phone_number": phone})

    # Attempt 1: wrong OTP
    res1 = client.post("/auth/verify-otp", json={"phone_number": phone, "otp_code": "000000"})
    assert res1.status_code == 400
    assert "2 attempt(s) remaining" in res1.json()["detail"]

    # Attempt 2: wrong OTP
    res2 = client.post("/auth/verify-otp", json={"phone_number": phone, "otp_code": "000001"})
    assert res2.status_code == 400
    assert "1 attempt(s) remaining" in res2.json()["detail"]

    # Attempt 3: wrong OTP -> max attempts exceeded
    res3 = client.post("/auth/verify-otp", json={"phone_number": phone, "otp_code": "000002"})
    assert res3.status_code == 400
    assert "Maximum attempts exceeded" in res3.json()["detail"]

def test_password_registration_and_login(client):
    phone = "+919444333222"
    password = "StrongPassword@2026"

    # Register password
    res_reg = client.post("/auth/register-password", json={
        "phone_number": phone,
        "password": password
    })
    assert res_reg.status_code == 200
    assert "access_token" in res_reg.json()

    # Login with correct password
    res_login = client.post("/auth/login-password", json={
        "phone_number": phone,
        "password": password
    })
    assert res_login.status_code == 200
    assert "access_token" in res_login.json()

    # Login with wrong password
    res_wrong = client.post("/auth/login-password", json={
        "phone_number": phone,
        "password": "WrongPassword123"
    })
    assert res_wrong.status_code == 401
    # Generic message: must not reveal whether the account exists (anti-enumeration).
    assert "Invalid credentials" in res_wrong.json()["detail"]

def test_protected_routes_unauthorized(client):
    # Attempting to access /auth/me without token
    res = client.get("/auth/me")
    assert res.status_code == 401
    assert "Authentication required" in res.json()["detail"]

    # Attempting to logout without token
    res_logout = client.post("/auth/logout")
    assert res_logout.status_code == 401

def test_email_registration_and_privacy_flow(client):
    email = "gargi.test@hercare.app"
    password = "SafePassword@2026"

    # Register with email
    res_reg = client.post("/auth/register-password", json={
        "email": email,
        "password": password,
        "preferred_name": "Gargi"
    })
    assert res_reg.status_code == 200
    reg_data = res_reg.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == email
    assert reg_data["user"]["preferred_name"] == "Gargi"
    assert reg_data["user"]["privacy_agreement_accepted"] is False
    token = reg_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Login with email
    res_login = client.post("/auth/login-password", json={
        "email": email,
        "password": password
    })
    assert res_login.status_code == 200
    assert "access_token" in res_login.json()

    # Accept Privacy and CIA Agreement
    res_agree = client.post("/auth/privacy-agreement", json={"accepted": True, "version": "1.0"}, headers=headers)
    assert res_agree.status_code == 200
    assert res_agree.json()["privacy_agreement_accepted"] is True

    # Complete Onboarding
    res_onboard = client.post("/auth/complete-onboarding", headers=headers)
    assert res_onboard.status_code == 200
    assert res_onboard.json()["onboarding_completed"] is True

