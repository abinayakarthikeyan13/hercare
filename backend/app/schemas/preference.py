from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict

class PreferenceCreateRequest(BaseModel):
    nickname: str = Field(..., min_length=1, max_length=50, json_schema_extra={"example": "Anu"})
    food_dislikes: List[str] = Field(default=[], json_schema_extra={"example": ["dairy", "spicy"]})
    exercise_pref: Optional[str] = Field(default=None, json_schema_extra={"example": "yoga"})
    energy_level: Optional[str] = Field(default=None, json_schema_extra={"example": "moderate"})

class PreferenceResponse(BaseModel):
    nickname: str
    food_dislikes: List[str]
    exercise_pref: Optional[str]
    energy_level: Optional[str]
    record_hash: str
    integrity_verified: bool
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
