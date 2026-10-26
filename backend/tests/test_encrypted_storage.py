import pytest
from app.models.user import User
from app.models.preference import Preference
from app.models.cycle import CycleRecord

@pytest.fixture()
def auth_headers(client):
    """Helper fixture to authenticate a test user and obtain JWT headers."""
    phone = "+919876500001"
    res_send = client.post("/auth/send-otp", json={"phone_number": phone})
    demo_otp = res_send.json()["demo_otp"]
    res_verify = client.post("/auth/verify-otp", json={
        "phone_number": phone,
        "otp_code": demo_otp
    })
    token = res_verify.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_preferences_encryption_in_database(client, auth_headers, db_session):
    # 1. Post preferences
    pref_payload = {
        "nickname": "Kavitha",
        "food_dislikes": ["dairy", "spicy food"],
        "exercise_pref": "gentle yoga",
        "energy_level": "medium"
    }
    res = client.post("/preferences", json=pref_payload, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["nickname"] == "Kavitha"
    assert data["integrity_verified"] is True

    # 2. Inspect raw database record to verify BYTEA encryption
    pref_record = db_session.query(Preference).first()
    assert pref_record is not None
    # Verify the stored column is raw bytes
    assert isinstance(pref_record.nickname_encrypted, bytes)
    # Verify the raw bytes do NOT contain the plaintext nickname
    assert b"Kavitha" not in pref_record.nickname_encrypted
    assert b"dairy" not in pref_record.food_dislikes_encrypted

    # 3. Retrieve through the backend and verify decryption
    res_get = client.get("/preferences", headers=auth_headers)
    assert res_get.status_code == 200
    get_data = res_get.json()
    assert get_data["nickname"] == "Kavitha"
    assert "dairy" in get_data["food_dislikes"]
    assert get_data["integrity_verified"] is True

def test_cloud_sync_disabled_by_default(client, auth_headers):
    # Verify cloud sync is disabled by default
    res_status = client.get("/sync/status", headers=auth_headers)
    assert res_status.status_code == 200
    assert res_status.json()["cloud_sync_enabled"] is False

    # Attempt to post a cycle record while cloud sync is disabled
    cycle_payload = {
        "start_date": "2026-10-01",
        "end_date": "2026-10-05",
        "cycle_length": 28,
        "period_length": 5,
        "symptoms": ["cramps", "fatigue"],
        "mood": "calm",
        "flow": "medium",
        "notes": "Ginger tea helped with pain"
    }
    res_post = client.post("/cycles", json=cycle_payload, headers=auth_headers)
    # Must be rejected because cloud sync is disabled by default
    assert res_post.status_code == 403
    assert "Cloud sync is disabled" in res_post.json()["detail"]

def test_encrypted_cycle_workflow_and_export_delete(client, auth_headers, db_session):
    # 1. Enable cloud sync
    res_toggle = client.post("/sync/toggle", json={"enabled": True}, headers=auth_headers)
    assert res_toggle.status_code == 200
    assert res_toggle.json()["cloud_sync_enabled"] is True

    # 2. Post cycle record
    cycle_payload = {
        "start_date": "2026-10-10",
        "end_date": "2026-10-15",
        "cycle_length": 30,
        "period_length": 5,
        "symptoms": ["severe cramps", "back pain"],
        "mood": "fatigued",
        "flow": "heavy",
        "notes": "Intimate private note: hot water pack used"
    }
    res_cycle = client.post("/cycles", json=cycle_payload, headers=auth_headers)
    assert res_cycle.status_code == 200
    cycle_data = res_cycle.json()
    assert cycle_data["start_date"] == "2026-10-10"
    assert cycle_data["integrity_verified"] is True

    # 3. Verify raw database record: Cycle dates, symptoms, notes MUST be encrypted BYTEA
    raw_cycle = db_session.query(CycleRecord).filter(CycleRecord.id == cycle_data["id"]).first()
    assert raw_cycle is not None
    assert isinstance(raw_cycle.dates_encrypted, bytes)
    assert isinstance(raw_cycle.symptoms_encrypted, bytes)
    assert isinstance(raw_cycle.notes_encrypted, bytes)

    # Confirm plaintexts are absent from the database columns
    assert b"2026-10-10" not in raw_cycle.dates_encrypted
    assert b"severe cramps" not in raw_cycle.symptoms_encrypted
    assert b"hot water pack" not in raw_cycle.notes_encrypted

    # 4. Check integrity audit endpoint
    res_audit = client.get("/cycles/verify-integrity", headers=auth_headers)
    assert res_audit.status_code == 200
    assert res_audit.json()["status"] == "clean"
    assert res_audit.json()["integrity_rate"] == "100.0%"

    # 5. Export my data endpoint
    res_export = client.get("/sync/export", headers=auth_headers)
    assert res_export.status_code == 200
    export_json = res_export.json()
    assert export_json["cloud_sync_enabled"] is True
    assert len(export_json["cycles"]) >= 1
    assert export_json["cycles"][0]["start_date"] == "2026-10-10"
    assert export_json["security_audit"]["encryption_algorithm"] == "AES-256-GCM"

    # Also verify alias /auth/export-my-data
    res_export_alias = client.get("/auth/export-my-data", headers=auth_headers)
    assert res_export_alias.status_code == 200

    # 6. Delete my data endpoint
    res_del = client.delete("/sync/delete", headers=auth_headers)
    assert res_del.status_code == 200
    assert res_del.json()["status"] == "success"

    # Verify database records are deleted
    remaining_cycles = db_session.query(CycleRecord).filter(CycleRecord.id == cycle_data["id"]).count()
    assert remaining_cycles == 0

    # Verify cloud sync disabled after deletion
    res_status = client.get("/sync/status", headers=auth_headers)
    assert res_status.json()["cloud_sync_enabled"] is False
