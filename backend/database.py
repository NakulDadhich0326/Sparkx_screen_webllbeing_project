"""
SPARKX Student Database Manager (SQLite3)
Created for SPhINX'26 Hackathon | Government Engineering College Ajmer
Team: SPARKX (Nakul Dadhich, Gaurav Kumar, Ankit Kumar Meena, Bhumika Rawat)

Features:
- Pure SQLite3 database integration (sparkx_students.db)
- Clean database with NO pre-added users (starts with 0 users!)
- Student Signup & Sign In authentication
- 1st Day Welcome Reward of 100 Coins (All other initial stats start at 0!)
- Friend Request Notifications & Peer Accountability Circles
- Task management & Pomodoro session tracking
"""

import sqlite3
import os
import json
import time
import datetime
import uuid

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sparkx_students.db")

def get_connection():
    """Connects to SQLite database and returns connection with dict row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_database():
    """Initializes tables for student accounts, sessions, tasks, and friend requests without seeding any pre-added user."""
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Users Table (Starts empty!)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        college TEXT DEFAULT 'Government Engineering College Ajmer',
        streakDays INTEGER DEFAULT 0,
        focusCoins INTEGER DEFAULT 100,
        consistencyScore INTEGER DEFAULT 0,
        totalFocusMinutes INTEGER DEFAULT 0,
        doomscrollHoursSaved REAL DEFAULT 0.0,
        badges TEXT DEFAULT '["🌱 1st Day Starter"]',
        isFirstDayRewardClaimed INTEGER DEFAULT 1,
        createdAt TEXT NOT NULL
    )
    """)

    # 2. Tasks Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        title TEXT NOT NULL,
        priority TEXT DEFAULT 'MEDIUM',
        estimatedMinutes INTEGER DEFAULT 25,
        completed INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL
    )
    """)

    # 3. Sessions Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        subject TEXT NOT NULL,
        targetMinutes INTEGER NOT NULL,
        actualMinutes INTEGER DEFAULT 0,
        status TEXT DEFAULT 'ACTIVE',
        distractionsCount INTEGER DEFAULT 0,
        cameraEnabled INTEGER DEFAULT 1,
        streakAwarded INTEGER DEFAULT 0,
        completedAt TEXT,
        breakReason TEXT,
        startedAt TEXT NOT NULL
    )
    """)

    # 4. Friend Requests Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS friend_requests (
        id TEXT PRIMARY KEY,
        toUserId TEXT NOT NULL,
        fromName TEXT NOT NULL,
        fromCollege TEXT,
        fromAvatar TEXT DEFAULT '👨‍🎓',
        message TEXT,
        status TEXT DEFAULT 'PENDING',
        createdAt TEXT NOT NULL
    )
    """)

    # 5. Friends / Study Circles Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS friends (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        friendName TEXT NOT NULL,
        friendCollege TEXT,
        currentTask TEXT DEFAULT 'Focused Study Session',
        durationMinutes INTEGER DEFAULT 20,
        status TEXT DEFAULT 'In Focus 🔥'
    )
    """)

    conn.commit()
    conn.close()
    print("[SPARKX DB] Clean SQLite database initialized at:", DB_PATH)

# ----------------- AUTH (SIGN UP & SIGN IN) -----------------

