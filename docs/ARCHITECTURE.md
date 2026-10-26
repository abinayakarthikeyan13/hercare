# HerCare Architecture & Engineering Design

HerCare is a **Privacy-First, Multilingual, Voice-Enabled AI Menstrual Health Companion** engineered for high-assurance confidentiality, clinical safety, and accessibility in Tamil and English.

---

## 1. System Overview Architecture

```
+-----------------------------------------------------------------------------------+
|                            USER INTERFACE (FRONTEND)                              |
|  - React 18 + Vite + Tailwind CSS                                                 |
|  - Web Speech API (Speech-to-Text: en-IN / ta-IN & SpeechSynthesis TTS)          |
|  - Responsive Design (375px Mobile Canvas / Desktop Dashboard)                    |
|  - Recreates Design Reference: Menstrual Ring Dial, Monthly Calendar, Quick Cards|
+-----------------------------------------------------------------------------------+
         |                                                 |
         | Local-First Storage (No network needed)         | Optional Cloud Sync
         v                                                 v (User Consent Required)
+------------------------------------+           +----------------------------------+
|      CLIENT-SIDE INDEXEDDB         |           |       FASTAPI BACKEND API        |
|  - Dexie / idb database wrapper    |           |  - Python 3.12 + FastAPI         |
|  - Preferences & Nickname          |           |  - JWT Authentication + Salted   |
|  - Cycle & Symptom Records         |           |    OTP Challenges (Demo Mode)    |
|  - Local AI Chat History           |           |  - Deterministic Safety Engine   |
|  - Zero Cloud Leakage by Default   |           |  - Bilingual AI Agent Pipeline   |
+------------------------------------+           +----------------------------------+
                                                           |
                                                           | AES-256-GCM Payload Encryption
                                                           | SHA-256 Record Integrity Hash
                                                           v
                                                 +----------------------------------+
                                                 |      POSTGRESQL DATABASE         |
                                                 |  - BYTEA Encrypted Columns       |
                                                 |  - Foreign Key UUID Ownership    |
                                                 |  - Never stores encryption keys  |
                                                 +----------------------------------+
```

---

## 2. Key Architectural Tenets

### 1. Local-First Confidentiality (Availability & Privacy)
- **Default State**: All intimate menstrual health records, cycle start/end dates, symptoms, mood, and AI chat logs are saved in the client's browser using **IndexedDB**.
- **Offline Capable**: The application remains fully functional for cycle tracking, symptom logging, history graphing, and voice interaction without an active internet connection or backend server.
- **Zero Cloud Leakage**: Cloud sync is strictly **OFF by default**. No personal data is transmitted across the network unless explicit user consent is granted.

### 2. Multi-Layered Security (Confidentiality & Integrity)
- **AES-256-GCM Encryption**: All sensitive cloud fields (cycle dates, symptoms, notes, nickname, chat logs) are encrypted using 256-bit AES in Galois/Counter Mode with a unique 12-byte nonce per operation.
- **BYTEA Storage**: Encrypted payloads are stored as raw binary (`BYTEA`) in PostgreSQL. The database never sees plaintext health values.
- **Key Isolation**: Master encryption keys are stored exclusively in backend environment variables (`FIELD_ENCRYPTION_KEY`), never persisted in the database.
- **SHA-256 Record Integrity**: Every sensitive record computes a deterministic keyed hash over canonical plaintext to detect database tampering or unauthorized modifications.

### 3. Clinical Safety & Guardrails
- **Deterministic Pre-LLM Screening**: An independent regex-driven safety engine scans user input for red flag emergency indicators (severe hemorrhage, fainting, acute pelvic pain, pregnancy complications, toxic shock) in both English and Tamil *before* calling the LLM.
- **Non-Diagnostic Policy**: HerCare never diagnoses diseases (e.g. PCOS, Endometriosis) and never prescribes medications or dosages.
- **Mandatory Disclaimer**: Every response enforces:
  - English: *"This is general wellness guidance, not medical advice."*
  - Tamil: *"இது பொதுவான நல்வாழ்வு வழிகாட்டுதல் மட்டுமே; மருத்துவ ஆலோசனை அல்ல."*
- **Symptom Confirmation Barrier**: The app never logs voice transcripts automatically. It requires explicit user confirmation via an interactive confirmation card before committing a symptom to the tracker.

### 4. Bilingual Voice Pipeline
- **Speech-to-Text**: Utilizes browser Web Speech API `webkitSpeechRecognition` with dynamic language switching (`ta-IN` for Tamil, `en-IN` for English).
- **Text-to-Speech**: Utilizes `window.speechSynthesis` with voice locale matching and markdown-cleaning audio filters.
- **Typed Fallback**: Seamless typed text fallback for unsupported browsers or noisy environments.

---

## 3. Technology Stack Summary

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons, React Router 6 |
| **Local Storage** | IndexedDB (Dexie.js / idb) |
| **Backend API** | FastAPI, Python 3.12, Pydantic v2, Uvicorn |
| **Database** | PostgreSQL 16 (BYTEA encrypted storage) + SQLite dev fallback |
| **ORM & Models** | SQLAlchemy 2.0 |
| **Cryptography** | Python `cryptography` library (AES-256-GCM), hashlib (SHA-256), bcrypt |
| **Voice Processing** | Web Speech API (STT & TTS) with `en-IN` and `ta-IN` |
| **Deployment** | Docker, Docker Compose |
