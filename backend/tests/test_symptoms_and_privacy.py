import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_safety_check_endpoint_emergency():
    response = client.post("/safety/check", json={
        "text": "I am soaking two pads every hour and feel dizzy",
        "language": "en"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["is_emergency"] is True
    assert data["emergency_category"] == "SEVERE_HEMORRHAGE"
    assert "URGENT MEDICAL ALERT" in data["advisory_message"]
    assert len(data["emergency_hotlines"]) > 0

def test_safety_check_endpoint_tamil_emergency():
    response = client.post("/safety/check", json={
        "text": "கடுமையான ரத்தப்போக்கு மயக்கம் வருது",
        "language": "ta"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["is_emergency"] is True
    assert "அவசர மருத்துவ எச்சரிக்கை" in data["advisory_message"]

def test_safety_check_endpoint_safe_query():
    response = client.post("/safety/check", json={
        "text": "How can I soothe mild menstrual cramps today?",
        "language": "en"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["is_emergency"] is False
    assert data["advisory_message"] is None

def test_emergency_hotlines_list():
    response = client.get("/emergency/hotlines")
    assert response.status_code == 200
    hotlines = response.json()
    assert len(hotlines) >= 3
    numbers = [h["number"] for h in hotlines]
    assert "108" in numbers
    assert "112" in numbers
    assert "1091" in numbers
