import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.core.database import Base, engine
from app.core.migrations import run_additive_migrations
from app.routers import health, auth, preferences, cycles, symptoms, sync, ai

# Setup logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("hercare")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle hook for startup and shutdown tasks."""
    logger.info("Initializing HerCare Backend Services...")

    # Refuse to boot a production instance that still uses the shipped sample secrets.
    if settings.IS_PRODUCTION:
        sample_secrets = (
            "hercare_jwt_super_secret_signing_key_hackathon_round2_2026",
            "4a6f7966756c486572436172655365637572654b6579323032364861636b2121",
        )
        if settings.JWT_SECRET_KEY in sample_secrets or settings.AES_MASTER_KEY in sample_secrets:
            raise RuntimeError(
                "Refusing to start in production with the sample JWT/AES secrets. "
                "Set JWT_SECRET_KEY and AES_MASTER_KEY environment variables to unique values."
            )
        if settings.DEMO_MODE:
            logger.warning("DEMO_MODE is enabled in production; demo OTP shortcuts are disabled.")

    try:
        # 1. Create any missing tables (non-destructive)
        Base.metadata.create_all(bind=engine)
        logger.info("SQLAlchemy models mapped successfully.")
        # 2. Add columns missing from older databases (additive-only, preserves rows)
        applied = run_additive_migrations(engine)
        if applied:
            logger.info("Applied %d additive schema migration(s).", len(applied))
    except Exception as e:
        logger.warning(f"Database auto-migration warning: {e}")
    yield
    logger.info("Shutting down HerCare Backend Services...")

app = FastAPI(
    title="HerCare API",
    description="Privacy-First, Multilingual, Voice-Enabled AI Menstrual Health Companion API",
    version="1.0.0-hackathon-r2",
    lifespan=lifespan
)

# CORS Middleware
# Never combine `allow_origins=["*"]` with `allow_credentials=True` (invalid and
# unsafe). In development we widen the list with the local dev servers only.
_origins = settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else []
_origins = [o for o in _origins if o and o != "*"]
if settings.DEBUG:
    for dev_origin in (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ):
        if dev_origin not in _origins:
            _origins.append(dev_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health.router, prefix="/api/v1")
app.include_router(health.router, prefix="") # Also root /health for Docker probes
app.include_router(auth.router, prefix="/auth")
app.include_router(auth.router, prefix="/api/v1/auth")
app.include_router(preferences.router, prefix="/api/v1")
app.include_router(preferences.router, prefix="")
app.include_router(cycles.router, prefix="/api/v1")
app.include_router(cycles.router, prefix="")
app.include_router(symptoms.router, prefix="/api/v1")
app.include_router(symptoms.router, prefix="")
app.include_router(sync.router, prefix="/api/v1")
app.include_router(sync.router, prefix="")
app.include_router(ai.router, prefix="/api/v1")
app.include_router(ai.router, prefix="")

@app.get("/")
def root():
    return {
        "message": "Welcome to HerCare API",
        "docs_url": "/docs",
        "health_url": "/api/v1/health",
        "version": "1.0.0-hackathon-r2"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=settings.DEBUG)
