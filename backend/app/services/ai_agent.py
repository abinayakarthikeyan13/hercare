import json
import logging
import re
import httpx
from typing import Dict, Any, Optional
from app.config import settings
from app.services.safety_guardrails import (
    screen_input_for_emergencies,
    screen_and_sanitize_output,
    MANDATORY_DISCLAIMER_EN,
    MANDATORY_DISCLAIMER_TA,
    EMERGENCY_HOTLINES
)

logger = logging.getLogger("hercare.ai")

from app.ai.prompts import (
    HERCARE_SYSTEM_PROMPT_EN as SYSTEM_PROMPT_EN,
    HERCARE_SYSTEM_PROMPT_TA as SYSTEM_PROMPT_TA
)

# ---------------------------------------------------------------------------
# Page-context handling for the app-wide context-aware assistant
# ---------------------------------------------------------------------------

SENSITIVE_KEY_MARKERS = (
    "password", "passwd", "token", "otp", "secret", "credential",
    "api_key", "apikey", "authorization", "bearer", "session", "cookie",
    "private", "ssn", "card"
)

# Only KEYS are matched against SENSITIVE_KEY_MARKERS. For TEXT values
# (page names, section labels like "Password field" or "Cycle Overview card")
# we redact things that actually look like credential VALUES instead:
# long opaque blobs, JWTs, and provider API keys.
_SECRET_VALUE_PATTERN = re.compile(
    r"\b(?:[A-Za-z0-9_\-]{36,}|eyJ[A-Za-z0-9_\-]{10,}|sk-[A-Za-z0-9]{8,})\b"
)


def _redact_values(text):
    return _SECRET_VALUE_PATTERN.sub("[redacted]", str(text or ""))

# Page-help intent detection: a page question must BOTH mention the current
# screen (page/here tokens) AND ask about help/options — so health questions
# like "I have cramps, what should I do?" never get hijacked.
_PAGE_TOKENS_EN = ("here", "this page", "this screen", "current page", "current screen", "on this page", "on this screen")
_PAGE_INTENT_WORDS_EN = (
    "what can i do", "help", "explain", "what is", "what are", "options",
    "actions", "guide", "how do i", "how does", "what should i do", "what do i do",
    "available"
)
_PAGE_TOKENS_TA = ("இங்கே", "இந்த பக்க", "இந்தத் பக்க", "திரை", "தற்போதைய")
_PAGE_INTENT_WORDS_TA = (
    "என்ன செய்யலாம்", "என்ன செய்வது", "வழிகாட்ட", "விளக்க", "உதவ",
    "விருப்ப", "என்ன செயல்"
)


def is_page_help_request(message: str, language: str = "en") -> bool:
    low = (message or "").lower()
    if language == "ta":
        return any(t in low for t in _PAGE_TOKENS_TA) and any(w in low for w in _PAGE_INTENT_WORDS_TA)
    return any(t in low for t in _PAGE_TOKENS_EN) and any(w in low for w in _PAGE_INTENT_WORDS_EN)

# Intent keywords mapped to the client-advertised action ids they may trigger.
_ACTION_INTENTS = {
    "export_data": (
        "export", "download my data", "download my records", "backup my data",
        "எடுத்துச் செல்", "பதிவிறக்க", "எக்ஸ்போர்ட்"
    ),
    "delete_data": (
        "delete my data", "erase my data", "wipe my data", "remove my data",
        "delete everything", "clear all my records",
        "தரவை நீக்கு", "அழி", "துடை"
    ),
    "sign_out": (
        "sign me out", "log me out", "sign out", "logout", "லாக் அவுட்", "வெளியேறு"
    ),
    "change_language": (
        "switch to tamil", "switch to english", "change language", "change to tamil",
        "change to english", "மொழியை மாற்று", "தமிழுக்கு மாறு", "ஆங்கிலத்திற்கு மாறு"
    ),
    "toggle_theme": (
        "dark mode", "light mode", "toggle theme", "change theme", "dark theme", "light theme",
        "டார்க் மோடு", "லைட் மோடு", "தீம் மாற்று"
    ),
    "save_check_in": (
        "log my mood", "record my mood", "save my check-in", "save check-in",
        "track my symptoms", "record symptoms", "open the check-in",
        "மனநிலையைப் பதிவு", "அறிகுறிகளைப் பதிவு", "சேமி"
    ),
    "open_dial": (
        "open the dial", "open the tracker", "track my period", "select period dates",
        "log my period", "record period dates", "சுழற்சியைத் திற", "மாதவிடாயைப் பதிவு"
    ),
    "open_check_in": (
        "log my mood", "record my mood", "save my check-in", "open the check-in",
        "track my symptoms", "record symptoms", "check in", "daily check-in",
        "மனநிலையைப் பதிவு", "அறிகுறிகளைப் பதிவு", "செக்-இன்"
    ),
}