def signup_user(name, phone, password, college="GEC Ajmer (1st Year)"):
    """
    Registers a brand new student account in SQLite database.
    - All initial stats start at 0: streakDays=0, consistencyScore=0, totalFocusMinutes=0, doomscrollHoursSaved=0.0
    - 1st Day Reward: 100 Focus Coins!
    """
    conn = get_connection()
    cursor = conn.cursor()

    phone_clean = str(phone).strip().replace(" ", "").replace("-", "")

    cursor.execute("SELECT id FROM users WHERE phone = ?", (phone_clean,))
    existing = cursor.fetchone()
    if existing:
        conn.close()
        return {"success": False, "error": "An account with this phone number already exists! Please Sign In."}

    user_id = f"student_{int(time.time())}"
    now = datetime.datetime.utcnow().isoformat() + "Z"

    # All initial stats 0, and 100 Day-1 Reward Coins!
    initial_coins = 100
    initial_streak = 0
    initial_score = 0
    initial_minutes = 0
    initial_saved = 0.0
    initial_badges = json.dumps(["🌱 1st Day Starter"])

    cursor.execute("""
    INSERT INTO users (id, name, phone, password, college, streakDays, focusCoins, consistencyScore, totalFocusMinutes, doomscrollHoursSaved, badges, isFirstDayRewardClaimed, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id,
        name.strip(),
        phone_clean,
        password.strip(),
        college.strip() or "GEC Ajmer (1st Year)",
        initial_streak,
        initial_coins,
        initial_score,
        initial_minutes,
        initial_saved,
        initial_badges,
        1,
        now
    ))

    # Add 1 friendly incoming study squad friend request for the new student so notification bell has an alert!
    cursor.execute("INSERT INTO friend_requests VALUES (?, ?, ?, ?, ?, ?, ?, ?)", (
        f"freq_{int(time.time())}_1",
        user_id,
        "Gaurav Kumar (1st Year CS)",
        "GEC Ajmer",
        "👨‍🎨",
        "Hey! Welcome to SPARKX! Let's connect for daily focus study sessions!",
        "PENDING",
        now
    ))

    # Create 2 starter study tasks for this student
    cursor.execute("INSERT INTO tasks VALUES (?, ?, ?, ?, ?, ?, ?)",
        (f"task_{int(time.time())}_1", user_id, "Complete 1st Focus Study Session (35 Mins)", "HIGH", 35, 0, now))
    cursor.execute("INSERT INTO tasks VALUES (?, ?, ?, ?, ?, ?, ?)",
        (f"task_{int(time.time())}_2", user_id, "Organize Daily College Study Checklist", "MEDIUM", 20, 0, now))

    conn.commit()

    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user_row = dict(cursor.fetchone())
    user_row["badges"] = json.loads(user_row["badges"])
    del user_row["password"]

    conn.close()
    return {
        "success": True,
        "message": "Account created in SQLite database! 1st Day Reward of 100 Coins credited!",
        "user": user_row,
        "dayOneReward": 100
    }

def login_user(phone, password):
    """Authenticates student using phone and password from SQLite database."""
    conn = get_connection()
    cursor = conn.cursor()

    phone_clean = str(phone).strip().replace(" ", "").replace("-", "")
    cursor.execute("SELECT * FROM users WHERE phone = ?", (phone_clean,))
    user = cursor.fetchone()

    if not user:
        conn.close()
        return {"success": False, "error": "No account found with this phone number. Please Sign Up!"}

    user_dict = dict(user)
    if user_dict["password"] != password.strip():
        conn.close()
        return {"success": False, "error": "Incorrect password. Please try again!"}

    user_dict["badges"] = json.loads(user_dict["badges"])
    del user_dict["password"]
    conn.close()

    return {
        "success": True,
        "message": f"Welcome back, {user_dict['name']}!",
        "user": user_dict
    }

def get_user_by_id(user_id):
    """Fetches user details from SQLite database."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    if not user:
        return None
    d = dict(user)
    d["badges"] = json.loads(d["badges"])
    del d["password"]
    return d

# ----------------- FRIEND REQUESTS & NOTIFICATIONS -----------------

def get_friend_requests(user_id):
    """Gets pending friend requests for user."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM friend_requests
        WHERE toUserId = ? AND status = 'PENDING'
        ORDER BY createdAt DESC
    """, (user_id,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def respond_friend_request(request_id, action, user_id):
    """Accept or decline a friend request."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM friend_requests WHERE id = ?", (request_id,))
    req = cursor.fetchone()
    if not req:
        conn.close()
        return {"success": False, "error": "Friend request not found"}

    req_dict = dict(req)
    new_status = "ACCEPTED" if action.lower() == "accept" else "DECLINED"
    cursor.execute("UPDATE friend_requests SET status = ? WHERE id = ?", (new_status, request_id))

    if action.lower() == "accept":
        friend_id = f"fr_{int(time.time())}"
        cursor.execute("""
            INSERT INTO friends (id, userId, friendName, friendCollege, currentTask, durationMinutes, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            friend_id,
            user_id,
            req_dict["fromName"],
            req_dict["fromCollege"],
            "Study Accountability Partner",
            20,
            "In Focus 🔥"
        ))

    conn.commit()
    conn.close()
    return {"success": True, "action": new_status, "fromName": req_dict["fromName"]}

def get_user_friends(user_id):
    """Gets study accountability circle friends for user."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM friends WHERE userId = ?", (user_id,))
    friends = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return friends

def send_friend_request(from_user_id, from_name, from_college, target_identifier, message=""):
    """Sends a friend request to a classmate by phone number or name."""
    conn = get_connection()
    cursor = conn.cursor()

    target_clean = str(target_identifier).strip().replace(" ", "").replace("-", "")
    cursor.execute("SELECT * FROM users WHERE phone = ? OR name LIKE ?", (target_clean, f"%{target_identifier.strip()}%"))
    target = cursor.fetchone()

    req_id = f"freq_{int(time.time())}_{uuid.uuid4().hex[:6]}"
    now = datetime.datetime.utcnow().isoformat() + "Z"

    if target:
        target_dict = dict(target)
        to_user_id = target_dict["id"]
        to_name = target_dict["name"]
    else:
        to_user_id = f"invited_{target_clean}"
        to_name = target_identifier.strip()

    # Check if already sent
    cursor.execute("SELECT id FROM friend_requests WHERE toUserId = ? AND fromName = ? AND status = 'PENDING'", (to_user_id, from_name))
    if cursor.fetchone():
        conn.close()
        return {"success": False, "error": f"Friend request already pending for {to_name}!"}

    cursor.execute("""
        INSERT INTO friend_requests (id, toUserId, fromName, fromCollege, fromAvatar, message, status, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)
    """, (req_id, to_user_id, from_name, from_college, '👨‍🎓', message or "Hey! Let's build study streaks together in SPARKX!", now))

    conn.commit()
    conn.close()
    return {
        "success": True,
        "message": f"Friend request sent to {to_name}! 🚀",
        "request": {
            "id": req_id,
            "toName": to_name,
            "status": "PENDING",
            "message": message,
            "createdAt": now
        }
    }

def get_sent_friend_requests(from_name):
    """Returns list of requests sent by this student."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM friend_requests
        WHERE fromName = ?
        ORDER BY createdAt DESC
    """, (from_name,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def update_user_profile(user_id, name, college):
    """Updates student profile in SQLite database."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET name = ?, college = ? WHERE id = ?", (name.strip(), college.strip(), user_id))
    conn.commit()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    updated = cursor.fetchone()
    conn.close()
    if not updated:
        return None
    d = dict(updated)
    d["badges"] = json.loads(d["badges"])
    del d["password"]
    return d

