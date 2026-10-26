import json
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    ENV: str = "development"
    DEBUG: bool = True
    PORT: int = 8000

    # PostgreSQL Database URL
    DATABASE_URL: str = "postgresql://hercare_user:hercare_password@localhost:5432/hercare_db"

    # Cryptography & CIA Triad
    # 32-byte master key for AES-256-GCM encryption
    AES_MASTER_KEY: str = "4a6f7966756c486572436172655365637572654b6579323032364861636b2121"
    JWT_SECRET_KEY: str = "hercare_jwt_super_secret_signing_key_hackathon_round2_2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Demo Mode Configuration
    DEMO_MODE: bool = True
    DEMO_OTP: str = "123456"

    # Optional AI Keys
    GROQ_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""

    # CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, str) and v.startswith("["):
            try:
                return json.loads(v)
            except Exception:
                return [v]
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def IS_PRODUCTION(self) -> bool:
        """True only when ENV is explicitly set to 'production'."""
        return self.ENV.strip().lower() == "production"

settings = Settings()
