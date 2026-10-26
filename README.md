# HerCare 🌸

**Privacy-First, Multilingual, Voice-Enabled AI Menstrual Health Companion**  


HerCare empowers women with personalized, culturally sensitive, and clinically safe menstrual health guidance in **Tamil (தமிழ்)** and **English**. Built with a local-first **CIA Triad** (Confidentiality, Integrity, Availability) security architecture, HerCare ensures that intimate health data remains strictly private and protected.

---

## 🎨 Design Reference & UI Implementation

HerCare’s Home Dashboard directly recreates the uploaded design reference:
- **Soft Pastel Lavender Canvas** (`#B6AEDF`) with crisp white smartphone surfaces (`#FFFFFF`).
- **Circular Menstrual Dial**: 28-day perimeter dial, vivid pink menstrual arc (`#FF668A`), blood droplets, curved label, and inner cycle day & estimate indicator.
- **Monthly & Weekly Strip Calendar**: Complete calendar with indicator dots for *Periods*, *Mucus*, *Ovulation*, and *Looming*, plus 4 legend cards.
- **Quick Action Cards**: 3 interactive cards for *Mood*, *Cramps*, and *Drugs/Supplements*.
- **Daily Check-In Drawer**: Cute chibi avatars with expressions for *Calm*, *Happy*, *Anxious*, *Depressed*, *Confused*, *Sad*, *Guilty*, *Sleepy*, symptom chips, pain slider (0–5), and supplement tracking.
- **Cycle History Graph**: Monthly curve (May–Sept) with a highlighted column and *"Regular"* / *"Irregular"* status badge.
- **AI Companion Card**: 2D chibi female avatar with voice trigger and local privacy badge.

---

## 🛡️ Security Architecture (The CIA Triad)

1. **Confidentiality**:
   - **Local-First Default**: All cycle records, symptoms, notes, and chats are saved in the client's browser in **IndexedDB**.
   - **Cloud Sync Disabled by Default**: No health data leaves the device unless the user explicitly opts in.
   - **AES-256-GCM Encryption**: When cloud sync is consented to, records are encrypted using 256-bit AES in Galois/Counter Mode with a unique 12-byte nonce per operation before storage in PostgreSQL `BYTEA` columns.
   - **Salted OTP Hashing**: 6-digit OTP codes are salted and hashed with SHA-256; plain OTPs are never persisted in the database.
   - **Password Security**: Native `bcrypt` with 12 computational work rounds.
   - **Key Isolation**: Master encryption keys are stored exclusively in backend environment variables (`FIELD_ENCRYPTION_KEY`), never stored in PostgreSQL.

2. **Integrity**:
   - **AES-GCM Authentication Tag**: Decryption verifies the 16-byte GCM authentication tag, rejecting tampered ciphertext.
   - **SHA-256 Record Integrity**: Every cycle and preference record computes a deterministic keyed hash over canonical plaintext to detect database tampering.
   - **Pydantic Validation**: Strict schemas validate dates, numbers, and phone numbers.
   - **Human-in-the-Loop Symptom Confirmation**: The app never commits voice-transcribed symptoms without explicit user confirmation via an interactive confirmation card.

3. **Availability**:
   - **100% Offline Capability**: Cycle tracking, symptoms, calendar, and history work without an active internet connection or backend server.
   - **Right to Portability**: Single-click structured JSON export of all personal health data.
   - **Right to Be Forgotten**: Single-click permanent purge of local IndexedDB and cloud PostgreSQL records.
   - **Graceful Fallbacks**: Speech recognition falls back to typed input; external LLM outages fall back to an offline deterministic clinical wellness heuristic engine.

---

## 🚨 Clinical Safety & Emergency Guardrails

- **Non-Diagnostic Policy**: HerCare never diagnoses diseases (e.g. PCOS, Endometriosis) and never prescribes medications or dosages.
- **Mandatory Disclaimer**: Every AI response enforces:
  - English: *"This is general wellness guidance, not medical advice."*
  - Tamil: *"இது பொதுவான நல்வாழ்வு வழிகாட்டுதல் மட்டுமே; மருத்துவ ஆலோசனை அல்ல."*
