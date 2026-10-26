from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class SendOtpRequest(BaseModel):
    phone_number: str = Field(..., json_schema_extra={"example": "+919876543210"}, description="E.164 or 10-digit mobile number")

class SendOtpResponse(BaseModel):
    message: str
    phone_number: str
    demo_otp: Optional[str] = None
    expires_in_seconds: int = 300

class VerifyOtpRequest(BaseModel):
    phone_number: str = Field(..., json_schema_extra={"example": "+919876543210"})
    otp_code: str = Field(..., min_length=6, max_length=6, json_schema_extra={"example": "123456"})

class RegisterPasswordRequest(BaseModel):
    email: Optional[str] = Field(None, json_schema_extra={"example": "user@hercare.app"})
    phone_number: Optional[str] = Field(None, json_schema_extra={"example": "+919876543210"})
    password: str = Field(..., min_length=6, max_length=128, json_schema_extra={"example": "SecretP@ss123"})
    preferred_name: Optional[str] = Field(None, json_schema_extra={"example": "Gargi"})

class LoginPasswordRequest(BaseModel):
    email: Optional[str] = Field(None, json_schema_extra={"example": "user@hercare.app"})
    phone_number: Optional[str] = Field(None, json_schema_extra={"example": "+919876543210"})
    password: str = Field(..., min_length=1, max_length=128)

class PrivacyAgreementRequest(BaseModel):
    accepted: bool = Field(True, description="Must be true to acknowledge CIA agreement")
    version: str = Field("1.0", description="Agreement version")

class UpdateProfileRequest(BaseModel):
    preferred_name: Optional[str] = None
    preferred_language: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    phone_number: Optional[str] = None
    email: Optional[str] = None
    preferred_name: Optional[str] = None
    is_demo_user: bool = False
    preferred_language: str = "en"
    cloud_sync_enabled: bool = False
    privacy_agreement_accepted: bool = False
    privacy_agreement_version: Optional[str] = None
    onboarding_completed: bool = False
    has_password: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
