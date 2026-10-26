import pytest
from app.core.crypto import (
    encrypt_data,
    decrypt_data,
    encrypt_json,
    decrypt_json,
    compute_record_hash,
    verify_record_hash
)

def test_aes_256_gcm_encryption_and_decryption():
    plaintext = "Sensitive Health Note: Severe pelvic cramps and spotting"
    encrypted = encrypt_data(plaintext)

    # 1. Verify encrypted output is bytes
    assert isinstance(encrypted, bytes)
    # 2. Verify encrypted data is NOT equal to plaintext
    assert encrypted != plaintext.encode("utf-8")
    assert plaintext.encode("utf-8") not in encrypted
    # 3. Verify minimum length: 12-byte nonce + 16-byte tag = 28 bytes
    assert len(encrypted) > 28

    # 4. Decrypt through the module
    decrypted = decrypt_data(encrypted)
    assert decrypted == plaintext

def test_aes_gcm_tamper_detection():
    plaintext = "Confidential User Nickname: Deepa"
    encrypted = bytearray(encrypt_data(plaintext))

    # Tamper with one byte in the ciphertext payload
    encrypted[-1] = (encrypted[-1] + 1) % 256

    # Decryption MUST fail due to GCM authentication tag mismatch
    with pytest.raises(ValueError, match="Decryption failed"):
        decrypt_data(bytes(encrypted))

def test_json_encryption_and_decryption():
    data = {
        "symptoms": ["cramps", "fatigue", "mood swings"],
        "mood": "sensitive",
        "flow": "heavy",
        "pain_scale": 4
    }
    encrypted = encrypt_json(data)
    assert isinstance(encrypted, bytes)
    assert b"cramps" not in encrypted

    decrypted = decrypt_json(encrypted)
    assert decrypted == data

def test_sha_256_integrity_hash():
    user_id = "user-12345"
    payload = "2026-10-01:2026-10-05:28:5:cramps"

    record_hash = compute_record_hash(user_id, payload)
    assert len(record_hash) == 64 # SHA-256 produces 64 hex characters

    # Positive integrity check
    assert verify_record_hash(user_id, payload, record_hash) is True

    # Tampered payload check
    tampered_payload = "2026-10-01:2026-10-05:28:5:tampered_symptoms"
    assert verify_record_hash(user_id, tampered_payload, record_hash) is False
