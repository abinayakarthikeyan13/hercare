"""
Tests for the app-wide context-aware assistant:
- page_context drives page-specific answers on the real /chat endpoint
- sensitive keys are never echoed to the LLM or back to the client
- English/Tamil page answers
- suggested_action proposals are only made for client-advertised actions
- live-LLM failure falls back to the heuristic engine (no 500s)
"""
import pytest
from app.services.ai_agent import (
    sanitize_page_context,
    format_page_context_block,
    generate_page_help_response,
    detect_suggested_action,
)

CYCLE_PAGE_CONTEXT = {
    "route": "/cycle",
    "page_name": "Cycle Tracking",
    "purpose": "Select and confirm period dates on the rotary dial and review saved cycles.",
    "sections": ["Rotary cycle dial", "Recent History", "Confirm & Save Cycle"],
    "actions": [
        {"id": "open_dial", "label": "Select dates on the dial", "needs_confirm": False},
        {"id": "save_check_in", "label": "Save Cycle", "needs_confirm": True},
    ],
}

SETTINGS_PAGE_CONTEXT = {
    "route": "/settings",
    "page_name": "Settings",
    "purpose": "Manage profile, language, privacy and your stored data.",
    "sections": ["App Language", "Data Storage & Privacy", "Export My Data", "Delete My Data"],
    "actions": [
        {"id": "export_data", "label": "Export My Data (JSON)", "needs_confirm": True},
        {"id": "delete_data", "label": "Delete My Data", "needs_confirm": True},
        {"id": "change_language", "label": "Switch language", "needs_confirm": False},
    ],
}


# ---------------------------------------------------------------------------
# Sanitizer unit tests
# ---------------------------------------------------------------------------

def test_sanitize_drops_sensitive_keys():
    dirty = {
        "route": "/settings",
        "page_name": "Settings",
        "password": "hunter2",
        "auth_token": "eyJhbGciOi",
        "otp": "123456",
        "api_key": "sk-abc",
        "purpose": "Manage profile",
    }
    clean = sanitize_page_context(dirty)
    assert clean is not None
    dumped = str(clean).lower()
    for secret in ("hunter2", "eyJhbgi", "123456", "sk-abc", "password", "otp", "api_key"):
        assert secret not in dumped
    assert clean["route"] == "/settings"
    assert clean["purpose"] == "Manage profile"


def test_sanitize_keeps_legit_ui_labels_but_redacts_secret_values():
    """Regression: 'card'/'password'/'otp' inside UI labels must survive;
    credential-looking VALUES inside strings must not."""
    context = {
        "route": "/home",
        "sections": [
            "Cycle Overview card",
            "Daily Mood & Symptom Check-in card",
            "Password field with visibility toggle",
            "Six-digit OTP input",
            "Debug: token = " + "a" * 40,
        ],
        "purpose": "Manage profile",
    }
    clean = sanitize_page_context(context)
    joined = " | ".join(clean["sections"])
    assert "Cycle Overview card" in joined
    assert "Daily Mood & Symptom Check-in card" in joined
    assert "Password field with visibility toggle" in joined
    assert "Six-digit OTP input" in joined
    assert "a" * 40 not in joined  # secret-looking value redacted
    assert "[redacted]" in joined


def test_sanitize_rejects_garbage_and_caps_sizes():
    assert sanitize_page_context(None) is None
    assert sanitize_page_context("not-a-dict") is None
    assert sanitize_page_context({}) is None

    huge = {"route": "/home", "page_name": "x" * 500, "sections": ["s" * 500] * 50}
    clean = sanitize_page_context(huge)
    assert len(clean["page_name"]) <= 80
    assert len(clean["sections"]) <= 20
    assert all(len(s) <= 160 for s in clean["sections"])


def test_format_page_context_block_contains_only_real_context():
    block = format_page_context_block(CYCLE_PAGE_CONTEXT)
    assert "Cycle Tracking" in block
    assert "Confirm & Save Cycle" in block
    assert "ACTION: <action_id>" in block
    assert format_page_context_block(None) == ""


# ---------------------------------------------------------------------------
# Heuristic page-help unit tests
# ---------------------------------------------------------------------------