def _clip(value, limit):
    text = str(value or "").strip()
    return text[:limit]


def sanitize_page_context(page_context):
    """
    Whitelist-sanitize the client-sent UI page context.
    Keeps only route/page_name/purpose/sections/actions (+language), drops any
    key that looks credential-related, and caps string sizes so a client cannot
    flood the LLM prompt. Returns None when nothing usable remains.
    """
    if not isinstance(page_context, dict):
        return None

    def key_is_safe(key):
        low = str(key).lower()
        return not any(marker in low for marker in SENSITIVE_KEY_MARKERS)

    clean = {}

    for field, limit in (("route", 120), ("page_name", 80), ("purpose", 400), ("greeting", 300), ("language", 8)):
        if field in page_context and key_is_safe(field):
            value = _clip(_redact_values(page_context.get(field)), limit)
            if value:
                clean[field] = value

    sections = page_context.get("sections")
    if isinstance(sections, list):
        clean_sections = []
        for item in sections[:20]:
            # Section labels are UI words, not secrets — keep them, but redact
            # any credential-looking value that slipped into the string.
            text = _clip(_redact_values(item), 160)
            if text:
                clean_sections.append(text)
        if clean_sections:
            clean["sections"] = clean_sections

    actions = page_context.get("actions")
    if isinstance(actions, list):
        clean_actions = []
        for item in actions[:20]:
            if not isinstance(item, dict) or not key_is_safe(item.get("id", "")):
                continue
            action_id = _clip(item.get("id"), 64).replace(" ", "_")
            if not action_id:
                continue
            clean_actions.append({
                "id": action_id,
                "label": _clip(_redact_values(item.get("label")), 100),
                "description": _clip(_redact_values(item.get("description")), 220),
                "needs_confirm": bool(item.get("needs_confirm")),
            })
        if clean_actions:
            clean["actions"] = clean_actions

    return clean or None


def format_page_context_block(page_context):
    """Renders sanitized page context as a text block for the LLM system prompt."""
    if not page_context:
        return ""
    lines = ["CURRENT UI PAGE CONTEXT (client-provided; describe and guide within this reality):"]
    if page_context.get("page_name"):
        lines.append(f"- Page name: {page_context['page_name']}")
    if page_context.get("route"):
        lines.append(f"- Route: {page_context['route']}")
    if page_context.get("purpose"):
        lines.append(f"- Purpose: {page_context['purpose']}")
    sections = page_context.get("sections") or []
    if sections:
        lines.append("- Visible sections / labels: " + "; ".join(sections))
    actions = page_context.get("actions") or []
    if actions:
        rendered = []
        for action in actions:
            confirm_note = " (requires explicit user confirmation)" if action.get("needs_confirm") else ""
            rendered.append(f"{action.get('id')} [{action.get('label')}{confirm_note}]")
        lines.append("- Actions the user can perform here: " + "; ".join(rendered))
    lines.append(
        "Rules: Only describe actions and sections that are listed above. "
        "If the user asks to perform one of these actions, append a final line exactly "
        "'ACTION: <action_id>' so the app can ask for confirmation; never claim an "
        "action already happened. If you cannot determine something about this page, "
        "ask a clarification question instead of inventing functionality."
    )
    return "\n".join(lines)


