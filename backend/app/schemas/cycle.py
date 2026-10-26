from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict

class CycleCreateRequest(BaseModel):
    start_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", json_schema_extra={"example": "2026-10-01"})
    end_date: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$", json_schema_extra={"example": "2026-10-05"})
    cycle_length: Optional[int] = Field(default=28, ge=15, le=60)
    period_length: Optional[int] = Field(default=5, ge=1, le=14)
    symptoms: List[str] = Field(default=[], json_schema_extra={"example": ["cramps", "mild headache"]})
    mood: Optional[str] = Field(default=None, json_schema_extra={"example": "calm"})
    flow: Optional[str] = Field(default="medium", json_schema_extra={"example": "medium"})
    notes: Optional[str] = Field(default=None, max_length=1000, json_schema_extra={"example": "Drank chamomile tea, felt better"})

class CycleUpdateRequest(BaseModel):
    start_date: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    end_date: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    cycle_length: Optional[int] = Field(default=None, ge=15, le=60)
    period_length: Optional[int] = Field(default=None, ge=1, le=14)
    symptoms: Optional[List[str]] = None
    mood: Optional[str] = None
    flow: Optional[str] = None
    notes: Optional[str] = Field(default=None, max_length=1000)

class CycleResponse(BaseModel):
    id: str
    start_date: str
    end_date: Optional[str]
    cycle_length: Optional[int]
    period_length: Optional[int]
    symptoms: List[str]
    mood: Optional[str]
    flow: Optional[str]
    notes: Optional[str]
    record_hash: str
    integrity_verified: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
