# ⚡ SPARKX — Student Digital Wellbeing & Screen Time Coach

[![Hackathon](https://img.shields.io/badge/Hackathon-SPhINX'26-blue.svg)](https://geca.ac.in)
[![Institution](https://img.shields.io/badge/College-GEC_Ajmer-orange.svg)](https://geca.ac.in)
[![Track](https://img.shields.io/badge/Track-1.2_Digital_Wellbeing-emerald.svg)](#problem-statement)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

> **"Spark of Ideas"** — Real-time distraction detection, graduated behavioral interventions, and gamified consistency coaching for college students.

---

## 🏛️ Team Information (SPARKX)
* **Institution:** Government Engineering College Ajmer (GEC Ajmer)
* **Hackathon:** SPhINX'26
* **Problem Statement:** 1.2 Digital Wellbeing and Screen Time Coach for Students
* **Team Members:**
  - 👨‍💻 **Nakul Dadhich** — *Team Leader & System Architecture*
  - 🎨 **Gaurav Kumar** — *PPT Designer & Frontend UX Specialist*
  - 🔬 **Ankit Kumar Meena** — *Researcher & Behavioral Intervention Modeling*
  - 📋 **Bhumika Rawat** — *Representative & Data Privacy / API Synchronization*

---

## 🎯 Problem Statement & Motivation
College and school students lose hours every day to mindless doomscrolling on short-form videos (Instagram Reels, YouTube Shorts, TikTok). Existing screen-time blockers are **easy to bypass** and **psychologically punitive**, resulting in guilt without building lasting study habits.

**The SPARKX Solution:**
Instead of punitive lockouts, SPARKX introduces **graduated mindfulness interventions**, **real-time camera gaze tracking**, and **positive consistency gamification**.

---

## 🌟 Our Three Core Uniqueness Pillars (from Slide 1)

```
                       SPARKX UNIQUENESS
     ┌────────────────────────┼────────────────────────┐
     │                        │                        │
     ▼                        ▼                        ▼
[ Focus Reward ]       [ Live Detection ]     [ Competition Score ]
Win rewards on          Real-time camera       Show progress of
consistency (30+ min    gaze & 10s tab         consistency with
streaks & coins)        distraction catch      privacy guarantee
```

1. **Focus Reward:** Win rewards on consistency. Every focused session awards Focus Coins. Completing sessions of **30+ minutes** unlocks daily streak progression and redeemable study perks.
2. **Live Detection:** Real-time front camera vision AI catches gaze shifts and looking down at phones. If camera access is denied, our **System Failure Fallback** automatically engages a **10-second tab switch grace alert**.
3. **Competition Score:** Tracks student consistency index (0–100). The public leaderboard strictly guarantees **student privacy: only Name and Rank are displayed**.

---

## 🚦 3-Level Escalating Distraction Intervention (from Slide 3)

When a student gets distracted by doomscrolling or tab switching:

```
Distraction Detected
        │
        ├──► Level 1: Gentle Toast Notification ("Reminds your intent / refocus nudge")
        │
        ├──► Level 2: Dim + Breathe (10-Second Mindfulness Pause circle)
        │
        └──► Level 3: Wait + Reason (30-Second Lock requiring typed reason)
                │
                └──► If exited: "Session Marked Broken: Logged, NEVER Shamed!"
```

* **No Punishment Policy:** Broken sessions are recorded gracefully with positive reinforcement. Students are encouraged to take a breath and restart without guilt.

---

## 📱 Mobile Application Features

* **Database-Driven Auth System:** SQLite3 (`sparkx_students.db`) integration allows students to create accounts and log in securely.
* **1st Day Welcome Reward (100 Coins):** When a new student creates an account, all initial stats (streak, consistency score, focus hours) start at **0**, and they are awarded **100 Welcome Focus Coins** immediately to kick off their study journey!
* **Friend Request Notifications (`🔔`):** Header notification bell displays a live pending friend request counter. Students can review incoming requests from college peers and **Accept ✅** or **Decline ❌** directly.
* **1st Year Student-Crafted UI:** Cheerful, high-energy college project aesthetics with tactile 3D buttons, emoji indicators, and authentic hackathon badges.
* **Interval Focus Division:** Pomodoro intervals (25m standard, 35m streak-qualifier, 50m deep work) with sleep-resilient timestamp mathematics.
* **Daily Task Organizer:** Add daily study goals with priority tags (High, Medium, Low) and duration estimates; start focus sessions directly from any task with a single tap.
* **Accountability Circles:** Live group presence where friends can see active study status and send real-time cheers (☕ Coffee, 🔥 Fire, ✋ High Five, 🎯 Focus Nudge).
* **Rewards Redemption Store:** Spend Focus Coins on guilt-free breaks, ambient study themes, and campus canteen coffee discounts.
* **Synthesized Web Audio:** Custom soothing sound cues (chimes, breath metronome, completion fanfares) with zero external MP3 dependencies.

---

## 💻 Companion Chrome Extension (Manifest V3)

* **Background Service Worker:** Uses `chrome.alarms` with stored timestamps to survive service worker sleeping states.
* **URL Weight Classifier:** **Shorts & Reels count DOUBLE (weight = 2.0)** and are only tracked when the tab is visible and focused.
* **Privacy & Reliability:** Only domain names and durations are evaluated — never sensitive page content. Works locally even when offline.

---

## 📂 Repository Structure

```
sparkx-digital-wellbeing/
├── mobile-app/                     # Mobile Web PWA / Phone Application
│   ├── index.html                  # Responsive Smartphone Application UI
│   ├── manifest.json               # Progressive Web App Manifest
│   ├── service-worker.js           # Offline caching & timer persistence
│   ├── css/
│   │   ├── style.css               # 1st-year student project mobile theme & tactile 3D buttons
│   │   └── interventions.css       # L1 Toast, L2 Dim+Breathe, L3 Wait+Reason
│   └── js/
│       ├── app.js                  # Master app controller, Auth dialog & Notifications
│       ├── session-timer.js        # Timestamp-based Pomodoro engine
│       ├── distraction-detector.js # WebRTC camera AI & 10s tab fallback
│       ├── intervention-manager.js # 3-tier escalating intervention pipeline
│       ├── task-manager.js         # Daily study task organizer
│       ├── gamification.js         # 100 coin Day-1 bonus, 0-streak logic & perks store
│       ├── group-sync.js           # Live peer presence & privacy leaderboard
│       ├── api-client.js           # SQLite3 REST API client with offline database fallback
│       └── sound-effects.js        # Web Audio synthesized soundscapes
├── backend/                        # Dual Backend Options (Python & Node.js)
│   ├── database.py                 # SQLite3 Database manager (sparkx_students.db)
│   ├── sparkx_students.db          # Persistent SQLite database file
│   ├── server.py                   # Python 3 HTTP REST server with SQLite3
│   ├── server.js                   # Node.js + Express server
│   └── package.json                # Node.js dependencies
├── chrome-extension/               # Companion Chrome Extension (Manifest V3)
│   ├── manifest.json               # Manifest V3 specification
│   ├── background.js               # Service worker with chrome.alarms
│   ├── content.js                  # Weighted URL classifier (Shorts/Reels 2x)
│   ├── popup.html                  # Extension popup
│   └── popup.js                    # Extension popup state sync
├── docs/                           # Documentation & Presentation Artifacts
│   ├── ARCHITECTURE.md             # Technical architecture details
│   ├── API_SPECIFICATION.md        # REST API reference
│   └── HACKATHON_PITCH.md          # 3-minute pitch script for judges
├── run_mobile_app.bat              # One-click Windows runner
├── run_mobile_app.sh               # Mac/Linux runner
└── README.md                       # Main documentation
```

---

## 🚀 How to Run the Application

### Running with Python (Zero-dependency)
SPARKX includes a standard-library Python backend that requires **no external packages**:

```bash
# From the project root:
cd 
python backend/server.py
```
Open **[http://localhost:8080](http://localhost:8080)** in your browser!

---



---

### 📲 How to Test on a Physical Smartphone (Same Wi-Fi)
1. Find your computer's local IP address (e.g. `192.168.1.15`).
2. Run `python backend/server.py`.
3. On your phone's browser (Safari or Chrome), visit:
   ```
   http://<YOUR_LOCAL_IP>:8080
   ```
4. **Install as Mobile App (PWA):** Tap the browser menu (`Share` on iOS or `⋮` on Android) and select **"Add to Home Screen"**. The app will now launch full-screen like a native mobile app!

---

### 🧩 How to Load the Chrome Extension
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Toggle **Developer mode** (top-right corner).
3. Click **Load unpacked** and select the `chrome-extension` folder in this repository.
4. Pin the SPARKX icon to your browser bar.

---

## 🛡️ Data Privacy Standard
As mandated by the SPhINX'26 problem statement:
* Student accounts are authenticated securely via phone number or credentials.
* **Strict Privacy Isolation:** The public competition leaderboard only exposes student **Name** and **Rank / Consistency Score**.
* No contact numbers, personal study logs, or web histories are ever made public.

---

## 🏆 SPhINX'26 Hackathon Demo Sequence for Judges
1. **Focus Ring:** Start a 35-minute study session to demonstrate the 30+ minute streak rule.
2. **Vision AI:** Tap **"Enable Front Camera"** to initialize real-time gaze tracking.
3. **Trigger Interventions:** Tap **"Simulate Reel"** to see Level 1 Gentle Toast, Level 2 Dim + Breathe, and Level 3 Wait + Reason.
4. **System Fallback:** Deny or turn off camera; switch tabs to witness the **10-second grace countdown alert**.
5. **Study Circles:** Open the **Groups** tab to inspect live peers and send virtual coffee ☕.
6. **Privacy Leaderboard:** Review the leaderboard to verify student privacy compliance.

---
*Built by Team SPARKX for SPhINX'26 Hackathon.*
