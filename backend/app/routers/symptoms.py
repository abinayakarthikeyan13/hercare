import json
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.symptom import SymptomRecord
from app.schemas.symptom import (
    SymptomCreateRequest,
    SymptomUpdateRequest,
    SymptomResponse
)
from app.core.crypto import (
    encrypt_data,
    decrypt_data,
    encrypt_json,
    decrypt_json,
    compute_record_hash,
    verify_record_hash
)

router = APIRouter(prefix="", tags=["Symptom Tracking"])

@router.post("/symptoms", response_model=SymptomResponse)
def log_symptom_entry(
    payload: SymptomCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Log a daily symptom and mood check-in.
    Sensitive details are encrypted with AES-256-GCM before BYTEA storage.
    Enforces cloud sync consent.
    """
    if not current_user.cloud_sync_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cloud sync is disabled by default for privacy. Please enable Cloud Sync in Settings."
        )

    now = datetime.now(timezone.utc)
    symptoms_sorted = sorted(payload.symptoms)

    # 1. Canonical payload for SHA-256 integrity hash
    canonical = (
        f"{payload.date}:{json.dumps(symptoms_sorted, separators=(',', ':'))}:"
        f"{payload.mood}:{payload.energy_level}:{payload.pain_level}:"
        f"{payload.flow}:{payload.supplements_taken}:{payload.notes}"
    )
    record_hash = compute_record_hash(current_user.id, canonical)

    # 2. Encrypt sensitive payloads
    dates_payload = {
        "date": payload.date,
        "flow": payload.flow
    }
    dates_encrypted = encrypt_json(dates_payload)

    symptoms_payload = {
        "symptoms": symptoms_sorted,
        "mood": payload.mood,
        "energy_level": payload.energy_level,
        "pain_level": payload.pain_level,
        "supplements_taken": payload.supplements_taken
    }
    symptoms_encrypted = encrypt_json(symptoms_payload)
    notes_encrypted = encrypt_data(payload.notes) if payload.notes else None

    record = SymptomRecord(
        user_id=current_user.id,
        dates_encrypted=dates_encrypted,
        symptoms_encrypted=symptoms_encrypted,
        notes_encrypted=notes_encrypted,
        record_hash=record_hash,
        created_at=now,
        updated_at=now
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return SymptomResponse(
        id=record.id,
        date=payload.date,
        symptoms=symptoms_sorted,
        mood=payload.mood,
        energy_level=payload.energy_level,
        pain_level=payload.pain_level,
        flow=payload.flow,
        supplements_taken=payload.supplements_taken,
        notes=payload.notes,
        record_hash=record_hash,
        integrity_verified=True,
        created_at=record.created_at
    )

@router.get("/symptoms", response_model=List[SymptomResponse])
def get_user_symptoms(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve all encrypted symptom logs for the user.
    Decrypts AES-256-GCM BYTEA fields and validates integrity hash.
    """
    records = (
        db.query(SymptomRecord)
        .filter(SymptomRecord.user_id == current_user.id)
        .order_by(desc(SymptomRecord.created_at))
        .all()
    )

    results = []
    for r in records:
        try:
            dates = decrypt_json(r.dates_encrypted) or {}
            log_date = dates.get("date", "")
            flow = dates.get("flow")

            sym_data = decrypt_json(r.symptoms_encrypted) or {}
            symptoms = sorted(sym_data.get("symptoms", []))
            mood = sym_data.get("mood")
            energy_level = sym_data.get("energy_level")
            pain_level = sym_data.get("pain_level", 0)
            supplements_taken = sym_data.get("supplements_taken", False)

            notes = decrypt_data(r.notes_encrypted) if r.notes_encrypted else ""

            canonical = (
                f"{log_date}:{json.dumps(symptoms, separators=(',', ':'))}:"
                f"{mood}:{energy_level}:{pain_level}:"
                f"{flow}:{supplements_taken}:{notes}"
            )
            integrity_ok = verify_record_hash(current_user.id, canonical, r.record_hash)

            results.append(
                SymptomResponse(
                    id=r.id,
                    date=log_date,
                    symptoms=symptoms,
                    mood=mood,
                    energy_level=energy_level,
                    pain_level=pain_level,
                    flow=flow,
                    supplements_taken=supplements_taken,
                    notes=notes,
                    record_hash=r.record_hash,
                    integrity_verified=integrity_ok,
                    created_at=r.created_at
                )
            )
        except Exception as e:
            results.append(
                SymptomResponse(
                    id=r.id,
                    date="[TAMPERED]",
                    symptoms=["[TAMPERED]"],
                    mood="unknown",
                    energy_level="unknown",
                    pain_level=0,
                    notes=f"Decryption error: {e}",
                    record_hash=r.record_hash,
                    integrity_verified=False,
                    created_at=r.created_at
                )
            )
    return results

@router.put("/symptoms/{record_id}", response_model=SymptomResponse)
def update_symptom_entry(
    record_id: str,
    payload: SymptomUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update an existing symptom check-in entry with ownership check.
    """
    record = db.query(SymptomRecord).filter(
        SymptomRecord.id == record_id,
        SymptomRecord.user_id == current_user.id
    ).first()

    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Symptom record not found")

    dates = decrypt_json(record.dates_encrypted) or {}
    sym_data = decrypt_json(record.symptoms_encrypted) or {}
    notes = decrypt_data(record.notes_encrypted) if record.notes_encrypted else ""

    log_date = dates.get("date", "")
    flow = payload.flow if payload.flow is not None else dates.get("flow")
    symptoms = sorted(payload.symptoms) if payload.symptoms is not None else sym_data.get("symptoms", [])
    mood = payload.mood if payload.mood is not None else sym_data.get("mood")
    energy_level = payload.energy_level if payload.energy_level is not None else sym_data.get("energy_level")
    pain_level = payload.pain_level if payload.pain_level is not None else sym_data.get("pain_level", 0)
    supplements = payload.supplements_taken if payload.supplements_taken is not None else sym_data.get("supplements_taken", False)
    notes = payload.notes if payload.notes is not None else notes

    canonical = (
        f"{log_date}:{json.dumps(symptoms, separators=(',', ':'))}:"
        f"{mood}:{energy_level}:{pain_level}:"
        f"{flow}:{supplements}:{notes}"
    )
    new_hash = compute_record_hash(current_user.id, canonical)

    record.dates_encrypted = encrypt_json({"date": log_date, "flow": flow})
    record.symptoms_encrypted = encrypt_json({
        "symptoms": symptoms,
        "mood": mood,
        "energy_level": energy_level,
        "pain_level": pain_level,
        "supplements_taken": supplements
    })
    record.notes_encrypted = encrypt_data(notes) if notes else None
    record.record_hash = new_hash
    record.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(record)

    return SymptomResponse(
        id=record.id,
        date=log_date,
        symptoms=symptoms,
        mood=mood,
        energy_level=energy_level,
        pain_level=pain_level,
        flow=flow,
        supplements_taken=supplements,
        notes=notes,
        record_hash=new_hash,
        integrity_verified=True,
        created_at=record.created_at
    )

@router.delete("/symptoms/{record_id}")
def delete_symptom_entry(
    record_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a symptom entry with strict ownership check.
    """
    record = db.query(SymptomRecord).filter(
        SymptomRecord.id == record_id,
        SymptomRecord.user_id == current_user.id
    ).first()

    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Symptom record not found")

    db.delete(record)
    db.commit()
    return {"status": "success", "message": "Symptom record permanently deleted"}
