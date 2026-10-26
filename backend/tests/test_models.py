import datetime
from app.models.user import User
from app.models.otp import OtpRecord
from app.models.preference import Preference
from app.models.cycle import CycleRecord
from app.models.chat import ChatHistory

def test_user_creation(db_session):
    user = User(
        phone_number="+919876543210",
        is_demo_user=True,
        preferred_language="ta"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    assert user.id is not None
    assert user.phone_number == "+919876543210"
    assert user.preferred_language == "ta"
    assert user.is_demo_user is True

def test_preference_model_with_bytea(db_session):
    user = User(phone_number="+919876543211", is_demo_user=False)
    db_session.add(user)
    db_session.commit()

    # Simulate AES-256-GCM ciphertext bytes
    dummy_encrypted = b"\x00\x01\x02\x03encrypted_bytes_payload"
    dummy_hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

    pref = Preference(
        user_id=user.id,
        nickname_encrypted=dummy_encrypted,
        food_dislikes_encrypted=dummy_encrypted,
        exercise_pref_encrypted=dummy_encrypted,
        energy_level_encrypted=dummy_encrypted,
        record_hash=dummy_hash
    )
    db_session.add(pref)
    db_session.commit()
    db_session.refresh(pref)

    assert pref.id is not None
    assert pref.nickname_encrypted == dummy_encrypted
    assert pref.record_hash == dummy_hash
    assert pref.user.phone_number == "+919876543211"

def test_cycle_record_with_bytea(db_session):
    user = User(phone_number="+919876543212")
    db_session.add(user)
    db_session.commit()

    dummy_symptoms = b"encrypted_cramps_headache_data"
    dummy_hash = "a" * 64

    cycle = CycleRecord(
        user_id=user.id,
        dates_encrypted=b"dummy_encrypted_dates",
        start_date=datetime.date(2026, 10, 1),
        end_date=datetime.date(2026, 10, 5),
        cycle_length=28,
        period_length=5,
        symptoms_encrypted=dummy_symptoms,
        record_hash=dummy_hash
    )
    db_session.add(cycle)
    db_session.commit()
    db_session.refresh(cycle)

    assert cycle.id is not None
    assert cycle.cycle_length == 28
    assert cycle.symptoms_encrypted == dummy_symptoms

def test_otp_record_validation(db_session):
    otp = OtpRecord(
        phone_number="+919876543213",
        otp_code="123456",
        expires_at=datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=5)
    )
    db_session.add(otp)
    db_session.commit()

    assert otp.is_valid() is True
