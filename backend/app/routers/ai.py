import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.models.chat import ChatHistory
from app.schemas.ai import (
    ChatRequest, ChatResponse, EmergencyHotline,
    PageGreetingRequest, PageGreetingResponse,
    SafetyCheckRequest, SafetyCheckResponse,
)
from app.services.ai_agent import process_chat_message, generate_page_greeting, sanitize_page_context
from app.services.safety_guardrails import (
    EMERGENCY_HOTLINES,
    detect_emergency_symptoms,
    MANDATORY_DISCLAIMER_EN,
    MANDATORY_DISCLAIMER_TA
)
from app.core.crypto import encrypt_data, compute_record_hash
from app.core.ratelimit import enforce_rate_limit

router = APIRouter(prefix="", tags=["AI Companion & Emergency"])

def get_optional_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Helper to extract user if valid Bearer token is provided."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        return db.query(User).filter(User.id == user_id).first()
    except Exception:
        return None

@router.post("/chat", response_model=ChatResponse)
async def chat_with_hercare(
    payload: ChatRequest,
    request: Request,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    HerCare AI Health Companion Endpoint.
    1. Enforces rule-based input safety screening.
    2. Generates personalized, empathetic guidance in the selected language (English or Tamil).
    3. Enforces rule-based output safety layer (no diagnosis, no prescriptions, mandatory disclaimer).
    4. If authenticated, encrypts and stores conversation logs in PostgreSQL as AES-256-GCM BYTEA.
    """
    # Cap chat throughput per client (a session generates several messages per minute)
    enforce_rate_limit(request, bucket="chat", max_hits=60, window_seconds=300)
    session_id = payload.session_id or str(uuid.uuid4())
    context = payload.context or {}

    # If authenticated and user has saved preferences, augment context if not already provided
    if current_user and current_user.preference:
        try:
            from app.core.crypto import decrypt_data, decrypt_json
            if "nickname" not in context:
                context["nickname"] = decrypt_data(current_user.preference.nickname_encrypted)
            if "food_dislikes" not in context:
                context["food_dislikes"] = decrypt_json(current_user.preference.food_dislikes_encrypted) or []
            if "exercise_pref" not in context:
                context["exercise_pref"] = decrypt_data(current_user.preference.exercise_pref_encrypted)
            if "energy_level" not in context:
                context["energy_level"] = decrypt_data(current_user.preference.energy_level_encrypted)
        except Exception:
            pass

    # Process AI interaction (page_context is whitelist-sanitized inside the agent)
    ai_result = await process_chat_message(
        user_message=payload.message,
        language=payload.language or "en",
        context=context,
        page_context=payload.page_context
    )

    now = datetime.now(timezone.utc)

    # If user is authenticated, store conversation encrypted with AES-256-GCM
    if current_user:
        try:
            # 1. Encrypt and log user message
            user_msg_enc = encrypt_data(payload.message)
            user_hash = compute_record_hash(current_user.id, payload.message)
            user_entry = ChatHistory(
                user_id=current_user.id,
                session_id=session_id,
                role="user",
                language=payload.language or "en",
                content_encrypted=user_msg_enc,
                record_hash=user_hash,
                red_flag_detected=ai_result["is_emergency"],
                red_flag_category=ai_result.get("emergency_category"),
                created_at=now
            )
            db.add(user_entry)

            # 2. Encrypt and log assistant message
            assistant_msg_enc = encrypt_data(ai_result["message"])
            assistant_hash = compute_record_hash(current_user.id, ai_result["message"])
            assistant_entry = ChatHistory(
                user_id=current_user.id,
                session_id=session_id,
                role="assistant",
                language=payload.language or "en",
                content_encrypted=assistant_msg_enc,
                record_hash=assistant_hash,
                red_flag_detected=ai_result["is_emergency"],
                red_flag_category=ai_result.get("emergency_category"),
                created_at=now
            )
            db.add(assistant_entry)
            db.commit()
        except Exception:
            db.rollback()

    hotlines_list = None
    if ai_result["is_emergency"]:
        hotlines_list = [EmergencyHotline(**h) for h in ai_result["emergency_hotlines"]]

    return ChatResponse(
        message=ai_result["message"],
        language=ai_result["language"],
        is_emergency=ai_result["is_emergency"],
        emergency_category=ai_result["emergency_category"],
        emergency_hotlines=hotlines_list,
        disclaimer=ai_result["disclaimer"],
        session_id=session_id,
        is_live_ai=ai_result.get("is_live_ai", False),
        provider=ai_result.get("provider", "demo_heuristic"),
        suggested_action=ai_result.get("suggested_action"),
        created_at=now
    )

@router.post("/page-greeting", response_model=PageGreetingResponse)
async def page_greeting(payload: PageGreetingRequest, request: Request):
    """
    Short page-aware opening question for the app-wide avatar.
    The frontend requests this when the user enters a screen so the assistant
    can greet them with a question about the REAL content of that page.
    Greetings are never stored in chat history (privacy), and page_context is
    whitelist-sanitized exactly like /chat.
    """
    enforce_rate_limit(request, bucket="greeting", max_hits=40, window_seconds=300)
    page = sanitize_page_context(payload.page_context)
    language = payload.language or "en"
    message = generate_page_greeting(page, language=language)
    return PageGreetingResponse(
        message=message,
        language=language,
        route=(page or {}).get("route"),
        created_at=datetime.now(timezone.utc)
    )

@router.get("/emergency/hotlines", response_model=list[EmergencyHotline])
def get_emergency_hotlines():
    """Returns official 24/7 medical and emergency hotline numbers."""
    return [EmergencyHotline(**h) for h in EMERGENCY_HOTLINES]

@router.post("/safety/check", response_model=SafetyCheckResponse)
def check_safety_rules(payload: SafetyCheckRequest):
    """
    Deterministic safety check for urgent symptoms.
    Runs rule-based pattern matching independently of the LLM.
    Returns immediate urgent advisory and emergency hotlines if red flag detected.
    """
    is_emergency, category, message, hotlines = detect_emergency_symptoms(
        text=payload.text,
        language=payload.language or "en"
    )
    disclaimer = MANDATORY_DISCLAIMER_TA if payload.language == "ta" else MANDATORY_DISCLAIMER_EN

    hotlines_list = [EmergencyHotline(**h) for h in hotlines] if is_emergency and hotlines else None

    return SafetyCheckResponse(
        is_emergency=is_emergency,
        emergency_category=category,
        advisory_message=message if is_emergency else None,
        emergency_hotlines=hotlines_list,
        disclaimer=disclaimer
    )