def test_page_help_lists_real_sections_and_actions():
    answer = generate_page_help_response(CYCLE_PAGE_CONTEXT, language="en")
    assert "Cycle Tracking" in answer
    assert "Rotary cycle dial" in answer
    assert "Save Cycle" in answer
    # actions with needs_confirm must be described honestly
    assert "confirmation" in answer


def test_page_help_without_context_asks_clarification():
    answer = generate_page_help_response(None, language="en")
    assert "cannot see which screen" in answer or "Could you tell me" in answer


def test_page_help_tamil():
    answer = generate_page_help_response(CYCLE_PAGE_CONTEXT, language="ta")
    assert "பக்கத்தில்" in answer
    assert "மாதவிடாய்" in answer or "சுழற்சி" in answer or "Cycle Tracking" in answer


def test_suggested_action_only_for_advertised_actions():
    suggested = detect_suggested_action("please export my data", SETTINGS_PAGE_CONTEXT)
    assert suggested is not None
    assert suggested["id"] == "export_data"
    assert suggested["needs_confirm"] is True

    # delete_data is NOT advertised on this page -> must not be proposed
    no_delete = {"route": "/home", "actions": [{"id": "export_data", "label": "Export"}]}
    assert detect_suggested_action("delete my data", no_delete) is None
    # no actions at all -> never propose
    assert detect_suggested_action("delete my data", None) is None


# ---------------------------------------------------------------------------
# Endpoint integration tests
# ---------------------------------------------------------------------------

def test_what_can_i_do_here_returns_page_specific_answer(client):
    res = client.post("/chat", json={
        "message": "What can I do here?",
        "language": "en",
        "page_context": CYCLE_PAGE_CONTEXT,
    })
    assert res.status_code == 200
    data = res.json()
    body = data["message"]
    assert "Cycle Tracking" in body
    assert "Confirm & Save Cycle" in body or "Rotary cycle dial" in body
    assert data["language"] == "en"


def test_page_answer_changes_with_route(client):
    res = client.post("/chat", json={
        "message": "What can I do here?",
        "language": "en",
        "page_context": SETTINGS_PAGE_CONTEXT,
    })
    assert res.status_code == 200
    body = res.json()["message"]
    assert "Settings" in body
    assert "Export My Data" in body
    assert "Cycle Tracking" not in body


def test_page_answer_tamil(client):
    res = client.post("/chat", json={
        "message": "இங்கே என்ன செய்யலாம்?",
        "language": "ta",
        "page_context": CYCLE_PAGE_CONTEXT,
    })
    assert res.status_code == 200
    data = res.json()
    assert data["language"] == "ta"
    assert "பக்கத்தில்" in data["message"]


def test_no_page_context_clarification_not_invention(client):
    res = client.post("/chat", json={
        "message": "What can I do here?",
        "language": "en",
    })
    assert res.status_code == 200
    body = res.json()["message"]
    assert "cannot see which screen" in body or "Could you tell me" in body


def test_secrets_in_page_context_never_leak(client):
    res = client.post("/chat", json={
        "message": "What can I do here?",
        "language": "en",
        "page_context": {
            "route": "/settings",
            "page_name": "Settings",
            "password": "SuperSecret123!",
            "session_token": "tok_abcdef123",
            "purpose": "Manage profile",
        },
    })
    assert res.status_code == 200
    body = res.json()["message"]
    assert "SuperSecret123!" not in body
    assert "tok_abcdef123" not in body


def test_suggested_action_on_export_request(client):
    res = client.post("/chat", json={
        "message": "Please export my data",
        "language": "en",
        "page_context": SETTINGS_PAGE_CONTEXT,
    })
    assert res.status_code == 200
    data = res.json()
    assert data["suggested_action"] is not None
    assert data["suggested_action"]["id"] == "export_data"
    assert data["suggested_action"]["needs_confirm"] is True
    # must never claim the action already happened
    assert "exported successfully" not in data["message"].lower()
    # must explain the REAL export format and require confirmation first
    assert "JSON" in data["message"]
    assert "Confirm" in data["message"]


def test_delete_request_explains_consequences_before_confirmation(client):
    res = client.post("/chat", json={
        "message": "delete my data",
        "language": "en",
        "page_context": SETTINGS_PAGE_CONTEXT,
    })
    assert res.status_code == 200
    data = res.json()
    assert data["suggested_action"]["id"] == "delete_data"
    msg = data["message"].lower()
    assert "cannot be undone" in msg
    assert "cloud" in msg
    assert "delet" in msg  # explains what deletion actually does
    # never claims deletion already occurred
    assert "has been deleted" not in msg


