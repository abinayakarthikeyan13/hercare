import re
from typing import Tuple, Optional, List, Dict

MANDATORY_DISCLAIMER_EN = "This is general wellness guidance, not medical advice."
MANDATORY_DISCLAIMER_TA = "இது பொதுவான நல்வாழ்வு வழிகாட்டுதல் மட்டுமே, மருத்துவ ஆலோசனை அல்ல."

EMERGENCY_HOTLINES = [
    {
        "name": "National Emergency Helpline",
        "number": "112",
        "description": "24/7 all-in-one emergency response (Police, Fire, Ambulance)"
    },
    {
        "name": "Medical Ambulance Service",
        "number": "108",
        "description": "Emergency medical ambulance and transport service"
    },
    {
        "name": "Women's Helpline",
        "number": "1091",
        "description": "Dedicated 24/7 women's crisis and health support"
    }
]

# Emergency symptom patterns (English and Tamil)
EMERGENCY_PATTERNS = {
    "SEVERE_HEMORRHAGE": [
        r"(soak(ing|ed)?\s+(two|2|\d+)\s+pads?)",
        r"(bleed(ing)?\s+(very\s+)?heavy|heavy\s+bleeding)",
        r"(large\s+blood\s+clots?|golf\s+ball\s+sized\s+clots?)",
        r"(hemorrhag|haemorrhag)",
        r"(bleeding\s+through\s+(my\s+)?clothes)",
        r"(கடுமையான\s+ரத்தப்போக்கு|அதிக\s+ரத்தப்போக்கு)",
        r"(ரத்த\s+உறைவு|ரத்தப்\s*போக்கு\s*நிற்கவில்லை)",
    ],
    "FAINTING_AND_SHOCK": [
        r"(faint(ed|ing)?|passed\s+out|blacked\s+out)",
        r"(loss\s+of\s+consciousness)",
        r"(dizz(y|iness)\s+and\s+(bleed|pale|shak))",
        r"(மயக்கம்|மயங்கி\s+விழு|சுயநினைவு\s+இழ)",
    ],
    "SEVERE_ACUTE_PAIN": [
        r"(severe\s+(sharp\s+)?(pelvic|abdominal|stomach)\s+pain)",
        r"(unbearable\s+pain|intense\s+stabbing\s+pain)",
        r"(shoulder\s+tip\s+pain)",
        r"(ectopic)",
        r"(கடுமையான\s+வயிற்று\s+வலி|தாங்க\s+முடியாத\s+வலி|கூர்மையான\s+வலி)",
    ],
    "PREGNANCY_COMPLICATION": [
        r"(pregnant\s+and\s+(bleed|spotting|cramp))",
        r"(positive\s+pregnancy\s+test\s+and\s+pain)",
        r"(miscarriage)",
        r"(கர்ப்பம்\s+மற்றும்\s+ரத்தப்போக்கு|கர்ப்ப\s+காலத்தில்\s+வலி)",
    ],
    "TOXIC_SHOCK_OR_INFECTION": [
        r"(high\s+fever\s+(with|after)\s+tampon)",
        r"(toxic\s+shock)",
        r"(foul\s+smell(ing)?\s+(discharge|pus))",
        r"(அதிக\s+காய்ச்சல்.*டேம்பன்|துர்நாற்றம்\s+வீசும்\s+திரவம்)",
    ]
}

# Forbidden diagnostic or prescription phrases for output screening
FORBIDDEN_OUTPUT_PATTERNS = [
    r"(you\s+definitely\s+have)",
    r"(you\s+are\s+diagnosed\s+with)",
    r"(i\s+diagnose\s+you\s+with)",
    r"(you\s+have\s+pcos)",
    r"(you\s+have\s+endometriosis)",
    r"(take\s+\d+\s*mg)",
    r"(take\s+ibuprofen|take\s+meftal)",
    r"(i\s+prescribe)",
    r"(உங்களுக்கு\s+நிச்சயமாக\s+.*நோய்\s+உள்ளது)",
    r"(நான்\s+மருந்து\s+பரிந்துரைக்கிறேன்)"
]

