import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.preference import Preference
from app.schemas.preference import PreferenceCreateRequest, PreferenceResponse
from app.core.crypto import (
    encrypt_data,
    decrypt_data,
    encrypt_json,
    decrypt_json,
    compute_record_hash,
    verify_record_hash
)

router = APIRouter(prefix="", tags=["Preferences"])

@router.get("/preferences", response_model=PreferenceResponse)
def get_user_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve decrypted user preferences.
    Decryption occurs strictly server-side using the environment AES key.
    Verifies SHA-256 record integrity against database tampering.
    """
    pref = db.query(Preference).filter(Preference.user_id == current_user.id).first()
    if not pref:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No preferences found. Please complete onboarding."
        )

    # 1. Decrypt AES-256-GCM BYTEA fields
    try:
        nickname = decrypt_data(pref.nickname_encrypted)
        food_dislikes = decrypt_json(pref.food_dislikes_encrypted) or []
        exercise_pref = decrypt_data(pref.exercise_pref_encrypted)
        energy_level = decrypt_data(pref.energy_level_encrypted)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Decryption error: Data may have been tampered with or key is invalid: {e}"
        )

    # 2. Verify SHA-256 integrity hash
    canonical_payload = f"{nickname}:{json.dumps(food_dislikes, separators=(',', ':'))}:{exercise_pref}:{energy_level}"
    integrity_ok = verify_record_hash(current_user.id, canonical_payload, pref.record_hash)

    return PreferenceResponse(
        nickname=nickname,
        food_dislikes=food_dislikes,
        exercise_pref=exercise_pref,
        energy_level=energy_level,
        record_hash=pref.record_hash,
        integrity_verified=integrity_ok,
        updated_at=pref.updated_at or datetime.now(timezone.utc)
    )

@router.post("/preferences", response_model=PreferenceResponse)
def save_user_preferences(
    payload: PreferenceCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Encrypt and store user onboarding preferences.
    Sensitive fields (nickname, food dislikes, exercise, energy) are stored as AES-256-GCM BYTEA.
    Computes SHA-256 integrity hash.
    """
    now = datetime.now(timezone.utc)

    # 1. Compute SHA-256 integrity hash over canonical plaintext
    canonical_payload = f"{payload.nickname}:{json.dumps(payload.food_dislikes, separators=(',', ':'))}:{payload.exercise_pref}:{payload.energy_level}"
    record_hash = compute_record_hash(current_user.id, canonical_payload)

    # 2. Encrypt sensitive fields with AES-256-GCM
    nickname_enc = encrypt_data(payload.nickname)
    food_enc = encrypt_json(payload.food_dislikes)
    exercise_enc = encrypt_data(payload.exercise_pref)
    energy_enc = encrypt_data(payload.energy_level)

    pref = db.query(Preference).filter(Preference.user_id == current_user.id).first()
    if not pref:
        pref = Preference(
            user_id=current_user.id,
            nickname_encrypted=nickname_enc,
            food_dislikes_encrypted=food_enc,
            exercise_pref_encrypted=exercise_enc,
            energy_level_encrypted=energy_enc,
            record_hash=record_hash,
            created_at=now,
            updated_at=now
        )
        db.add(pref)
    else:
        pref.nickname_encrypted = nickname_enc
        pref.food_dislikes_encrypted = food_enc
        pref.exercise_pref_encrypted = exercise_enc
        pref.energy_level_encrypted = energy_enc
        pref.record_hash = record_hash
        pref.updated_at = now

    current_user.onboarding_completed = True
    db.commit()
    db.refresh(pref)

    return PreferenceResponse(
        nickname=payload.nickname,
        food_dislikes=payload.food_dislikes,
        exercise_pref=payload.exercise_pref,
        energy_level=payload.energy_level,
        record_hash=record_hash,
        integrity_verified=True,
        updated_at=pref.updated_at
    )

@router.get("/profile", response_model=PreferenceResponse)
def get_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve decrypted user profile (alias for /preferences)."""
    return get_user_preferences(current_user=current_user, db=db)

@router.put("/profile", response_model=PreferenceResponse)
def update_user_profile(
    payload: PreferenceCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update encrypted user profile (alias for /preferences)."""
    return save_user_preferences(payload=payload, current_user=current_user, db=db)

