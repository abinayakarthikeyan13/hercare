def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "Welcome to HerCare API" in data["message"]
    assert data["docs_url"] == "/docs"

def test_health_check_endpoint(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "HerCare Backend API"
    assert data["status"] in ["healthy", "degraded"]
    assert "security" in data
    assert data["security"]["encryption_algorithm"] == "AES-256-GCM"
    assert data["security"]["integrity_algorithm"] == "SHA-256"

def test_root_health_alias(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