def detect_suggested_action(message, page_context):
    """Maps a user request to a client-advertised action, when intent is clear."""
    if not page_context or not page_context.get("actions"):
        return None
    low = (message or "").lower()
    available = {action["id"]: action for action in page_context["actions"]}

    # "delete my data" must not match the milder "delete" of chat history etc.
    if "delete_data" not in available and any(k in low for k in ("delete", "அழி", "நீக்க")):
        skip_data_keys = tuple(
            k for k in ("my data", "everything", "all my", "records", "தரவை", "முழுவதும்") if k in low
        )
        if not skip_data_keys:
            return None

    for action_id, keywords in _ACTION_INTENTS.items():
        if action_id not in available:
            continue
        if any(k in low for k in keywords):
            action = available[action_id]
            return {
                "id": action_id,
                "label": action.get("label") or action_id,
                "needs_confirm": True if action.get("needs_confirm") else action_id in ("delete_data", "sign_out", "export_data"),
            }
    return None


def describe_action_response(suggested_action, language="en"):
    """
    Explains a proposed app action: what it really does, its consequences, and
    that nothing happens until the user confirms. Used instead of the generic
    wellness filler when a clear action intent is detected in demo mode.
    """
    action_id = (suggested_action or {}).get("id") or ""
    label = (suggested_action or {}).get("label") or action_id

    if language == "ta":
        texts = {
            "export_data": (
                "ஏற்றுமதி இங்கேயே தொடங்கும். உங்க பதிவுகள் JSON கோப்பா "
                "(hercare_health_export_<date>.json) டவுன்லோட் ஆகும் — இந்த சாதனத்துல உங்க "
                "பதிவுகள் (சுழற்சி, அறிகுறி, அரட்டை, விருப்பங்கள்) சேரும் — லாகின் இருந்தா "
                "மேக நகலும் சேரும். தொடங்க கீழே கன்பர்ம் அழுத்துங்க."
            ),
            "delete_data": (
                "தரவு நீக்கம் முதல்ல மேகத்துல இருக்கறதை, பின்னாடி இந்த சாதனத்துல இருக்கற "
                "அனைத்தையும் (சுழற்சி, அறிகுறி, அரட்டை, விருப்பங்கள்) அழிச்சிடும், உங்களை "
                "வெளியேற்றிடும். இது வாபஸ் பண்ண முடியாது. திறக்க கீழே கன்பர்ம் அழுத்துங்க."
            ),
            "sign_out": (
                "இந்த சாதனத்துல உங்க அமர்வு முடியும்; பதிவுகள் அப்படியே "
                "இருக்கும். வெளியேற கீழே கன்பர்ம் அழுத்துங்க."
            ),
            "change_language": (
                "மொழியை இங்கேயே மாற்றலாம் — கன்பர்ம் பண்ணதும் உடனே மாறிடும்."
            ),
            "toggle_theme": (
                "தோற்றத்தை (வெளிச்சம்/இருண்டது) இங்கேயே மாற்றலாம் — கன்பர்ம் பண்ணதும் உடனே மாறிடும்."
            ),
            "open_check_in": (
                "செக்-இன் படிவம் இங்கேயே திறக்கும்: மனநிலை, வலி, அறிகுறி, ரத்தப்போக்கு "
                "தேர்ந்தெடுத்து, இந்த சாதனத்துல பதிவு பண்ண "
                "'சேமி' அழுத்துங்க."
            ),
            "open_dial": (
                "சுழற்சி திரை திறக்கும் — டயல்ல இழுத்தோ தட்டியோ உங்க "
                "மாதவிடாய் தேதி தேர்ந்தெடுத்து, 'உறுதிசெய்து சேமி' அழுத்துங்க."
            ),
        }
        generic = (
            f"இந்த திரையில் நான் இது பண்ண முடியும்: {label}. "
            "கீழே கன்பர்ம் அழுத்துனா தான் நடக்கும்."
        )
        return texts.get(action_id, generic)

    texts = {
        "export_data": (
            "I can start the export right from this screen. It downloads a JSON file "
            "(hercare_health_export_<date>.json) containing this device's IndexedDB records — "
            "cycles, symptom logs, chat history and preferences — plus your decrypted cloud copy "
            "from PostgreSQL when you are signed in. Press Confirm below to start it."
        ),
        "delete_data": (
            "Deleting your data first removes your encrypted cloud records, then wipes everything "
            "stored on this device (cycles, symptoms, chat history, preferences) and signs you out. "
            "This cannot be undone. Press Confirm below to open the app's deletion confirmation screen."
        ),
        "sign_out": (
            "Signing out ends your session on this device; your records remain stored where they are. "
            "Press Confirm below to sign out."
        ),
        "change_language": (
            "I can switch the app language right here — once you confirm, the change applies immediately."
        ),
        "toggle_theme": (
            "I can switch the appearance theme (light/dark) right here — once you confirm, it applies immediately."
        ),
        "open_check_in": (
            "The daily check-in form opens right here: choose your mood, pain level, symptoms and flow, "
            "review your answers, then tap Save to record them on this device."
        ),
        "open_dial": (
            "That opens the Cycle Tracking screen, where you drag or tap the rotary dial to select your "
            "period dates and then press Confirm & Save Cycle."
        ),
    }
    generic = (
        f"I can do this on the current screen for you: {label}. "
        "Nothing happens until you press Confirm below."
    )
    return texts.get(action_id, generic)


