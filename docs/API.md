# HerCare REST API Specification

Base URL: `http://localhost:8000` (or `http://localhost:8000/api/v1`)

All endpoints producing JSON responses return standardized schemas. Authenticated endpoints require a Bearer token in the `Authorization` header:
`Authorization: Bearer <jwt_access_token>`

---

## 1. Authentication Endpoints

### `POST /auth/send-otp`
Generates a 6-digit challenge code. In development demo mode (`DEMO_OTP_MODE=true`), the OTP is printed to the server terminal.
- **Request Body**:
  ```json
  {
    "phone_number": "+919876543210"
  }
  ```
- **Response** `200 OK`:
  ```json
  {
    "status": "success",
    "message": "OTP challenge generated. Valid for 5 minutes.",
    "phone_number": "+919876543210",
    "expires_in_seconds": 300,
    "demo_otp": "123456"
  }
  ```

### `POST /auth/verify-otp`
Verifies the submitted 6-digit OTP against the salted hash. Maximum 3 incorrect attempts.
- **Request Body**:
  ```json
  {
    "phone_number": "+919876543210",
    "otp_code": "123456"
  }
  ```
- **Response** `200 OK`:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1Ni...",
    "token_type": "bearer",
    "expires_in": 86400,
    "user_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "is_new_user": false
  }
  ```

### `POST /auth/register-password`
Optional alternative registration using password.
- **Request Body**:
  ```json
  {
    "phone_number": "+919876543210",
    "password": "StrongPassword123!"
  }
  ```

### `POST /auth/login-password`
Log in with phone number and bcrypt-verified password.
- **Request Body**:
  ```json
  {
    "phone_number": "+919876543210",
    "password": "StrongPassword123!"
  }
  ```

### `GET /auth/me`
Retrieve authenticated user profile and cloud sync consent status.
- **Headers**: `Authorization: Bearer <token>`
- **Response** `200 OK`:
  ```json
  {
    "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "phone_number": "+919876543210",
    "cloud_sync_enabled": false,
    "preferred_language": "ta"
  }
  ```

### `POST /auth/logout`
Invalidates client session.

---

## 2. Profile & Preferences Endpoints

### `GET /preferences` (or `GET /profile`)
Retrieves decrypted user onboarding profile and verifies SHA-256 integrity hash.
- **Response** `200 OK`:
  ```json
  {
    "nickname": "Gargi",
    "food_dislikes": ["spicy", "dairy"],
    "exercise_pref": "yoga",
    "energy_level": "moderate",
    "record_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "integrity_verified": true,
    "updated_at": "2026-10-19T23:55:00Z"
  }
  ```

### `POST /preferences` (or `PUT /profile`)
Encrypts sensitive preferences with AES-256-GCM and stores in PostgreSQL `BYTEA`.
- **Request Body**:
  ```json
  {
    "nickname": "Gargi",
    "food_dislikes": ["spicy", "dairy"],
    "exercise_pref": "yoga",
    "energy_level": "moderate"
  }
  ```

---

## 3. Cycle Tracking Endpoints

### `GET /cycles`
Retrieves all cycle records for the authenticated user, decrypted server-side.
- **Response** `200 OK`: List of `CycleResponse` objects.

### `POST /cycles`
Logs a new cycle entry (requires cloud sync consent enabled).
- **Request Body**:
  ```json
  {
    "start_date": "2026-10-01",
    "end_date": "2026-10-05",
    "cycle_length": 28,
    "period_length": 5,
    "symptoms": ["cramps", "fatigue"],
    "mood": "calm",
    "flow": "medium",
    "notes": "Drank ginger tea"
  }
  ```

### `PUT /cycles/{record_id}`
Updates an existing cycle record with ownership validation.

### `DELETE /cycles/{record_id}`
Permanently deletes a cycle record.

---

## 4. Symptom Tracking Endpoints

### `GET /symptoms`
Retrieves all daily symptom check-ins.

### `POST /symptoms`
Creates an encrypted daily symptom check-in entry.
- **Request Body**:
  ```json
  {
    "date": "2026-10-19",
    "symptoms": ["cramps", "headache"],
    "mood": "happy",
    "energy_level": "moderate",
    "pain_level": 2,
    "flow": null,
    "supplements_taken": true,
    "notes": "Took iron and chamomile tea"
  }
  ```

### `PUT /symptoms/{record_id}`
Updates an existing symptom record.

### `DELETE /symptoms/{record_id}`
Deletes a symptom check-in record.

---

## 5. AI Health Companion & Safety Endpoints

### `POST /chat`
Conversational endpoint for the HerCare AI Companion.
- **Request Body**:
  ```json
  {
    "message": "எனக்கு லேசான வயிற்று வலி இருக்கு",
    "language": "ta",
    "context": {
      "cycle_phase": "menstrual",
      "day_of_cycle": 1
    }
  }
  ```
- **Response** `200 OK`:
  ```json
  {
    "message": "அன்பான தோழி, மாதவிடாய் தொடக்கத்தில் லேசான அடிவயிற்று வலி ஏற்படுவது இயல்பானதே...",
    "language": "ta",
    "is_emergency": false,
    "emergency_category": null,
    "disclaimer": "இது பொதுவான நல்வாழ்வு வழிகாட்டுதல் மட்டுமே, மருத்துவ ஆலோசனை அல்ல.",
    "session_id": "uuid",
    "created_at": "2026-10-19T23:56:00Z"
  }
  ```

### `POST /safety/check`
Independent, deterministic safety scanner for red flag symptoms.
- **Request Body**:
  ```json
  {
    "text": "I am soaking two pads an hour and feeling dizzy",
    "language": "en"
  }
  ```
- **Response** `200 OK`:
  ```json
  {
    "is_emergency": true,
    "emergency_category": "SEVERE_HEMORRHAGE",
    "advisory_message": "🚨 URGENT MEDICAL ALERT: The symptoms you described require immediate medical evaluation...",
    "emergency_hotlines": [
      { "name": "Medical Ambulance Service", "number": "108", "description": "24/7 Ambulance" },
      { "name": "National Emergency Helpline", "number": "112", "description": "Police, Fire, Ambulance" }
    ],
    "disclaimer": "This is general wellness guidance, not medical advice."
  }
  ```

### `GET /emergency/hotlines`
Returns official national emergency contact numbers (`108`, `112`, `1091`).

---

## 6. Privacy & Cloud Sync Endpoints

### `GET /privacy/status` (or `GET /sync/status`)
Returns CIA Triad audit report and cloud sync toggle status.

### `POST /privacy/cloud-sync-consent` (or `POST /sync/toggle`)
Enables or disables cloud synchronization with explicit consent.
- **Request Body**: `{ "enabled": true }`

### `POST /privacy/export` (or `GET /sync/export`)
Right to Portability: exports all health records, preferences, and conversations in structured JSON format.

### `DELETE /privacy/data` (or `DELETE /sync/delete`)
Right to Be Forgotten: permanently purges all encrypted health records, preferences, and chat logs from PostgreSQL.

### `DELETE /privacy/chat-history`
Clears all encrypted conversation logs.