def test_no_suggested_action_for_undisclosed_action(client):
    home_context = {"route": "/home", "page_name": "Home",
                    "actions": [{"id": "open_dial", "label": "Open Dial"}]}
    res = client.post("/chat", json={
        "message": "delete all my data",
        "language": "en",
        "page_context": home_context,
    })
    assert res.status_code == 200
    assert res.json()["suggested_action"] is None


def test_health_question_unaffected_by_page_context(client):
    res = client.post("/chat", json={
        "message": "I have bad cramps today",
        "language": "en",
        "page_context": CYCLE_PAGE_CONTEXT,
    })
    assert res.status_code == 200
    body = res.json()["message"].lower()
    assert "cramp" in body or "heat" in body or "warm" in body


def test_nickname_from_context_is_used(client):
    res = client.post("/chat", json={
        "message": "hello",
        "language": "en",
        "context": {"nickname": "Rose"},
        "page_context": {"route": "/home", "page_name": "Home Dashboard"},
    })
    assert res.status_code == 200
    assert "Rose" in res.json()["message"]


# ---------------------------------------------------------------------------
# Page greeting endpoint (spoken avatar opens on each screen)
# ---------------------------------------------------------------------------

def test_greeting_onboarding_asks_forNickname(client):
    res = client.post("/page-greeting", json={
        "language": "en",
        "page_context": {
            "route": "/onboarding",
            "page_name": "Companion Onboarding",
            "greeting": "This is where you choose my name! What nickname would you like me to use?",
        },
    })
    assert res.status_code == 200
    data = res.json()
    assert "nickname" in data["message"].lower()
    assert data["route"] == "/onboarding"


def test_greeting_template_uses_real_page_context(client):
    res = client.post("/page-greeting", json={
        "language": "en",
        "page_context": {
            "route": "/cycle",
            "page_name": "Cycle Tracking",
            "actions": [{"id": "open_check_in", "label": "Open today's check-in"}],
        },
    })
    assert res.status_code == 200
    msg = res.json()["message"]
    assert "Cycle Tracking" in msg
    assert "Open today's check-in" in msg


def test_greeting_tamil(client):
    res = client.post("/page-greeting", json={
        "language": "ta",
        "page_context": {
            "route": "/cycle",
            "page_name": "சுழற்சிக் கண்காணிப்பு",
            "greeting": "வணக்கம்! மாதவிடாய் தேதிகளை டயலில் தேர்ந்தெடுக்கலாமா?",
        },
    })
    assert res.status_code == 200
    data = res.json()
    assert data["language"] == "ta"
    assert "வணக்கம்" in data["message"]


def test_greeting_sanitizes_context(client):
    res = client.post("/page-greeting", json={
        "language": "en",
        "page_context": {
            "route": "/onboarding",
            "page_name": "Onboarding",
            "password": "hunter2",
            "greeting": "Pick a nickname; debug token=" + "b" * 40,
        },
    })
    assert res.status_code == 200
    msg = res.json()["message"]
    assert "hunter2" not in msg
    assert "b" * 40 not in msg
    assert "[redacted]" in msg


def test_greeting_without_context_is_honest(client):
    res = client.post("/page-greeting", json={"language": "en"})
    assert res.status_code == 200
    assert "cannot see which screen" in res.json()["message"]


def test_live_llm_failure_falls_back_without_error(client, monkeypatch):
    """When a provider key is configured but the call fails, /chat still answers."""
    import httpx
    from app.config import settings
    import app.services.ai_agent as agent_module

    class ExplodingClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def post(self, *args, **kwargs):
            raise httpx.ConnectError("simulated network failure")

    monkeypatch.setattr(agent_module.httpx, "AsyncClient", ExplodingClient)
    monkeypatch.setattr(settings, "GROQ_API_KEY", "test-key")

    res = client.post("/chat", json={
        "message": "What can I do here?",
        "language": "en",
        "page_context": CYCLE_PAGE_CONTEXT,
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_live_ai"] is False
    assert data["provider"] == "demo_heuristic"
    assert "Cycle Tracking" in data["message"]