# ----------------- TASKS -----------------

def get_tasks_for_user(user_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tasks WHERE userId = ? ORDER BY createdAt DESC", (user_id,))
    tasks = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return tasks

def create_task_for_user(user_id, title, priority, estimated_minutes):
    conn = get_connection()
    cursor = conn.cursor()
    task_id = f"task_{int(time.time())}"
    now = datetime.datetime.utcnow().isoformat() + "Z"
    cursor.execute("""
        INSERT INTO tasks (id, userId, title, priority, estimatedMinutes, completed, createdAt)
        VALUES (?, ?, ?, ?, ?, 0, ?)
    """, (task_id, user_id, title, priority, estimated_minutes, now))
    conn.commit()
    cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
    new_task = dict(cursor.fetchone())
    conn.close()
    return new_task

def toggle_task_status(task_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT completed FROM tasks WHERE id = ?", (task_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
    new_val = 0 if row["completed"] else 1
    cursor.execute("UPDATE tasks SET completed = ? WHERE id = ?", (new_val, task_id))
    conn.commit()
    cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
    updated = dict(cursor.fetchone())
    conn.close()
    return updated

# ----------------- SESSION COMPLETION & REWARDS -----------------

def complete_user_session(user_id, actual_minutes):
    """Updates user stats upon session completion according to 30+ min streak rule."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        return None

    user_dict = dict(user)
    streak_awarded = actual_minutes >= 30
    new_streak = user_dict["streakDays"] + (1 if streak_awarded else 0)

    coins_earned = (actual_minutes * 2) + (50 if streak_awarded else 0)
    new_coins = user_dict["focusCoins"] + coins_earned
    new_minutes = user_dict["totalFocusMinutes"] + actual_minutes
    new_saved = round(user_dict["doomscrollHoursSaved"] + (actual_minutes / 60.0 * 1.5), 1)
    new_score = min(99, user_dict["consistencyScore"] + (3 if streak_awarded else 1))

    cursor.execute("""
        UPDATE users
        SET streakDays = ?, focusCoins = ?, consistencyScore = ?, totalFocusMinutes = ?, doomscrollHoursSaved = ?
        WHERE id = ?
    """, (new_streak, new_coins, new_score, new_minutes, new_saved, user_id))
    conn.commit()

    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    updated_user = dict(cursor.fetchone())
    updated_user["badges"] = json.loads(updated_user["badges"])
    del updated_user["password"]
    conn.close()

    return {
        "user": updated_user,
        "streakAwarded": streak_awarded,
        "coinsEarned": coins_earned
    }

def get_privacy_leaderboard():
    """Returns sanitized leaderboard (strictly Name and Rank/Score only)."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT name, consistencyScore, streakDays
        FROM users
        ORDER BY consistencyScore DESC, streakDays DESC
        LIMIT 10
    """)
    rows = cursor.fetchall()
    conn.close()

    leaderboard = []
    for rank, r in enumerate(rows, start=1):
        leaderboard.append({
            "rank": rank,
            "name": r["name"],
            "consistencyScore": r["consistencyScore"],
            "streak": r["streakDays"]
        })
    return leaderboard

if __name__ == "__main__":
    init_database()