def generate_page_greeting(page_context, language="en"):
    """
    Short, spoken, page-aware opening question built from the REAL page context.
    Prefers the client's curated per-page greeting question; otherwise builds a
    template from the actual page name and first advertised action. Never
    invents content beyond what the page context contains.
    """
    if not page_context:
        if language == "ta":
            return (
                "வணக்கம்! 🌸 எந்த பக்கத்துல இருக்கீங்கன்னு எனக்குத் தெரியலை. "
                "சொல்லுங்க — நான் உதவறேன்."
            )
        return (
            "Hello! 🌸 I cannot see which screen you are on right now — "
            "could you tell me where you are, and I will help."
        )

    curated = page_context.get("greeting")
    if curated:
        return curated

    page_name = page_context.get("page_name") or page_context.get("route") or "HerCare"
    actions = page_context.get("actions") or []
    first_action = actions[0].get("label") if actions and actions[0].get("label") else None

    if language == "ta":
        base = (
            f"வணக்கம்! 🌸 நீங்க இப்போது '{page_name}' பக்கத்துல இருக்கீங்க. "
            "இதை நான் விளக்கட்டுமா?"
        )
        if first_action:
            base += f" இல்ல '{first_action}' இதுல இருந்து ஆரம்பிக்கலாமா?"
        return base

    base = (
        f"Hello! 🌸 You are on the {page_name} page. "
        "Would you like me to walk you through it?"
    )
    if first_action:
        base += f" Or shall we start with '{first_action}'?"
    return base


