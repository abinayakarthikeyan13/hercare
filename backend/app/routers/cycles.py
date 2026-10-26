import json
from datetime import datetime, timezone
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.cycle import CycleRecord
from app.schemas.cycle import CycleCreateRequest, CycleUpdateRequest, CycleResponse
from app.core.crypto import (
    encrypt_data,
    decrypt_data,
    encrypt_json,
    decrypt_json,
    compute_record_hash,
    verify_record_hash
)

router = APIRouter(prefix="", tags=["Cycle Tracking"])

@router.post("/cycles", response_model=CycleResponse)
def log_cycle_record(
    payload: CycleCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Log a new menstrual cycle entry.
    All sensitive fields (cycle dates, symptoms, notes) are encrypted with AES-256-GCM
    and stored as BYTEA in PostgreSQL.
    Enforces optional cloud sync check (cloud sync is disabled by default).
    """
    if not current_user.cloud_sync_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Cloud sync is disabled by default for privacy. "
                "Please enable Cloud Sync in your Privacy & Security settings to store encrypted records in PostgreSQL."
            )
        )

    now = datetime.now(timezone.utc)

    # 1. Canonical payload for SHA-256 integrity hash
    symptoms_sorted = sorted(payload.symptoms)
    canonical_payload = (
        f"{payload.start_date}:{payload.end_date}:{payload.cycle_length}:"
        f"{payload.period_length}:{json.dumps(symptoms_sorted, separators=(',', ':'))}:"
        f"{payload.mood}:{payload.flow}:{payload.notes}"
    )
    record_hash = compute_record_hash(current_user.id, canonical_payload)

    # 2. Encrypt sensitive fields before PostgreSQL BYTEA storage
    dates_payload = {
        "start_date": payload.start_date,
        "end_date": payload.end_date
    }
    dates_encrypted = encrypt_json(dates_payload)

    symptoms_payload = {
        "symptoms": symptoms_sorted,
        "mood": payload.mood,
        "flow": payload.flow
    }
    symptoms_encrypted = encrypt_json(symptoms_payload)
    notes_encrypted = encrypt_data(payload.notes) if payload.notes else None

    # Parse plain date object for optional local indexing if provided
    try:
        start_d = datetime.strptime(payload.start_date, "%Y-%m-%d").date()
        end_d = datetime.strptime(payload.end_date, "%Y-%m-%d").date() if payload.end_date else None
    except Exception:
        start_d, end_d = None, None

    record = CycleRecord(
        user_id=current_user.id,
        dates_encrypted=dates_encrypted,
        start_date=start_d,
        end_date=end_d,
        cycle_length=payload.cycle_length,
        period_length=payload.period_length,
        symptoms_encrypted=symptoms_encrypted,
        notes_encrypted=notes_encrypted,
        record_hash=record_hash,
        sync_status="synced",
        created_at=now,
        updated_at=now
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return CycleResponse(
        id=record.id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        cycle_length=payload.cycle_length,
        period_length=payload.period_length,
        symptoms=symptoms_sorted,
        mood=payload.mood,
        flow=payload.flow,
        notes=payload.notes,
        record_hash=record_hash,
        integrity_verified=True,
        created_at=record.created_at
    )

@router.get("/cycles", response_model=List[CycleResponse])
def get_user_cycles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve all encrypted cycle records for the user.
    Decrypts AES-256-GCM BYTEA fields and validates SHA-256 integrity hash.
    """
    records = (
        db.query(CycleRecord)
        .filter(CycleRecord.user_id == current_user.id)
        .order_by(desc(CycleRecord.created_at))
        .all()
    )

    results = []
    for r in records:
        try:
            dates = decrypt_json(r.dates_encrypted) or {}
            start_date = dates.get("start_date", "")
            end_date = dates.get("end_date")

            symptoms_data = decrypt_json(r.symptoms_encrypted) or {}
            symptoms = sorted(symptoms_data.get("symptoms", []))
            mood = symptoms_data.get("mood")
            flow = symptoms_data.get("flow")

            notes = decrypt_data(r.notes_encrypted) if r.notes_encrypted else None

            # Verify SHA-256 integrity hash
            canonical_payload = (
                f"{start_date}:{end_date}:{r.cycle_length}:{r.period_length}:"
                f"{json.dumps(symptoms, separators=(',', ':'))}:{mood}:{flow}:{notes}"
            )
            integrity_ok = verify_record_hash(current_user.id, canonical_payload, r.record_hash)

            results.append(
                CycleResponse(
                    id=r.id,
                    start_date=start_date,
                    end_date=end_date,
                    cycle_length=r.cycle_length,
                    period_length=r.period_length,
                    symptoms=symptoms,
                    mood=mood,
                    flow=flow,
                    notes=notes,
                    record_hash=r.record_hash,
                    integrity_verified=integrity_ok,
                    created_at=r.created_at
                )
            )
        except Exception as e:
            # Report tampered record
            results.append(
                CycleResponse(
                    id=r.id,
                    start_date="[TAMPERED]",
                    end_date=None,
                    cycle_length=r.cycle_length,
                    period_length=r.period_length,
                    symptoms=["[TAMPERED]"],
                    mood=None,
                    flow=None,
                    notes=f"Error decrypting record: {e}",
                    record_hash=r.record_hash,
                    integrity_verified=False,
                    created_at=r.created_at
                )
            )

    return results

@router.get("/cycles/verify-integrity")
def verify_cycles_integrity(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Audits all stored cycle records against their SHA-256 cryptographic hashes.
    Detects any unauthorized modification or database tampering.
    """
    records = db.query(CycleRecord).filter(CycleRecord.user_id == current_user.id).all()
    total = len(records)
    verified = 0
    tampered = []

    for r in records:
        try:
            dates = decrypt_json(r.dates_encrypted) or {}
            symptoms_data = decrypt_json(r.symptoms_encrypted) or {}
            notes = decrypt_data(r.notes_encrypted) if r.notes_encrypted else None

            start_date = dates.get("start_date", "")
            end_date = dates.get("end_date")
            symptoms = sorted(symptoms_data.get("symptoms", []))
            mood = symptoms_data.get("mood")
            flow = symptoms_data.get("flow")

            canonical = (
                f"{start_date}:{end_date}:{r.cycle_length}:{r.period_length}:"
                f"{json.dumps(symptoms, separators=(',', ':'))}:{mood}:{flow}:{notes}"
            )

            if verify_record_hash(current_user.id, canonical, r.record_hash):
                verified += 1
            else:
                tampered.append({"record_id": r.id, "reason": "Hash mismatch"})
        except Exception as e:
            tampered.append({"record_id": r.id, "reason": str(e)})

    return {
        "status": "clean" if len(tampered) == 0 else "tampered",
        "total_records": total,
        "verified_records": verified,
        "tampered_records": len(tampered),
        "tampered_details": tampered,
        "integrity_rate": f"{(verified / total * 100):.1f}%" if total > 0 else "100.0%"
    }

@router.put("/cycles/{record_id}", response_model=CycleResponse)
def update_cycle_record(
    record_id: str,
    payload: CycleUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update an existing cycle record with ownership validation.
    Re-encrypts payload and re-hashes integrity checksum.
    """
    record = db.query(CycleRecord).filter(
        CycleRecord.id == record_id,
        CycleRecord.user_id == current_user.id
    ).first()

    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cycle record not found")

    dates = decrypt_json(record.dates_encrypted) or {}
    symptoms_data = decrypt_json(record.symptoms_encrypted) or {}
    notes = decrypt_data(record.notes_encrypted) if record.notes_encrypted else ""

    start_date = payload.start_date if payload.start_date is not None else dates.get("start_date", "")
    end_date = payload.end_date if payload.end_date is not None else dates.get("end_date")
    cycle_length = payload.cycle_length if payload.cycle_length is not None else record.cycle_length
    period_length = payload.period_length if payload.period_length is not None else record.period_length
    symptoms = sorted(payload.symptoms) if payload.symptoms is not None else symptoms_data.get("symptoms", [])
    mood = payload.mood if payload.mood is not None else symptoms_data.get("mood")
    flow = payload.flow if payload.flow is not None else symptoms_data.get("flow")
    notes = payload.notes if payload.notes is not None else notes

    canonical = (
        f"{start_date}:{end_date}:{cycle_length}:{period_length}:"
        f"{json.dumps(symptoms, separators=(',', ':'))}:{mood}:{flow}:{notes}"
    )
    new_hash = compute_record_hash(current_user.id, canonical)

    record.dates_encrypted = encrypt_json({"start_date": start_date, "end_date": end_date})
    record.symptoms_encrypted = encrypt_json({"symptoms": symptoms, "mood": mood, "flow": flow})
    record.notes_encrypted = encrypt_data(notes) if notes else None
    record.cycle_length = cycle_length
    record.period_length = period_length
    record.record_hash = new_hash
    record.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(record)

    return CycleResponse(
        id=record.id,
        start_date=start_date,
        end_date=end_date,
        cycle_length=cycle_length,
        period_length=period_length,
        symptoms=symptoms,
        mood=mood,
        flow=flow,
        notes=notes,
        record_hash=new_hash,
        integrity_verified=True,
        created_at=record.created_at
    )

@router.get("/cycles/{record_id}", response_model=CycleResponse)
def get_cycle_record(
    record_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve single decrypted cycle record with ownership validation.
    """
    record = db.query(CycleRecord).filter(
        CycleRecord.id == record_id,
        CycleRecord.user_id == current_user.id
    ).first()

    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cycle record not found")

    dates = decrypt_json(record.dates_encrypted) or {}
    symptoms_data = decrypt_json(record.symptoms_encrypted) or {}
    notes = decrypt_data(record.notes_encrypted) if record.notes_encrypted else None

    start_date = dates.get("start_date", "")
    end_date = dates.get("end_date")
    symptoms = sorted(symptoms_data.get("symptoms", []))
    mood = symptoms_data.get("mood")
    flow = symptoms_data.get("flow")

    canonical = (
        f"{start_date}:{end_date}:{record.cycle_length}:{record.period_length}:"
        f"{json.dumps(symptoms, separators=(',', ':'))}:{mood}:{flow}:{notes}"
    )
    integrity_ok = verify_record_hash(current_user.id, canonical, record.record_hash)

    return CycleResponse(
        id=record.id,
        start_date=start_date,
        end_date=end_date,
        cycle_length=record.cycle_length,
        period_length=record.period_length,
        symptoms=symptoms,
        mood=mood,
        flow=flow,
        notes=notes,
        record_hash=record.record_hash,
        integrity_verified=integrity_ok,
        created_at=record.created_at
    )

@router.delete("/cycles/{record_id}")
def delete_cycle_record(
    record_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a cycle record with ownership validation.
    """
    record = db.query(CycleRecord).filter(
        CycleRecord.id == record_id,
        CycleRecord.user_id == current_user.id
    ).first()

    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cycle record not found")

    db.delete(record)
    db.commit()
    return {"status": "success", "message": "Cycle record permanently deleted"}
