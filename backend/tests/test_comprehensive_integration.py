import pytest
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.models.cycle import CycleRecord
from app.models.preference import Preference

def test_full_security_and_isolation_flow(client, db_session):
    # 1. Test User A registration and authentication
    res_a = client.post("/auth/register-password", json={
        "email": "alice@hercare.app",
        "password": "AliceSecretPassword123!",
        "preferred_name": "Alice"
    })
    assert res_a.status_code == 200
    token_a = res_a.json()["access_token"]
    user_a_id = res_a.json()["user"]["id"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Verify password is not plaintext
    user_a_db = db_session.query(User).filter(User.id == user_a_id).first()
    assert user_a_db.password_hash != "AliceSecretPassword123!"
    assert verify_password("AliceSecretPassword123!", user_a_db.password_hash)

    # 2. Test User B registration and authentication
    res_b = client.post("/auth/register-password", json={
        "email": "bob@hercare.app",
        "password": "BobSecretPassword456!",
        "preferred_name": "Bob"
    })
    assert res_b.status_code == 200
    token_b = res_b.json()["access_token"]
    user_b_id = res_b.json()["user"]["id"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 3. Privacy Agreement Gate for User A
    agree_res = client.post("/auth/privacy-agreement", json={"accepted": True, "version": "1.0"}, headers=headers_a)
    assert agree_res.status_code == 200
    assert agree_res.json()["privacy_agreement_accepted"] is True

    # 4. Onboarding & Preferences for User A
    pref_res = client.post("/preferences", json={
        "nickname": "Alice",
        "food_dislikes": ["dairy"],
        "exercise_pref": "yoga",
        "energy_level": "high"
    }, headers=headers_a)
    assert pref_res.status_code == 200
    assert pref_res.json()["nickname"] == "Alice"
    assert pref_res.json()["integrity_verified"] is True

    # 5. Enable Cloud Sync for User A
    sync_res = client.post("/sync/toggle", json={"enabled": True}, headers=headers_a)
    assert sync_res.status_code == 200
    assert sync_res.json()["cloud_sync_enabled"] is True

    # 6. User A logs Cycle record
    cycle_res = client.post("/cycles", json={
        "start_date": "2026-10-15",
        "end_date": "2026-10-20",
        "cycle_length": 28,
        "period_length": 5,
        "symptoms": ["cramps", "fatigue"],
        "mood": "calm",
        "flow": "medium",
        "notes": "First logged period entry"
    }, headers=headers_a)
    assert cycle_res.status_code == 200
    cycle_id = cycle_res.json()["id"]

    # 7. User Data Isolation: User B CANNOT see User A's cycle record or preferences
    get_cycle_b = client.get("/cycles", headers=headers_b)
    assert get_cycle_b.status_code == 200
    assert len(get_cycle_b.json()) == 0  # User B has 0 cycles

    get_pref_b = client.get("/preferences", headers=headers_b)
    assert get_pref_b.status_code == 404  # User B has no preferences saved

    # 8. User A can retrieve her own cycle record decrypted
    get_cycle_a = client.get(f"/cycles/{cycle_id}", headers=headers_a)
    assert get_cycle_a.status_code == 200
    assert get_cycle_a.json()["start_date"] == "2026-10-15"
    assert get_cycle_a.json()["integrity_verified"] is True

    # 9. Test AI Conversation in English and Tamil
    chat_en = client.post("/chat", json={
        "message": "My stomach hurts today.",
        "language": "en"
    }, headers=headers_a)
    assert chat_en.status_code == 200
    assert "disclaimer" in chat_en.json()
    assert len(chat_en.json()["message"]) > 20

    chat_ta = client.post("/chat", json={
        "message": "எனக்கு வயிற்று வலி அதிகமாக உள்ளது.",
        "language": "ta"
    }, headers=headers_a)
    assert chat_ta.status_code == 200
    assert "disclaimer" in chat_ta.json()

    # 10. Test Emergency Red Flag Detection
    emergency_chat = client.post("/chat", json={
        "message": "I am experiencing severe sudden hemorrhage bleeding soaking two pads per hour and faint",
        "language": "en"
    })
    assert emergency_chat.status_code == 200
    assert emergency_chat.json()["is_emergency"] is True
    assert len(emergency_chat.json()["emergency_hotlines"]) > 0

    # 11. Test Export My Data
    export_res = client.get("/sync/export", headers=headers_a)
    assert export_res.status_code == 200
    export_data = export_res.json()
    assert export_data["email"] == "alice@hercare.app"
    assert len(export_data["cycles"]) == 1
    assert export_data["preferences"]["nickname"] == "Alice"

    # 12. Test Delete My Data (Purge all records)
    del_res = client.delete("/sync/delete", headers=headers_a)
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "success"

    # Confirm records were wiped for User A
    get_cycles_after = client.get("/cycles", headers=headers_a)
    assert len(get_cycles_after.json()) == 0
