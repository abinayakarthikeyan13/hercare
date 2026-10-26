# HerCare Security Architecture & CIA Triad Mapping

HerCare is designed around the **CIA Triad** (Confidentiality, Integrity, and Availability) to protect highly sensitive reproductive and menstrual health data against interception, tampering, and cloud leakages.

---

## 1. CIA Triad Mapping

```
                 +-----------------------------------------+
                 |            THE CIA TRIAD                |
                 +-----------------------------------------+
                 /                    |                    \
                /                     |                     \
    +-------------------+    +------------------+    +-------------------+
    |  CONFIDENTIALITY  |    |    INTEGRITY     |    |   AVAILABILITY    |
    |                   |    |                  |    |                   |
    | - Local IndexedDB |    | - AES-GCM AuthTag|    | - Local-First     |
    | - Cloud Sync OFF  |    | - SHA-256 Hashes |    |   Architecture    |
    | - AES-256-GCM     |    | - Strict Pydantic|    | - Offline Storage |
    | - Salted OTP Hash |    |   Validation     |    | - Export JSON     |
    | - Bcrypt 12 rounds|    | - Symptom Save   |    | - Disaster Purge  |
    | - JWT Auth        |    |   Confirmation   |    | - PostgreSQL Opt  |
    +-------------------+    +------------------+    +-------------------+
```

### 1. Confidentiality (Data Privacy & Protection)
- **Zero Cloud Leakage**: Menstrual cycle dates, notes, and symptoms remain in the user's browser in IndexedDB. Cloud sync is disabled by default.
- **AES-256-GCM Encryption**: When the user explicitly consents to cloud sync, sensitive columns are encrypted using AES-256 in Galois/Counter Mode with a cryptographically fresh 12-byte nonce for every record.
- **BYTEA Storage in PostgreSQL**: The database engine stores only raw encrypted bytes. Column inspection reveals zero plaintext health information.
- **Key Isolation**: Master encryption keys are stored strictly in environment variables (`FIELD_ENCRYPTION_KEY`), never stored in PostgreSQL.
- **Authentication**: JWT tokens (HMAC-SHA256) protect all authenticated endpoints. OTP codes are salted and hashed with SHA-256 before storage; plaintext OTPs are never persisted.
- **Password Security**: Uses native `bcrypt` with 12 computational cost rounds.

### 2. Integrity (Data Authenticity & Tamper Detection)
- **AES-GCM Authentication Tag**: AES-256-GCM provides authenticated encryption. Any bit-flip or ciphertext tampering causes decryption to fail immediately.
- **Cryptographic SHA-256 Checksums**: Every cycle record and user preference entry computes a deterministic SHA-256 hash over canonical plaintext. Database admins or malicious actors cannot alter records without invalidating the checksum.
- **Pydantic Validation**: Strict input schemas validate phone number normalization, ISO 8601 date formats, cycle length boundaries (15–60 days), and period duration constraints (1–14 days).
- **Human-in-the-Loop Symptom Confirmation**: The system never logs uncertain speech recognition results automatically. An explicit confirmation card asks the user to confirm before saving.

### 3. Availability (Accessibility & Disaster Recovery)
- **Local-First Resilience**: Even during total network outages or if PostgreSQL is offline, the user can continue logging periods, viewing calendar estimates, and tracking symptoms locally.
- **Data Portability (Right to Portability)**: Users can export their complete health profile, cycle logs, and chat records in structured JSON format with one click (`GET /sync/export` or through the UI).
- **Right to Be Forgotten**: Users can permanently wipe all local IndexedDB records and purge all encrypted cloud records from PostgreSQL with full cascade deletion (`DELETE /sync/delete`).
- **Graceful Fallbacks**: Web Speech API failures gracefully fall back to typed input. Unavailable external LLM keys fall back to a built-in deterministic clinical wellness heuristics engine.

---

## 2. Threat Model & Security Boundaries

| Threat Scenario | Mitigation in HerCare |
|---|---|
| **Database Compromise (SQL Dump Theft)** | All intimate fields are stored in `BYTEA` encrypted with AES-256-GCM. Without `FIELD_ENCRYPTION_KEY`, the attacker obtains only unreadable ciphertext. |
| **Tampered Database Records** | Modifying encrypted bytes triggers GCM tag authentication failure. Modifying plain values triggers SHA-256 integrity hash verification failure. |
| **OTP Brute-Force Attacks** | Strict rate limiting: 60-second resend cooldown, 5-minute challenge expiration, and maximum 3 incorrect attempts before challenge invalidation. Plain OTP is never stored in DB. |
| **Unauthorized Data Access** | All record mutations (`/cycles/{id}`, `/symptoms/{id}`) enforce strict UUID user ownership checks (`filter(Record.user_id == current_user.id)`). |
| **Accidental Cloud Upload** | Cloud sync is disabled by default. Requires explicit opt-in consent through the Privacy & Security screen. |
| **Speech Recognition Noise / Errors** | Interactive confirmation card prevents saving incorrect voice-transcribed symptoms without explicit approval. |

---

## 3. Real-World Security Disclosures & Limitations

1. **Not End-to-End Encrypted (E2EE)**:
   - Cloud sync uses server-side AES-256-GCM encryption. The FastAPI backend possesses the master key to encrypt and decrypt records for processing and AI guidance.
   - For production, hardware security modules (AWS KMS, Google Cloud KMS, or HashiCorp Vault) should manage the key lifecycle.
2. **Local Device Security**:
   - IndexedDB stores data within the user's browser sandbox on the local device. Anyone with full physical access to the unlocked device profile could inspect browser storage. Users are advised to secure their device with a PIN or biometrics.
3. **Medical Disclaimer**:
   - HerCare is a general wellness companion prototype and does not claim to be a certified medical device (SaMD) or clinical diagnostic tool.