def screen_input_for_emergencies(user_message: str, language: str = "en") -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Rule-based Input Safety Layer:
    Scans user input for critical emergency red flags before AI processing.
    Returns: (is_emergency, category, emergency_message)
    """
    clean_text = user_message.lower()

    for category, patterns in EMERGENCY_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, clean_text, re.IGNORECASE):
                if language == "ta":
                    msg = (
                        "🚨 **அவசர மருத்துவ எச்சரிக்கை**: நீங்கள் குறிப்பிட்டுள்ள அறிகுறிகள் "
                        "(கடுமையான ரத்தப்போக்கு, மயக்கம் அல்லது தீவிர வலி) உடனடி மருத்துவ கவனிப்பு தேவைப்படும் நிலை ஆகும்.\n\n"
                        "தயவுசெய்து உடனடியாக அருகிலுள்ள அவசர சிகிச்சை மையத்திற்கு செல்லவும் அல்லது கீழே உள்ள அவசர உதவி எண்ணை அழைக்கவும்:\n"
                        "• **அவசர ஊர்தி (Ambulance)**: 108\n"
                        "• **தேசிய அவசர எண்**: 112\n"
                        "• **பெண்கள் உதவி எண்**: 1091\n\n"
                        "தாமதிக்காமல் தகுதியான மருத்துவரை அணுகவும்."
                    )
                else:
                    msg = (
                        "🚨 **URGENT MEDICAL ALERT**: The symptoms you described "
                        "(such as heavy hemorrhaging, fainting, or acute severe pain) are red-flag indicators that require immediate medical evaluation.\n\n"
                        "Please go to the nearest emergency department or contact emergency medical services right away:\n"
                        "• **Medical Ambulance**: 108\n"
                        "• **National Emergency Number**: 112\n"
                        "• **Women's Crisis Helpline**: 1091\n\n"
                        "Do not wait. Please consult a qualified doctor or emergency physician immediately."
                    )
                return True, category, msg

    return False, None, None

def detect_emergency_symptoms(text: str, language: str = "en") -> Tuple[bool, Optional[str], Optional[str], List[Dict]]:
    """
    Convenience wrapper returning emergency status, category, message, and hotlines.
    """
    is_emergency, category, msg = screen_input_for_emergencies(text, language)
    hotlines = EMERGENCY_HOTLINES if is_emergency else []
    return is_emergency, category, msg, hotlines


def screen_and_sanitize_output(ai_response: str, language: str = "en") -> str:
    """
    Rule-based Output Safety Layer:
    1. Scans for forbidden diagnostic or prescriptive terminology and neutralizes them.
    2. Guarantees that the mandatory disclaimer is appended at the very end.
    """
    sanitized = ai_response

    # Check and sanitize forbidden diagnostic phrases
    for pattern in FORBIDDEN_OUTPUT_PATTERNS:
        if re.search(pattern, sanitized, re.IGNORECASE):
            if language == "ta":
                replacement = "ஒரு தகுதியான மருத்துவரிடம் மருத்துவ பரிசோதனை மூலமே இதை உறுதி செய்ய முடியும்"
            else:
                replacement = "Only a qualified healthcare professional can provide a formal diagnosis through clinical testing"
            sanitized = re.sub(pattern, replacement, sanitized, flags=re.IGNORECASE)

    # Enforce mandatory disclaimer
    disclaimer = MANDATORY_DISCLAIMER_TA if language == "ta" else MANDATORY_DISCLAIMER_EN

    # If disclaimer is already cleanly present, ensure formatting; otherwise append
    if disclaimer not in sanitized:
        sanitized = f"{sanitized.rstrip()}\n\n*{disclaimer}*"

    return sanitized
