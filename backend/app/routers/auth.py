import re
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import (
    validate_and_normalize_phone,
    hash_password,
    verify_password,
    create_access_token
)
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import (
    SendOtpRequest,
    SendOtpResponse,
    VerifyOtpRequest,
    RegisterPasswordRequest,
    LoginPasswordRequest,
    PrivacyAgreementRequest,
    UpdateProfileRequest,
    TokenResponse,
    UserResponse
)
from app.services.otp_service import send_otp_for_phone, verify_otp_for_phone
from app.core.ratelimit import enforce_rate_limit

router = APIRouter(prefix="", tags=["Authentication"])

# Generic message shared by all credential failures so that responses do not
# reveal whether an account exists (no user enumeration).
INVALID_CREDENTIALS_DETAIL = "Invalid credentials. Please check your details and try again."

EMAIL_REGEX = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"

def format_user_response(user: User) -> UserResponse:
    """Format SQLAlchemy User model into UserResponse schema."""
    return UserResponse(
        id=user.id,
        phone_number=user.phone_number,
        email=user.email,
        preferred_name=user.preferred_name,
        is_demo_user=user.is_demo_user or False,
        preferred_language=user.preferred_language or "en",
        cloud_sync_enabled=user.cloud_sync_enabled or False,
        privacy_agreement_accepted=user.privacy_agreement_accepted or False,
        privacy_agreement_version=user.privacy_agreement_version or "1.0",
        onboarding_completed=user.onboarding_completed or False,
        has_password=bool(user.password_hash),
        created_at=user.created_at
    )

@router.post("/send-otp", response_model=SendOtpResponse)
def send_otp(payload: SendOtpRequest, request: Request, db: Session = Depends(get_db)):
    # Slow down bulk OTP requests per client (in addition to the per-number 60s limit)
    enforce_rate_limit(request, bucket="send_otp", max_hits=10, window_seconds=300)
    """
    Request 6-digit OTP for mobile number.
    In Demo mode, OTP is printed to the backend console.
    Enforces 60-second rate-limiting and 5-minute expiration.
    """
    phone_number, demo_otp, expires_in = send_otp_for_phone(db, payload.phone_number)
    return SendOtpResponse(
        message="OTP generated successfully. In Demo mode, check backend console or use demo code.",
        phone_number=phone_number,
        demo_otp=demo_otp,
        expires_in_seconds=expires_in
    )

@router.post("/verify-otp", response_model=TokenResponse)
def verify_otp(payload: VerifyOtpRequest, db: Session = Depends(get_db)):
    """
    Verify 6-digit OTP and issue JWT access token.
    Max 3 incorrect attempts. Only salted hash is stored.
    """
    user, access_token = verify_otp_for_phone(db, payload.phone_number, payload.otp_code)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=format_user_response(user)
    )

@router.post("/register-password", response_model=TokenResponse)
def register_with_password(payload: RegisterPasswordRequest, request: Request, db: Session = Depends(get_db)):
    enforce_rate_limit(request, bucket="register", max_hits=10, window_seconds=300)
    """
    Register account using email or mobile number with password.
    Enforces password complexity (minimum 6 characters) and bcrypt hashing.
    """
    if len(payload.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    phone_number = None
    email = None

    if payload.email:
        clean_email = payload.email.strip().lower()
        if not re.match(EMAIL_REGEX, clean_email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email address format."
            )
        email = clean_email

    if payload.phone_number:
        try:
            phone_number = validate_and_normalize_phone(payload.phone_number)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if not email and not phone_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide either an email address or mobile number."
        )

    # Check for existing user by email or phone
    existing_user = None
    if email:
        existing_user = db.query(User).filter(User.email == email).first()
    if not existing_user and phone_number:
        existing_user = db.query(User).filter(User.phone_number == phone_number).first()

    if existing_user and existing_user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email or mobile number already exists. Please log in."
        )

    hashed_pw = hash_password(payload.password)
    if not existing_user:
        user = User(
            email=email,
            phone_number=phone_number,
            password_hash=hashed_pw,
            preferred_name=payload.preferred_name,
            is_demo_user=False,
            preferred_language="en"
        )
        db.add(user)
    else:
        user = existing_user
        user.password_hash = hashed_pw
        if email and not user.email:
            user.email = email
        if phone_number and not user.phone_number:
            user.phone_number = phone_number
        if payload.preferred_name:
            user.preferred_name = payload.preferred_name

    db.commit()
    db.refresh(user)

    subject_claim = user.id
    token_claims = {"sub": subject_claim}
    if user.email:
        token_claims["email"] = user.email
    if user.phone_number:
        token_claims["phone"] = user.phone_number

    access_token = create_access_token(data=token_claims)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=format_user_response(user)
    )

@router.post("/login-password", response_model=TokenResponse)
def login_with_password(payload: LoginPasswordRequest, request: Request, db: Session = Depends(get_db)):
    # Cap credential attempts per client address
    enforce_rate_limit(request, bucket="login", max_hits=15, window_seconds=300)
    """
    Log in using email or mobile number and password.
    """
    phone_number = None
    email = None

    if payload.email:
        email = payload.email.strip().lower()
    if payload.phone_number:
        try:
            phone_number = validate_and_normalize_phone(payload.phone_number)
        except Exception:
            phone_number = payload.phone_number.strip()

    if not email and not phone_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide your email address or mobile number."
        )

    user = None
    if email:
        user = db.query(User).filter(User.email == email).first()
    if not user and phone_number:
        user = db.query(User).filter(User.phone_number == phone_number).first()

    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=INVALID_CREDENTIALS_DETAIL
        )

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=INVALID_CREDENTIALS_DETAIL
        )

    token_claims = {"sub": user.id}
    if user.email:
        token_claims["email"] = user.email
    if user.phone_number:
        token_claims["phone"] = user.phone_number

    access_token = create_access_token(data=token_claims)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=format_user_response(user)
    )

@router.post("/privacy-agreement", response_model=UserResponse)
def accept_privacy_agreement(
    payload: PrivacyAgreementRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Acknowledge and accept the Privacy and CIA Security Agreement.
    """
    if not payload.accepted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Agreement must be accepted to proceed."
        )

    current_user.privacy_agreement_accepted = True
    current_user.privacy_agreement_version = payload.version
    current_user.privacy_agreement_date = datetime.now(timezone.utc)
    db.commit()
    db.refresh(current_user)
    return format_user_response(current_user)

@router.post("/complete-onboarding", response_model=UserResponse)
def complete_onboarding(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark user onboarding wizard as completed.
    """
    current_user.onboarding_completed = True
    db.commit()
    db.refresh(current_user)
    return format_user_response(current_user)

@router.patch("/profile", response_model=UserResponse)
def update_profile(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update preferred user name or language in profile.
    """
    if payload.preferred_name is not None:
        current_user.preferred_name = payload.preferred_name.strip()
    if payload.preferred_language is not None:
        current_user.preferred_language = payload.preferred_language.strip().lower()
    db.commit()
    db.refresh(current_user)
    return format_user_response(current_user)

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    """
    Acknowledge user logout.
    Client clears stored JWT token from local/session storage.
    """
    ident = current_user.email or current_user.phone_number or current_user.id
    return {
        "status": "success",
        "message": f"User {ident} logged out successfully."
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user profile.
    Protected route requiring valid JWT.
    """
    return format_user_response(current_user)