def generate_page_help_response(page_context, language="en", nickname=None):
    """
    Builds a page-aware answer from the REAL client-provided page context.
    Falls back to an honest clarification question when no context is available.
    """
    name = f"{nickname}, " if nickname else ""
    if not page_context:
        if language == "ta":
            return (
                f"{name}உங்க திரை பத்தி இப்போது எனக்குத் தெரியலை. "
                "எந்த பக்கத்துல இருக்கீங்கன்னு சொல்ல முடியுமா? இல்ல சுழற்சி, "
                "அறிகுறி, சாப்பாடு பத்தி கேளுங்க — நான் உதவறேன்."
            )
        return (
            f"{name}I cannot see which screen you are on right now. "
            "Could you tell me what page you are viewing? You can also ask me anything "
            "about your cycle, symptoms, or nutrition and I will help."
        )

    page_name = page_context.get("page_name") or page_context.get("route") or ""
    purpose = page_context.get("purpose") or ""
    sections = page_context.get("sections") or []
    actions = page_context.get("actions") or []

    if language == "ta":
        parts = []
        if page_name:
        
            parts.append(f"{name}நீங்க இப்போது '{page_name}' பக்கத்துல இருக்கீங்க. 🌸")
        if purpose:
            parts.append(f"இந்த பக்கம் எதுக்குன்னா: {purpose}")
        if sections:
            listed = "\n".join(f"• {s}" for s in sections[:8])
            parts.append(f"இங்க என்னென்ன இருக்கு:\n{listed}")
        if actions:
            listed = "\n".join(
                f"{i + 1}. {a.get('label') or a.get('id')}"
                + (" (கன்பர்ம் பண்ணணும்)" if a.get("needs_confirm") else "")
                for i, a in enumerate(actions[:8])
            )
            parts.append(f"இங்க நீங்க என்ன பண்ணலாம்:\n{listed}")
        parts.append("எதை விளக்கணும், அல்லது என்ன பண்ண ஆரம்பிக்கணும்னு சொல்லுங்க.")
        return "\n\n".join(parts)

    parts = []
    if page_name:
        parts.append(f"{name}you are on the {page_name} page. 🌸")
    if purpose:
        parts.append(f"What this page is for: {purpose}")
    if sections:
        listed = "\n".join(f"• {s}" for s in sections[:8])
        parts.append(f"What you can see here:\n{listed}")
    if actions:
        listed = "\n".join(
            f"{i + 1}. {a.get('label') or a.get('id')}"
            + (" (asks for your confirmation first)" if a.get("needs_confirm") else "")
            for i, a in enumerate(actions[:8])
        )
        parts.append(f"What you can do here:\n{listed}")
    parts.append("Tell me which part you would like explained or which action you want to start.")
    return "\n\n".join(parts)