- **Deterministic Emergency Detection**: Screens input for high-risk red flags (*severe hemorrhage, fainting, acute pelvic pain, pregnancy complications, toxic shock*) before calling any LLM.
- **1-Tap Hotlines**: Immediate emergency dialers for **108** (Ambulance), **112** (National Emergency), and **1091** (Women's Crisis Helpline).

---

## 📱 Application Screens (All 11 Screens Built)

1. **Welcome Screen**: Hero chibi avatar, tagline (*“Your health. Your language. Your data. Your control.”*), Get Started, Login, and language switcher.
2. **Login Screen**: Mobile number, Demo OTP trigger, optional password login, and privacy assurance.
3. **OTP Verification Screen**: 6-digit auto-advancing input, 5-minute countdown, 3-attempt limit, and 1-click Demo Autofill.
4. **Language Selection**: Seamless English and தமிழ் (Tamil) switching across the entire app.
5. **Personalized Onboarding**: Conversational wizard asking for nickname (*"Gargi"*), cycle length, regularity, tracked symptoms, food dislikes, movement preference, and energy level.
6. **Home Dashboard**: Star screen matching the uploaded design reference (Dial, Calendar, Quick Cards, History Graph, AI Companion).
7. **AI Chat Screen**: Bilingual Web Speech API voice input and text-to-speech, interactive symptom confirmation card, emergency alert card, and typed input fallback.
8. **Cycle Tracker Screen**: Detailed period logging, flow intensity, mood chips, symptom chips, historical cycle records with edit and delete controls.
9. **Preferences Screen**: Edit nickname, food dislikes, movement preference, voice speech rate, and language.
10. **Privacy & Security Vault**: Local-first status, cloud sync toggle, AES-256-GCM explanation, Export My Data (JSON), and Wipe Local Data.
11. **Emergency Safety Alert Screen / Modal**: Prominent red flag guidance with direct phone dialers for 108, 112, and 1091.

---

## ⚡ Quickstart Guide

### Option 1: Run Locally (Windows PowerShell)

#### 1. Backend (FastAPI + Python)
```powershell
# Open terminal in hercare/
cd backend

# Create & activate virtual environment (if not already active)
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run backend tests
python -m pytest -v

# Start FastAPI server
python -m uvicorn app.main:app --reload --port 8000
```
- API Documentation: `http://localhost:8000/docs`
- Health Probe: `http://localhost:8000/api/v1/health`

#### 2. Frontend (React + Vite + Tailwind CSS)
```powershell
# Open a second terminal in hercare/
cd frontend

# Install packages
npm.cmd install

# Build verification
npm.cmd run build

# Start Vite dev server
npm.cmd run dev
```
- Web Application: `http://localhost:5173`

---

### Option 2: Run with Docker Compose
```bash
docker-compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API Docs: `http://localhost:8000/docs`
- PostgreSQL: Port `5432` with persistent volume

---

## 🧪 Hackathon Demo Credentials

- **Judge Demo Mobile Number**: `+919876543210` (or tap the 1-click *"Judge Demo Fill"* button)
- **Development Demo OTP**: `123456` (or tap the 1-click *"Autofill"* button)
- **Pre-configured Demo Scenarios**:
  1. *Tamil Greeting & Nickname*: Tap pill `1. வணக்கம் (Nickname)`
  2. *Mild Cramps Guidance*: Tap pill `2. லேசான வலி (Mild Cramps)`
  3. *Emergency Red Flag*: Tap pill `3. அவசர நிலை (Red Flag)` -> triggers 108 / 112 emergency dialers.

---

## 📂 Project Structure

```
hercare/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/        # AvatarChibi.jsx, EmergencyAlertModal.jsx, ProtectedRoute.jsx
│   │   │   ├── dashboard/     # CycleRingDial.jsx, CycleCalendar.jsx, QuickActionCards.jsx,
│   │   │   │                  # CycleHistoryChart.jsx, AiCompanionCard.jsx, MoodSymptomDrawer.jsx
│   │   │   ├── chat/          # ChatInterface.jsx (Voice STT/TTS & Symptom Confirmation)
│   │   │   ├── cycle/         # CycleTracker.jsx (Offline logging, edit & delete)
│   │   │   ├── preferences/   # PreferencesScreen.jsx
│   │   │   ├── security/      # LocalDataVault.jsx (CIA Triad & Export/Wipe)
│   │   │   └── voice/         # VoiceMicButton.jsx
│   │   ├── context/           # AuthContext.jsx, LanguageContext.jsx, CycleContext.jsx
│   │   ├── hooks/             # useSpeechRecognition.js, useSpeechSynthesis.js
│   │   ├── lib/               # db.js (Dexie/idb), api.js, translations.js (EN & TA)
│   │   ├── pages/             # WelcomePage.jsx, LoginPage.jsx, OtpVerifyPage.jsx,
│   │   │                      # OnboardingPage.jsx, DashboardPage.jsx
│   │   ├── App.jsx            # Router and Protected Routes
│   │   └── main.jsx
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── core/              # crypto.py (AES-256-GCM, SHA-256), security.py (bcrypt, JWT), database.py
│   │   ├── models/            # user.py, otp.py, preference.py, cycle.py, symptom.py, chat.py
│   │   ├── schemas/           # auth.py, preference.py, cycle.py, symptom.py, sync.py, ai.py
│   │   ├── services/          # ai_agent.py, safety_guardrails.py, otp_service.py
│   │   ├── routers/           # auth.py, preferences.py, cycles.py, symptoms.py, sync.py, ai.py, health.py
│   │   └── main.py
│   ├── tests/                 # 33 passing pytest tests
│   └── requirements.txt
├── database/
│   └── init.sql               # PostgreSQL schema with BYTEA encrypted columns
├── docs/
│   ├── ARCHITECTURE.md        # Technical architecture & pipeline diagrams
│   ├── SECURITY.md            # CIA Triad mapping & threat model
│   ├── API.md                 # REST API endpoints & payload schemas
│   ├── DEMO_SCRIPT.md         # 3-minute stage directions & presentation script
│   └── TROUBLESHOOTING.md     # Common issues & 13 Judge Q&A answers
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 📖 Additional Documentation
- [Architecture & Data Flow](docs/ARCHITECTURE.md)
- [Security Architecture & CIA Triad](docs/SECURITY.md)
- [REST API Specification](docs/API.md)
- [3-Minute Live Demo Presentation Script](docs/DEMO_SCRIPT.md)
- [Troubleshooting & Judge Q&A](docs/TROUBLESHOOTING.md)

---

## ⚖️ Legal & Medical Disclaimer
HerCare is a general wellness companion prototype designed for educational and hackathon demonstration purposes. HerCare is **not a certified medical device (SaMD)**, does not provide clinical diagnoses, and does not prescribe medications. Users experiencing severe or acute symptoms must seek immediate professional clinical care from qualified physicians or emergency medical services.
