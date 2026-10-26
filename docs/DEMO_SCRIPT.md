# HerCare 3-Minute Live Hackathon Demo Script

This script provides second-by-second stage directions and spoken lines for presenting HerCare during Round 2 judging.

---

## Demo Timing & Stage Sequence

```
[0:00 - 0:20] Hook & Mission: Why Privacy-First & Tamil Voice
      |
[0:20 - 0:40] Instant Demo OTP Login (Zero SMS delay)
      |
[0:40 - 1:00] Tamil Selection & Conversational Onboarding (Nickname "Gargi")
      |
[1:00 - 1:35] The Star Dashboard: Menstrual Dial, Monthly Calendar, Quick Cards, Chart
      |
[1:35 - 2:00] Bilingual Voice AI: Mild Cramp Relief + Mandatory Disclaimer
      |
[2:00 - 2:20] Voice Symptom Confirmation Barrier (Human-in-the-Loop Save to IndexedDB)
      |
[2:20 - 2:40] Emergency Safety Engine: Red Flag Detection & 1-Tap 108/112 Hotlines
      |
[2:40 - 3:00] Privacy Vault: Local-First IndexedDB, JSON Export, Disaster Wipe
```

---

### Segment 1: Introduction & Mission (0:00 – 0:20)
- **Presenter Spoken:**
  > "Judges, reproductive health data is among the most intimate information a woman generates. Yet most commercial period apps leak cycle dates and mood logs to commercial cloud servers.
  >
  > Today, we present **HerCare** — a Privacy-First, Multilingual, Voice-Enabled AI Menstrual Companion built on the CIA triad. It works 100% offline using IndexedDB, supports natural Tamil and English voice interactions, and encrypts optional cloud sync using AES-256-GCM."

---

### Segment 2: Development Demo OTP Login (0:20 – 0:40)
- **Action:** Open `http://localhost:5173/login`. Tap **"Judge Demo Fill: +919876543210"**. Click **"Continue with OTP"**.
- **On OTP Screen:** Point out the 5-minute countdown and 3-attempt limit. Click **"Autofill"** (Demo OTP: `123456`) and click **"Verify & Enter"**.
- **Presenter Spoken:**
  > "For this hackathon, we built a development Demo OTP engine that salts and hashes verification codes using SHA-256. It enforces a 3-attempt lockout and zero plaintext storage in the database."

---

### Segment 3: Tamil Selection & Conversational Onboarding (0:40 – 1:00)
- **Action:** The conversational onboarding wizard appears. Tap **"தமிழ் (Tamil)"** or keep English. Enter nickname **"Gargi"**. Select 28 days cycle length, tap **"Continue"** through the short flow.
- **Presenter Spoken:**
  > "HerCare speaks the user's language. In onboarding, our AI companion introduces herself and learns the user's preferred nickname, food dislikes, and movement comfort without asking for unnecessary identifying details."

---

### Segment 4: The Star Home Dashboard (1:00 – 1:35)
- **Action:** Arrive at the Home Dashboard. Show:
  1. Top greeting: *"Hi, Gargi"* with cute chibi avatar and bell reminder.
  2. The **Circular Menstrual Dial**: 28-day perimeter dial, vivid pink menstrual arc with blood droplets, curved label, and *"Day 1 • Low chance of pregnancy"*.
  3. The **3 Quick Action Cards**: Mood, Cramps, Drugs. Tap **"Mood"** to open the cute chibi check-in modal.
  4. The **Monthly Calendar** with the 4 legend cards (*Periods, Mucus, Ovulation, Looming*) and *"Add Symptoms"* button.
  5. The **Cycle History Graph** with trend curves and the *"Regular"* status badge.
- **Presenter Spoken:**
  > "Our Home Dashboard is engineered for calm, accessible daily check-ins. The circular menstrual dial gives an immediate visual rhythm of the cycle. Quick action cards allow 1-tap mood and symptom logging, and the cycle history graph provides gentle trend analysis without diagnosing medical conditions."

---

### Segment 5: Bilingual Voice AI & Wellness Guidance (1:35 – 2:00)
- **Action:** Tap the **"AI Companion"** tab or Quick Pill.
- **Spoken query into mic or tap pill:**
  - Tamil: *"எனக்கு லேசான வயிற்று வலி இருக்கு"* (or English: *"How can I soothe mild cramps today?"*)
- **Observation:** The AI responds empathetically in the selected language, audio plays aloud via Web Speech API, and the mandatory disclaimer is highlighted:
  - *"இது பொதுவான நல்வாழ்வு வழிகாட்டுதல் மட்டுமே, மருத்துவ ஆலோசனை அல்ல."*
- **Presenter Spoken:**
  > "HerCare uses Web Speech API for low-latency speech-to-text and text-to-speech. Notice that HerCare immediately suggests low-risk relief like chamomile tea and warmth, while strictly enforcing our mandatory non-diagnostic disclaimer."

---

### Segment 6: Human-in-the-Loop Symptom Confirmation (2:00 – 2:20)
- **Action:** Notice the interactive **Symptom Confirmation Card** that pops up beneath the AI response:
  > *"I understood that you're experiencing Cramps. Would you like to save this symptom for today?"*
  > Tap **"Yes, Save to Device Log"**.
- **Observation:** The AI confirms *"Your entry has been saved on this device"*, and the entry is stored locally in IndexedDB.
- **Presenter Spoken:**
  > "A crucial cybersecurity and clinical safety requirement: HerCare never commits voice-transcribed symptoms without explicit confirmation. This human-in-the-loop barrier prevents speech recognition hallucinations from corrupting the user's medical timeline."

---

### Segment 7: Urgent Red-Flag Emergency Detection (2:20 – 2:40)
- **Action:** Tap the red flag pill or speak:
  - *"கடுமையான ரத்தப்போக்கு மயக்கம் வருது"* (or English: *"I am soaking two pads every hour and feel dizzy"*)
- **Observation:** The **Urgent Medical Alert** banner appears instantly with red borders and one-touch direct phone buttons for **108** (Ambulance), **112** (Emergency), and **1091** (Women's Crisis).
- **Presenter Spoken:**
  > "Notice how the deterministic safety engine bypassed standard wellness chat. It recognized severe hemorrhage and fainting, immediately prioritized patient safety, and surfaced direct 1-tap emergency hotlines without attempting diagnosis."

---

### Segment 8: Privacy Vault & CIA Verification (2:40 – 3:00)
- **Action:** Navigate to the **"Privacy & Security"** tab.
  - Show **Cloud Sync OFF by default**.
  - Show the **AES-256-GCM** encryption explanation.
  - Click **"Export My Local Data (JSON)"** — a structured JSON file downloads immediately.
  - Click **"Wipe Local Data"** — IndexedDB is instantly purged.
- **Presenter Spoken:**
  > "In our Privacy Vault, users have complete autonomy. Cloud sync is disabled by default. If enabled, sensitive fields are encrypted with AES-256-GCM before PostgreSQL storage. And with one click, users can export or wipe all data.
  >
  > HerCare proves that empathetic health AI and uncompromising privacy can live together. Thank you!"
