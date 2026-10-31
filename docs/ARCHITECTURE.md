# SPARKX System Architecture & Technical Specification

**Event:** SPhINX'26 Hackathon  
**Institution:** Government Engineering College Ajmer  
**Team:** SPARKX (Nakul Dadhich, Gaurav Kumar, Ankit Kumar Meena, Bhumika Rawat)  
**Problem Statement:** 1.2 Digital Wellbeing and Screen Time Coach for Students  

---

## 1. Architectural Overview

SPARKX is designed to break student doomscrolling habits without punitive shame. Existing screen time blockers fail because they are trivial to bypass and psychologically punishing. SPARKX replaces punitive blocking with **graduated, mindfulness-based friction** and **positive consistency gamification**.

```
                           +------------------------------+
                           |  Student Starts Focus Goal   |
                           +--------------+---------------+
                                          |
                                          v
                    +--------------------------------------------+
                    |        Session Synchronization Node        |
                    |        (Node.js / Express or Python)       |
                    +---------------------+----------------------+
                                          |
                      +-------------------+-------------------+
                      |                                       |
                      v                                       v
          +-----------------------+               +-----------------------+
          |   Mobile Phone App    |               |   Chrome Extension    |
          |  (WebRTC Vision AI /  |               | (Manifest V3 Alarms & |
          |   Tab Fallback Guard) |               |  URL Classification)  |
          +-----------+-----------+               +-----------+-----------+
                      |                                       |
                      +-------------------+-------------------+
                                          |
                                          v
                              [ Distraction Detected? ]
                                          |
                         +----------------+----------------+
                         |                                 |
                        YES                                NO
                         |                                 |
                         v                                 v
          +------------------------------+     +-----------------------+
          |  3-Level Escalation Pipeline |     |   Session Completed   |
          |  - L1: Gentle Toast (Intent) |     | - 30+ Min Streak Rule |
          |  - L2: Dim+Breathe (10s)     |     | - Focus Coins Awarded |
          |  - L3: Wait+Reason (30s Lock)|     | - Group Cheer Sync    |
          +--------------+---------------+     +-----------------------+
                         |
           [ Abandoned / Closed Early? ]
                         |
                         v
          +------------------------------+
          | Session Marked Broken        |
          | - Logged Gracefully          |
          | - NEVER Shamed / Zero Guilt  |
          +------------------------------+
```

---

## 2. Core Pillars & Specifications

### Pillar 1: Focus Reward (Consistency Gamification)
* **Streak Criterion:** Following the rule in Slide 3, only sessions **>= 30 minutes** qualify towards the daily streak counter.
* **Focus Coins:** 2 coins earned per focused minute, plus a 50-coin milestone bonus upon completing a 30+ minute session.
* **Redemption Store:** Coins are redeemable for positive study habits:
  - 15-Minute Guilt-Free Break Pass
  - Aesthetic Ambient Focus Themes
  - SPhINX'26 Consistency Leaderboard Badge
  - Campus Canteen Coffee vouchers

### Pillar 2: Live Detection & System Failure Fallback
* **Front Camera Computer Vision:** WebRTC canvas frame analysis runs lightweight luminance and bounding gaze checks every 800ms. It flags head turns, looking down at secondary smartphones, or desk absence.
* **System Failure Fallback (PDF Page 2):**
  > *"On denied permission of camera, the system will check the location of that current opened tab from that it can detect the distraction, and give an alert for 10 seconds."*
  - If camera permissions are denied or unavailable, SPARKX automatically switches to **Tab Guard Fallback Mode**.
  - When the student switches tabs or blurs the app, an audio-visual **10-Second Grace Alert** triggers. If the student returns before 10 seconds expire, the session is saved; otherwise, the escalation pipeline triggers.

### Pillar 3: Competition Score (Privacy-First Leaderboard)
* **Score Formulation:** Consistency Score (0–100) measures daily frequency, 30+ min streak length, and low distraction count.
* **Strict Privacy Guarantee (PDF Page 2):**
  > *"And there is no more information of the user in the leaderboard except name and rank."*
  - The public leaderboard strips all private phone numbers, emails, browsing logs, or session details. Only student **Name**, **Rank**, and **Consistency Score** are broadcast.

---

## 3. Escalating Intervention Pipeline

1. **Level 1 (Gentle Toast):** Re-anchors attention to the student's stated goal (*"Is this reel worth breaking your 5-day streak?"*). Plays a soft sine chime.
2. **Level 2 (Dim + Breathe):** Full-screen 10-second mindfulness pause. An expanding/contracting breath guide circle helps students inhale and exhale, dissipating the dopamine urge.
3. **Level 3 (Wait + Reason):** A 30-second delay lock. The student cannot act on impulse immediately and must reflect by typing an honest reason why they need to leave focus.
4. **Session Broken (Non-Punitive):** If the student chooses to stop, SPARKX logs the entry with positive reinforcement. **No punitive deductions, no public shaming.**

---

## 4. Sleep-Resilient Timer Engine

Standard JavaScript `setInterval` drifts or halts when mobile browsers throttle background tabs or enter battery-saving sleep. SPARKX resolves this by storing UTC timestamps (`startedTimestamp`) in `localStorage` and `chrome.storage.local`. Upon waking, elapsed time is computed via:

$$\Delta t = \lfloor t_{\text{current}} - t_{\text{start}} \rfloor$$

Timers survive phone screen locks and Chrome service worker sleeping states without losing precision.