def generate_heuristic_response(message: str, language: str = "en", context: Optional[Dict[str, Any]] = None) -> str:
    """
    High-fidelity clinical wellness reasoning engine.
    Ensures 100% reliable, empathetic, culturally sensitive responses in English & Tamil
    even when offline or when external LLM API keys are not provided.
    """
    ctx = context or {}
    nickname = ctx.get("nickname")
    cycle_phase = ctx.get("cycle_phase", "menstrual")
    food_dislikes = ctx.get("food_dislikes", [])
    exercise_pref = ctx.get("exercise_pref", "yoga")
    energy_level = ctx.get("energy_level", "medium")

    lower_msg = message.lower()

    # 0. Page-aware help: answer about the CURRENT screen when the user asks
    # (falls back to an honest clarification question when no context exists)
    if is_page_help_request(message, language=language):
        page = ctx.get("page") or None
        return generate_page_help_response(page, language=language, nickname=nickname)

    # 1. Onboarding: Nickname inquiry if missing
    if not nickname and any(k in lower_msg for k in ["hi", "hello", "hey", "start", "வணக்கம்", "ஹலோ"]):
        if language == "ta":
            return (
                "வணக்கம்! நான் உங்கள் ஹெர்கேர் தோழி. 🌸\n\n"
                "என்னை என்ன பேரால கூப்பிடட்டும்? ஒரு செல்லப்பெயர் சொல்லுங்க."
            )
        else:
            return (
                "Hello and welcome! I am HerCare, your personal menstrual health companion. 🌸\n\n"
                "Before we begin, could you share a nickname you would like me to call you so I can personalize your guidance?"
            )

    name_salutation = f"{nickname}, " if nickname else ""
    name_salutation_ta = f"{nickname}, " if nickname else ""

    # 2. Diagnosis Requests (e.g., "Do I have PCOS?", "Could this be endometriosis?")
    if any(k in lower_msg for k in ["pcos", "pcod", "endometriosis", "do i have", "diagnose", "நோய் உள்ளதா", "பிசிஓஎஸ்"]):
        if language == "ta":
            return (
                f"{name_salutation_ta}ஒரு ஏஐ துணையாக நான் நோயறிதல் சொல்ல முடியாது.\n\n"
                "சுழற்சி ஒழுங்கில்லாம இருக்கறது, முகப்பரு, முடி அதிகமா உதிரறது — இது பிசிஓஎஸ் (PCOS) அறிகுறியா இருக்கலாம். "
                "ஆனால் உறுதியா தெரிய ஸ்கேன், ரத்தப் பரிசோதனை வேணும்.\n\n"
                "💡 **அடுத்த கட்டம்**: \n"
                "• உங்க சுழற்சி தேதி, அறிகுறிகளை ஹெர்கேரில் தொடர்ந்து போடுங்க.\n"
                "• ஒரு மகளிர் மருத்துவரைப் பாருங்க.\n\n"
                "சாப்பாடு, வாழ்க்கைமுறை பத்தி சொல்லட்டுமா?"
            )
        else:
            return (
                f"{name_salutation}as an AI companion, I cannot provide a medical diagnosis for PCOS, endometriosis, or any clinical condition.\n\n"
                "Symptoms such as irregular cycle lengths, acne, or changes in hair growth can sometimes be associated with PCOS or hormone fluctuations. "
                "However, a definitive diagnosis requires clinical evaluation by a gynecologist using pelvic ultrasound imaging and specific blood hormone panels (such as Rotterdam criteria).\n\n"
                "💡 **Recommended Next Steps**:\n"
                "• Continue logging your cycle dates, symptoms, and flow patterns here in HerCare.\n"
                "• Bring this symptom summary to a certified gynecologist for a comprehensive evaluation.\n\n"
                "Would you like recommendations on cycle-supportive nutrition or gentle lifestyle habits while you plan your doctor visit?"
            )

    # 3. Cramps / Menstrual Pain (Mild to Moderate)
    if any(k in lower_msg for k in ["cramp", "cramps", "period pain", "stomach pain", "வயிறு வலி", "வயிற்று வலி", "வலி"]):
        if language == "ta":
            food_note = " மற்றும் காரமான உணவுகளை தவிர்ப்பது நல்லது" if "spicy" in [f.lower() for f in food_dislikes] else ""
            return (
                f"{name_salutation_ta}மாதவிடாய்ல அடிவயிற்று வலி வர்றது சாதாரணம். "
                "இதோ எளிய வழிகள்:\n\n"
                "1. **சூடான ஒத்தடம்**: அடிவயிற்ல ஹீட்டிங் பேட் வைங்க — தசை தளர்ந்து வலி குறையும்.\n"
                f"2. **சூடான டீ**: இஞ்சி டீ அல்லது சீரகத் தண்ணீர் குடிங்க{food_note}.\n"
                "3. **மெதுவான உடற்பயிற்சி**: குழந்தை ஆசனம் போன்ற எளிய யோகா பண்ணுங்க.\n"
                "4. **ஓய்வு**: சூடான தண்ணீர் குடிச்சிட்டு ஆழமா மூச்சுவிட்டு ரெஸ்ட் எடுங்க."
            )
        else:
            food_dislike_msg = ""
            if food_dislikes:
                food_dislike_msg = f" (keeping in mind to avoid {', '.join(food_dislikes)})"
            return (
                f"{name_salutation}mild menstrual cramping is very common as the uterine muscles contract to shed the uterine lining. "
                "Here are gentle, non-pharmaceutical comfort measures to help ease your discomfort:\n\n"
                "1. **Targeted Heat Therapy**: Applying a warm heating pad or hot water bottle to your lower abdomen helps relax the uterine muscles and improves pelvic blood flow.\n"
                f"2. **Soothing Warm Fluids**: Sip warm chamomile, peppermint, or ginger tea{food_dislike_msg} to help reduce systemic inflammation and smooth muscle spasms.\n"
                f"3. **Gentle Movement**: Engaging in restorative {exercise_pref} (like Child's Pose or gentle pelvic tilts) helps release tension in your lower back and pelvis.\n"
                "4. **Magnesium & Hydration**: Drink plenty of room-temperature water and snack on magnesium-rich pumpkin seeds or dark leafy greens to support muscle relaxation."
            )

    # 4. Nutrition / Food Preference Questions
    if any(k in lower_msg for k in ["food", "diet", "eat", "nutrition", "உணவு", "சாப்பிட", "சாப்பாடு", "சத்து"]):
        if language == "ta":
            avoid_text = ""
            if food_dislikes:
                avoid_text = f" (நீங்கள் விரும்பாத {', '.join(food_dislikes)} உணவுகளை தவிர்த்து) "
            return (
                f"{name_salutation_ta}மாதவிடாய்க்கு ஏத்த சாப்பாடு{avoid_text}:\n\n"
                "• **இரும்புச்சத்து**: முருங்கைக்கீரை, பேரீச்சம் பழம், அத்திப்பழம், பாசிப்பயறு.\n"
                "• **மெக்னீசியம்**: ஆளிவிதை, பூசணி விதை, பாதாம் — தசைப்பிடிப்பு குறையும்.\n"
                "• **நீர்ச்சத்து**: மோர், இளநீர், தர்பூசணி.\n\n"
                "சர்க்கரை, காபி குறைக்கறது மூட் மாற்றத்தையும் சோர்வையும் தடுக்கும்."
            )
        else:
            avoid_list = f" (while respecting your preference to avoid {', '.join(food_dislikes)})" if food_dislikes else ""
            return (
                f"{name_salutation}nourishing your body according to your cycle phase{avoid_list} can dramatically improve energy and ease symptoms:\n\n"
                "• **Iron & Protein Restoration**: During menstruation, prioritize lentils, chickpeas, pumpkin seeds, and dark leafy greens to replenish iron and support red blood cell renewal.\n"
                "• **Anti-Inflammatory Healthy Fats**: Incorporate flaxseeds, chia seeds, and walnuts rich in Omega-3 fatty acids to help naturally balance prostaglandins.\n"
                f"• **Steady Energy**: Given your {energy_level} energy level, focus on complex carbohydrates (oats, brown rice, sweet potatoes) to maintain stable blood sugar levels without spikes."
            )

    # 5. General / Default Empathetic Guidance
    if language == "ta":
        return (
            f"{name_salutation_ta}சுழற்சி, அறிகுறி, சாப்பாடு — எது பத்தியும் என்னிடம் கேளுங்க. 🌸\n\n"
            "தயக்கம் வேணாம், கேளுங்க — நான் இருக்கேன்."
        )
    else:
        return (
            f"{name_salutation}I am here to support your holistic menstrual journey. 🌸\n\n"
            "Feel free to ask me about cycle phases, natural comfort for symptoms, nutritional tips, or how to tune your daily habits to your body's rhythm."
        )

