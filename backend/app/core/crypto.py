import os
import json
import hashlib
from typing import Any, Optional
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.config import settings

def get_aes_key() -> bytes:
    """
    Derives 32-byte (256-bit) encryption key from the AES_MASTER_KEY environment variable.
    The key is stored in environment variables, NEVER in the database.
    """
    key_str = settings.AES_MASTER_KEY.strip()
    if len(key_str) == 64:
        try:
            return bytes.fromhex(key_str)
        except ValueError:
            pass
    return hashlib.sha256(key_str.encode("utf-8")).digest()

def encrypt_data(plaintext: Optional[str], associated_data: Optional[bytes] = None) -> Optional[bytes]:
    """
    Encrypts a plaintext string using AES-256-GCM.
    Generates a unique 12-byte initialization vector (nonce) for every encryption.
    Returns: 12-byte Nonce + Ciphertext + 16-byte GCM Authentication Tag as BYTEA.
    """
    if plaintext is None:
        return None

    key = get_aes_key()
    aesgcm = AESGCM(key)
    
    # 96-bit (12-byte) unique random nonce
    nonce = os.urandom(12)
    plaintext_bytes = plaintext.encode("utf-8")
    
    # AES-GCM encrypts and appends the 16-byte authentication tag
    ciphertext_with_tag = aesgcm.encrypt(nonce, plaintext_bytes, associated_data)
    
    # Combined payload: [12 bytes nonce] + [ciphertext] + [16 bytes tag]
    return nonce + ciphertext_with_tag

def decrypt_data(encrypted_bytes: Optional[bytes], associated_data: Optional[bytes] = None) -> Optional[str]:
    """
    Decrypts AES-256-GCM encrypted bytes from BYTEA column.
    Extracts 12-byte nonce and verifies the 16-byte authentication tag.
    Raises ValueError on tampering or invalid key.
    """
    if encrypted_bytes is None:
        return None

    if len(encrypted_bytes) < 28: # 12 bytes nonce + 16 bytes tag minimum
        raise ValueError("Invalid encrypted payload: data too short.")

    key = get_aes_key()
    aesgcm = AESGCM(key)

    nonce = encrypted_bytes[:12]
    ciphertext_with_tag = encrypted_bytes[12:]

    try:
        decrypted_bytes = aesgcm.decrypt(nonce, ciphertext_with_tag, associated_data)
        return decrypted_bytes.decode("utf-8")
    except Exception as e:
        raise ValueError(f"Decryption failed. Data may be tampered with or key is invalid: {e}")

def encrypt_json(data: Any, associated_data: Optional[bytes] = None) -> Optional[bytes]:
    """Serializes arbitrary JSON object and encrypts using AES-256-GCM."""
    if data is None:
        return None
    json_str = json.dumps(data, separators=(",", ":"), default=str)
    return encrypt_data(json_str, associated_data)

def decrypt_json(encrypted_bytes: Optional[bytes], associated_data: Optional[bytes] = None) -> Any:
    """Decrypts AES-256-GCM bytes and parses as JSON object."""
    if encrypted_bytes is None:
        return None
    decrypted_str = decrypt_data(encrypted_bytes, associated_data)
    return json.loads(decrypted_str)

def compute_record_hash(user_id: str, payload_str: str, salt: str = "") -> str:
    """
    Computes a deterministic cryptographic SHA-256 integrity hash across record fields.
    Ensures that any alteration in the database will be detected during integrity audits.
    """
    canonical_string = f"{user_id}:{payload_str}:{salt}"
    return hashlib.sha256(canonical_string.encode("utf-8")).hexdigest()

def verify_record_hash(user_id: str, payload_str: str, expected_hash: str, salt: str = "") -> bool:
    """Verifies that the decrypted record matches its recorded SHA-256 integrity hash."""
    computed = compute_record_hash(user_id, payload_str, salt)
    return computed == expected_hash
