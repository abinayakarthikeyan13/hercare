import re
import hmac
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import bcrypt
import jwt
from app.config import settings

# E.164 phone number regex pattern (allows optional +, 8-15 digits)
PHONE_REGEX = re.compile(r"^\+?[1-9]\d{7,14}$")

def validate_and_normalize_phone(phone: str) -> str:
    """
    Validates phone number format and normalizes it.
    Strips whitespace, hyphens, and parentheses.
    Ensures E.164 compliance.
    """
    if not phone:
        raise ValueError("Phone number is required.")
    
    clean_phone = re.sub(r"[\s\-\(\)]", "", phone.strip())
    
    # If 10 digits without country code, default to +91 (India) for common hackathon usage
    if len(clean_phone) == 10 and clean_phone.isdigit():
        clean_phone = f"+91{clean_phone}"
    elif not clean_phone.startswith("+") and clean_phone.isdigit():
        clean_phone = f"+{clean_phone}"

    if not PHONE_REGEX.match(clean_phone):
        raise ValueError(
            "Invalid phone number format. Please provide a valid number with country code (e.g., +919876543210)."
        )
    return clean_phone

def hash_otp(phone_number: str, otp_code: str) -> str:
    """
    Creates a secure salted SHA-256 hash of the OTP.
    Salts with the server's JWT_SECRET_KEY and user's phone number.
    Never stores plaintext OTP in the database.
    """
    salt = settings.JWT_SECRET_KEY
    payload = f"{phone_number}:{otp_code}:{salt}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()

def verify_otp_hash(phone_number: str, otp_code: str, stored_hash: str) -> bool:
    """
    Constant-time comparison to verify OTP against stored hash.
    Protects against timing attacks.
    """
    expected_hash = hash_otp(phone_number, otp_code)
    return hmac.compare_digest(expected_hash, stored_hash)

def hash_password(password: str) -> str:
    """Hash password securely using native bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against bcrypt hashed password."""
    if not hashed_password:
        return False
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create signed JWT access token using HS256.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc)
    })
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate signed JWT token.
    Raises jwt.PyJWTError on invalid/expired token.
    """
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