async def call_external_llm(user_message: str, language: str = "en", context: Optional[Dict[str, Any]] = None, page_context: Optional[Dict[str, Any]] = None):
    """
    Calls configured external LLM (Groq / OpenAI) if API keys are available in settings.
    Returns (text, provider_name); text is None when no key is configured or every
    request fails, allowing smooth fallback to the heuristic engine.
    """
    sys_prompt = SYSTEM_PROMPT_TA if language == "ta" else SYSTEM_PROMPT_EN
    page_block = format_page_context_block(page_context)
    if page_block:
        sys_prompt = f"{sys_prompt}\n\n{page_block}"

    # Groq API Integration
    if settings.GROQ_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "llama-3.1-8b-instant",
                        "messages": [
                            {"role": "system", "content": sys_prompt},
                            {"role": "user", "content": f"Context: {json.dumps(context or {})}\n\nUser: {user_message}"}
                        ],
                        "temperature": 0.6,
                        "max_tokens": 600
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    return data["choices"][0]["message"]["content"], "groq_llama3"
        except Exception as e:
            logger.warning(f"Groq API call failed, falling back to clinical engine: {e}")

    # OpenAI API Integration
    if settings.OPENAI_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gpt-4o-mini",
                        "messages": [
                            {"role": "system", "content": sys_prompt},
                            {"role": "user", "content": f"Context: {json.dumps(context or {})}\n\nUser: {user_message}"}
                        ],
                        "temperature": 0.6,
                        "max_tokens": 600
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    return data["choices"][0]["message"]["content"], "openai_gpt4o_mini"
        except Exception as e:
            logger.warning(f"OpenAI API call failed, falling back to clinical engine: {e}")

    # Google Gemini API Integration
    if settings.GEMINI_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
                payload = {
                    "contents": [{
                        "parts": [
                            {"text": f"{sys_prompt}\nContext: {json.dumps(context or {})}\nUser: {user_message}"}
                        ]
                    }],
                    "generationConfig": {"temperature": 0.6, "maxOutputTokens": 600}
                }
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                    return text, "gemini_1.5_flash"
        except Exception as e:
            logger.warning(f"Gemini API call failed, falling back to clinical engine: {e}")

    return None, "demo_heuristic"

