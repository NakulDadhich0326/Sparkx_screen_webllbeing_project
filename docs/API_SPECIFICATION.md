# SPARKX REST API Specification

**Base URL:** `http://localhost:8080/api`  
**Authentication:** Bearer Token (JWT standard)

---

### 1. System Health
* **Endpoint:** `GET /status`
* **Response:**
```json
{
  "status": "online",
  "team": "SPARKX",
  "hackathon": "SPhINX'26 - Government Engineering College Ajmer",
  "project": "Digital Wellbeing and Screen Time Coach for Students",
  "version": "1.0.0"
}
```

---

### 2. Authentication (Phone Number / Credentials)
* **Endpoint:** `POST /auth/login`
* **Request:**
```json
{
  "phoneOrEmail": "+91 98765 43210",
  "name": "Nakul Dadhich"
}
```
* **Response:**
```json
{
  "success": true,
  "token": "jwt_mock_sparkx_token_2026",
  "user": {
    "name": "Nakul Dadhich",
    "phone": "+91 98765 43210",
    "streakDays": 5,
    "focusCoins": 340,
    "consistencyScore": 92
  }
}
```

---

### 3. Focus Sessions

#### Start Session
* **Endpoint:** `POST /sessions/start`
* **Request:**
```json
{
  "subject": "Compiler Design Unit 3",
  "targetMinutes": 35,
  "cameraEnabled": true
}
```

#### Log Distraction Trigger
* **Endpoint:** `POST /sessions/distraction`
* **Request:**
```json
{
  "sessionId": "sess_101",
  "level": 2,
  "triggerType": "REEL_URL",
  "details": "Opened Instagram Reels"
}
```

#### Complete Session (30+ Min Streak Rule)
* **Endpoint:** `POST /sessions/complete`
* **Request:**
```json
{
  "sessionId": "sess_101",
  "actualMinutes": 35
}
```
* **Response:**
```json
{
  "success": true,
  "streakAwarded": true,
  "coinsEarned": 120,
  "currentStreak": 6,
  "consistencyScore": 94
}
```

#### Mark Session Broken (Logged, Never Shamed)
* **Endpoint:** `POST /sessions/break`
* **Request:**
```json
{
  "sessionId": "sess_101",
  "reason": "Needed to take an urgent call"
}
```

---

### 4. Privacy Leaderboard
* **Endpoint:** `GET /leaderboard`
* **Privacy Standard:** Only `rank`, `name`, and `consistencyScore` are exposed.
* **Response:**
```json
{
  "success": true,
  "leaderboard": [
    { "rank": 1, "name": "Ankit Kumar Meena", "consistencyScore": 98, "streak": 12 },
    { "rank": 2, "name": "Nakul Dadhich (You)", "consistencyScore": 92, "streak": 5 },
    { "rank": 3, "name": "Bhumika Rawat", "consistencyScore": 89, "streak": 7 }
  ]
}
```
