from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class EmergencyHotline(BaseModel):
    name: str
    number: str
    description: str

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, json_schema_extra={"example": "I have mild cramps today"})
    language: Optional[str] = Field(default="en", pattern="^(en|ta)$", description="'en' for English or 'ta' for Tamil")
    session_id: Optional[str] = Field(default=None, description="Optional conversation session ID")
    context: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional health context (nickname, cycle_phase, day, food_dislikes, exercise_pref, energy_level)"
    )
    page_context: Optional[Dict[str, Any]] = Field(
        default=None,
        description=(
            "Optional UI page context from the client: route, page_name, purpose, "
            "sections (visible headings/labels), actions (id/label/description). "
            "Sanitized server-side; must never contain credentials or tokens."
        )
    )

class ChatResponse(BaseModel):
    message: str
    language: str
    is_emergency: bool = False
    emergency_category: Optional[str] = None
    emergency_hotlines: Optional[List[EmergencyHotline]] = None
    disclaimer: str
    session_id: str
    is_live_ai: bool = False
    provider: str = "demo_heuristic"
    suggested_action: Optional[Dict[str, Any]] = Field(
        default=None,
        description=(
            "Optional app action the assistant proposes for user confirmation, "
            "e.g. {id, label, needs_confirm}. The client must still ask the user "
            "and execute only its own registered handler."
        )
    )
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PageGreetingRequest(BaseModel):
    language: Optional[str] = Field(default="en", pattern="^(en|ta)$")
    page_context: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Same sanitized UI page context shape as /chat (route, page_name, purpose, sections, actions, optional greeting)."
    )

class PageGreetingResponse(BaseModel):
    message: str
    language: str
    route: Optional[str] = None
    created_at: datetime

class SafetyCheckRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)
    language: Optional[str] = Field(default="en", pattern="^(en|ta)$")

class SafetyCheckResponse(BaseModel):
    is_emergency: bool
    emergency_category: Optional[str] = None
    advisory_message: Optional[str] = None
    emergency_hotlines: Optional[List[EmergencyHotline]] = None
    disclaimer: str

