from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict

class SymptomCreateRequest(BaseModel):
    date: str = Field(..., description="Date of symptoms in YYYY-MM-DD format", json_schema_extra={"example": "2026-10-19"})
    symptoms: List[str] = Field(default=[], description="List of logged symptoms", json_schema_extra={"example": ["cramps", "headache"]})
    mood: Optional[str] = Field(default="calm", description="Mood rating or label", json_schema_extra={"example": "happy"})
    energy_level: Optional[str] = Field(default="moderate", description="Energy level: low, moderate, high")
    pain_level: Optional[int] = Field(default=0, ge=0, le=5, description="Pain rating 0-5")
    flow: Optional[str] = Field(default=None, description="Optional period flow intensity: spotting, light, medium, heavy")
    supplements_taken: Optional[bool] = Field(default=False, description="Whether supplements or medications were taken")
    notes: Optional[str] = Field(default="", max_length=1000, description="Personal notes")

class SymptomUpdateRequest(BaseModel):
    symptoms: Optional[List[str]] = None
    mood: Optional[str] = None
    energy_level: Optional[str] = None
    pain_level: Optional[int] = Field(default=None, ge=0, le=5)
    flow: Optional[str] = None
    supplements_taken: Optional[bool] = None
    notes: Optional[str] = Field(default=None, max_length=1000)

class SymptomResponse(BaseModel):
    id: str
    date: str
    symptoms: List[str]
    mood: Optional[str] = None
    energy_level: Optional[str] = None
    pain_level: Optional[int] = 0
    flow: Optional[str] = None
    supplements_taken: Optional[bool] = False
    notes: Optional[str] = ""
    record_hash: str
    integrity_verified: bool = True
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
