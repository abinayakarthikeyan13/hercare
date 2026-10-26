# HerCare Troubleshooting & Judge Q&A

This guide covers common development questions, resolution steps, and judge questions for Round 2.

---

## 1. Quick Troubleshooting Guide

### Port Already in Use (Port 8000 or 5173)
- **FastAPI Backend (Port 8000)**:
  ```powershell
  # Check which process is holding port 8000
  Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess
  # Or start Uvicorn on another port
  .\backend\venv\Scripts\python.exe -m uvicorn app.main:app --port 8001
  ```
- **Vite Frontend (Port 5173)**:
  ```powershell
  cd frontend
  npm.cmd run dev -- --port 5174
  ```

### Web Speech API Not Speaking / Not Listening
- **Browser Compatibility**: Web Speech API (`SpeechRecognition`) is natively supported on Chromium-based browsers (Google Chrome, Microsoft Edge, Brave) and Safari. On unsupported browsers, HerCare automatically reveals a clean typed text fallback.
- **Microphone Permissions**: Ensure microphone permission is granted in the browser address bar icon (`site settings` -> `Microphone` -> `Allow`).
- **Noisy Environment During Demo**: Use the pre-configured **Demo Flow Scenarios** quick pills in the chat screen for 1-tap test triggers without auditorium background noise interference.

### Database Connection Warning
- HerCare includes an automatic SQLite development fallback (`hercare_dev.db`) if PostgreSQL is not running locally.
- For Dockerized PostgreSQL:
  ```powershell
  docker compose up -d db
  ```

---

## 2. Judge Questions & Strong Technical Answers

### Q1: What problem does HerCare solve?
**Answer:** Traditional period tracking apps monetize intimate health data by uploading cycle dates, sexual activity, and moods to cloud servers where data can be leaked or sold to advertisers. Furthermore, most health tech is English-centric and complex. HerCare solves this by combining **local-first privacy (IndexedDB)** with **bilingual Tamil/English voice interaction**, making menstrual health tracking private, safe, and accessible to non-English speakers.

### Q2: What makes HerCare different from a normal period tracker?
**Answer:** Three architectural differentiators:
1. **Local-First by Default**: Cycle and symptom data lives primarily on the user's phone in IndexedDB.
2. **Clinical Safety Engine**: Strict non-diagnostic guardrails, mandatory wellness disclaimers, and deterministic emergency symptom detection that routes red flags to 108/112 helplines.
3. **Bilingual Voice AI with Confirmation Barrier**: Users can speak in Tamil or English; the app never logs voice transcripts automatically without human confirmation.

### Q3: How does Tamil voice interaction work?
**Answer:** We leverage the browser's Web Speech API (`webkitSpeechRecognition` with locale `ta-IN`). User Tamil voice audio is transcribed to text, processed through our backend safety and AI layer, and the response is synthesized back into Tamil audio using `window.speechSynthesis` with Tamil voice mapping.

### Q4: How is user privacy protected?
**Answer:** Through the CIA triad:
- Cloud sync is disabled by default.
- If enabled, data is encrypted using AES-256-GCM before storage in PostgreSQL `BYTEA` columns.
- Plaintext OTPs and encryption keys are never stored in the database.
- Users have single-click "Export My Data" and "Wipe Local Data" controls.

### Q5: What does AES-256-GCM do?
**Answer:** AES-256-GCM is an Authenticated Encryption with Associated Data (AEAD) algorithm. It provides both confidentiality (encrypting sensitive fields like cycle dates and notes into unreadable ciphertext) and integrity (generating a 16-byte authentication tag that detects any tampering or bit-flipping upon decryption).

### Q6: Where is the encryption key stored?
**Answer:** The master 32-byte encryption key is injected solely through secure environment variables (`FIELD_ENCRYPTION_KEY`) in the backend runtime. It is never checked into source control and never stored in PostgreSQL.

### Q7: What does the CIA triad mean in this project?
**Answer:**
- **Confidentiality**: Zero cloud leakage by default, AES-256-GCM encrypted cloud storage, salted OTP hashes, bcrypt passwords, and JWT session tokens.
- **Integrity**: GCM authentication tags, SHA-256 record checksums to detect database tampering, strict Pydantic schemas, and symptom confirmation barriers.
- **Availability**: Local-first IndexedDB storage so the app works offline without internet, plus JSON data portability and disaster recovery purge.

### Q8: Why use PostgreSQL if you have IndexedDB?
**Answer:** IndexedDB handles local-first on-device availability. PostgreSQL provides optional, user-consented encrypted cloud backup so users can restore their data if they switch phones or reinstall their browser, without sacrificing confidentiality.

### Q9: What happens when the internet is unavailable?
**Answer:** HerCare continues to work seamlessly! All cycle tracking, calendar views, symptom logging, history graphs, and local data vaults operate 100% offline in IndexedDB.

### Q10: Does HerCare diagnose PCOS, Endometriosis, or other conditions?
**Answer:** **No, absolutely not.** HerCare enforces strict safety rules in both input and output layers. If a user asks "Do I have PCOS?", the AI explicitly explains that only a qualified physician can diagnose conditions through ultrasound and lab tests, provides low-risk lifestyle comfort tips, and attaches the mandatory disclaimer: *"This is general wellness guidance, not medical advice."*

### Q11: How does the emergency-symptom detector work?
**Answer:** We implemented a deterministic pattern-matching engine in `safety_guardrails.py` that screens for high-risk red flags (heavy hemorrhage, fainting, acute pelvic pain, pregnancy complications) *before* calling any LLM. When triggered, it bypasses wellness chat and immediately displays the **Urgent Medical Alert** with 1-tap phone dialers for **108** (Ambulance), **112** (Emergency), and **1091** (Women's Crisis).

### Q12: How do you prevent one user accessing another user's data?
**Answer:** Every database operation in FastAPI validates the JWT identity of `current_user.id` and queries strictly with ownership filters (`filter(Record.user_id == current_user.id)`). Changing a record ID in a URL returns a `404 Not Found`.

### Q13: What limitations remain before production deployment?
**Answer:**
1. Upgrading from development Demo OTP mode to an authorized SMS gateway (such as MSG91 or Twilio Verify) and WhatsApp Business OTP.
2. Integrating a hardware security module (AWS KMS / GCP Cloud KMS) for production master key rotation.
3. Conducting formal clinical validation and usability testing across rural and urban linguistic demographics.
