from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.config import settings

router = APIRouter(prefix="", tags=["Health"])

@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    """
    Core health check endpoint.
    Verifies API runtime, database connectivity, and configuration parameters.
    """
    db_status = "connected"
    try:
        # Simple ping query
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"disconnected: {str(e)}"

    return {
        "status": "healthy" if "connected" in db_status else "degraded",
        "service": "HerCare Backend API",
        "version": "1.0.0-hackathon-r2",
        "environment": settings.ENV,
        "database": db_status,
        "demo_mode": settings.DEMO_MODE,
        "security": {
            "encryption_algorithm": "AES-256-GCM",
            "integrity_algorithm": "SHA-256",
            "local_storage": "IndexedDB",
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