def _extract_action_line(text: str):
    """Pulls a trailing 'ACTION: <id>' directive out of an LLM answer."""
    if not text:
        return text, None
    lines = text.rstrip().split("\n")
    for i in range(len(lines) - 1, -1, -1):
        stripped = lines[i].strip()
        if stripped.upper().startswith("ACTION:"):
            action_id = stripped.split(":", 1)[1].strip().replace(" ", "_")
            del lines[i]
            return "\n".join(lines).rstrip(), (action_id or None)
    return text, None


async def process_chat_message(
    user_message: str,
    language: str = "en",
    context: Optional[Dict[str, Any]] = None,
    page_context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Main AI Orchestrator:
    1. Input Safety Layer (Emergency red flag screening)
    2. LLM or Clinical Heuristic Engine Processing (page-context aware)
    3. Output Safety Layer (Diagnostic neutralization & mandatory disclaimer enforcement)
    """
    # Sanitize the client-provided UI page context (whitelist + secret stripping)
    page = sanitize_page_context(page_context)
    engine_context = dict(context or {})
    if page:
        engine_context["page"] = page

    # 1. Input Safety Layer
    is_emergency, category, emergency_msg = screen_input_for_emergencies(user_message, language=language)
    if is_emergency:
        disclaimer = MANDATORY_DISCLAIMER_TA if language == "ta" else MANDATORY_DISCLAIMER_EN
        final_msg = screen_and_sanitize_output(emergency_msg, language=language)
        return {
            "message": final_msg,
            "language": language,
            "is_emergency": True,
            "emergency_category": category,
            "emergency_hotlines": EMERGENCY_HOTLINES,
            "disclaimer": disclaimer,
            "is_live_ai": False,
            "provider": "safety_guardrail"
        }

    # 2. Inference: Try external LLM, or use clinical reasoning engine
    ai_raw, provider_name = await call_external_llm(
        user_message, language=language, context=context, page_context=page
    )
    is_live = bool(ai_raw)
    if not ai_raw:
        ai_raw = generate_heuristic_response(user_message, language=language, context=engine_context)
        provider_name = "demo_heuristic"

    # Live LLM may propose an app action via a trailing 'ACTION: <id>' line;
    # validate the id against what the client actually advertised.
    suggested = None
    if is_live and page:
        ai_raw, action_id = _extract_action_line(ai_raw)
        if action_id:
            advertised = {a["id"]: a for a in page.get("actions", [])}
            if action_id in advertised:
                advertised_action = advertised[action_id]
                suggested = {
                    "id": action_id,
                    "label": advertised_action.get("label") or action_id,
                    "needs_confirm": True,
                }

    # Deterministic action intent detection (works in demo and live modes).
    # In demo mode the answer must explain the real action, its consequences
    # and require confirmation — not generic wellness filler.
    if suggested is None:
        suggested = detect_suggested_action(user_message, page)
        if suggested and not is_live:
            ai_raw = describe_action_response(suggested, language=language)

    # 3. Output Safety Layer (Sanitization & disclaimer guarantee)
    final_output = screen_and_sanitize_output(ai_raw, language=language)
    disclaimer = MANDATORY_DISCLAIMER_TA if language == "ta" else MANDATORY_DISCLAIMER_EN

    return {
        "message": final_output,
        "language": language,
        "is_emergency": False,
        "emergency_category": None,
        "emergency_hotlines": None,
        "disclaimer": disclaimer,
        "is_live_ai": is_live,
        "provider": provider_name,
        "suggested_action": suggested
    }
