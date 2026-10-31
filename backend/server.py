#!/usr/bin/env python3
"""
SPARKX Digital Wellbeing & Screen Time Coach - Backend Server
Hackathon: SPhINX'26 | Government Engineering College Ajmer
Team: SPARKX (Nakul Dadhich, Gaurav Kumar, Ankit Kumar Meena, Bhumika Rawat)
Problem Statement: 1.2 Digital Wellbeing and Screen Time Coach for Students

Features:
- SQLite3 Database Integration (sparkx_students.db)
- Student Signup & Login System
- 1st Day Welcome Reward of 100 Coins (All other initial stats start at 0)
- Friend Request Notifications & Peer Circles
- Pomodoro Focus Session Sync (30+ min streak rule)
- 3-Level Distraction Interventions
- Privacy-Preserving Leaderboard (Name & Rank Only)
"""

import json
import os
import sys
import time
import uuid
import datetime
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# Import SQLite Database Manager
import database as db

PORT = int(os.environ.get("PORT", 8080))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "mobile-app"))

class SparkxApiHandler(SimpleHTTPRequestHandler):
    """
    HTTP Request Handler serving both the static Mobile Web PWA
    and JSON REST API endpoints backed by SQLite3.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def _send_json_response(self, data, status_code=200):
        response_bytes = json.dumps(data, indent=2).encode('utf-8')
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response_bytes)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
        self.wfile.write(response_bytes)

    def do_OPTIONS(self):
        """Handle CORS pre-flight requests"""
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/"):
            return self._handle_api_get(path, parse_qs(parsed.query))

        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        content_length = int(self.headers.get('Content-Length', 0))
        body = {}
        if content_length > 0:
            raw_body = self.rfile.read(content_length).decode('utf-8')
            try:
                body = json.loads(raw_body)
            except Exception:
                body = {}

        if path.startswith("/api/"):
            return self._handle_api_post(path, body)

        self.send_error(404, "Not Found")

    def _handle_api_get(self, path, query_params):
        user_id = query_params.get("userId", [""])[0]

        if path == "/api/status":
            return self._send_json_response({
                "status": "online",
                "database": "SQLite3 (sparkx_students.db)",
                "team": "SPARKX (Govt. Engineering College Ajmer)",
                "college": "Government Engineering College Ajmer",
                "hackathon": "SPhINX'26",
                "project": "1.2 Digital Wellbeing and Screen Time Coach for Students",
                "version": "4.0.0",
                "serverTime": datetime.datetime.utcnow().isoformat() + "Z"
            })

        # Fetch student profile from SQLite database
        elif path == "/api/user/profile":
            user = db.get_user_by_id(user_id) if user_id else None
            return self._send_json_response({"success": bool(user), "user": user})

        # Fetch tasks from SQLite database
        elif path == "/api/tasks":
            tasks = db.get_tasks_for_user(user_id) if user_id else []
            return self._send_json_response({"success": True, "tasks": tasks})

        # Fetch pending friend requests & notification count
        elif path == "/api/friends/requests":
            requests = db.get_friend_requests(user_id) if user_id else []
            return self._send_json_response({
                "success": True,
                "count": len(requests),
                "requests": requests
            })

        # Fetch sent friend requests
        elif path == "/api/friends/sent":
            from_name = query_params.get("fromName", [""])[0]
            sent_reqs = db.get_sent_friend_requests(from_name) if from_name else []
            return self._send_json_response({"success": True, "sentRequests": sent_reqs})

        # Fetch friends list
        elif path == "/api/friends/list":
            friends = db.get_user_friends(user_id) if user_id else []
            return self._send_json_response({"success": True, "friends": friends})

        # Groups presence
        elif path == "/api/groups":
            friends = db.get_user_friends(user_id) if user_id else []
            active_studying = [
                {"name": f["friendName"], "currentTask": f["currentTask"], "durationMinutes": f["durationMinutes"], "status": f["status"]}
                for f in friends
            ]
            if not active_studying:
                active_studying = [
                    {"name": "Gaurav Kumar (1st Year CS)", "currentTask": "Mobile UI/UX Design", "durationMinutes": 28, "status": "In Focus 🔥"},
                    {"name": "Ankit Kumar Meena", "currentTask": "Research & Gaze Tracking", "durationMinutes": 42, "status": "Deep Flow 🧠"}
                ]
            return self._send_json_response({
                "success": True,
                "groups": [{
                    "id": "group_sparkx",
                    "name": "SPARKX GEC Ajmer Hackers ⚡",
                    "description": "Daily deep work accountability group for SPhINX'26.",
                    "membersCount": len(active_studying) + 1,
                    "activeStudying": active_studying
                }]
            })

        # Strict Privacy Leaderboard from SQLite (Name & Rank only)
        elif path == "/api/leaderboard":
            leaderboard = db.get_privacy_leaderboard()
            return self._send_json_response({
                "success": True,
                "privacyNote": "Complies strictly with SPhINX'26 student privacy rules (Name & Rank only).",
                "leaderboard": leaderboard
            })

        else:
            return self._send_json_response({"error": "Endpoint not found"}, 404)

    def _handle_api_post(self, path, body):
        # 1. Sign Up New Student Account (SQLite Database)
        if path == "/api/auth/signup" or path == "/api/auth/register":
            name = body.get("name", "New Student")
            phone = body.get("phone", "")
            password = body.get("password", "")
            college = body.get("college", "GEC Ajmer (1st Year)")

            if not phone or not password:
                return self._send_json_response({
                    "success": False,
                    "error": "Please provide both phone number and password."
                }, 400)

            result = db.signup_user(name, phone, password, college)
            status_code = 200 if result.get("success") else 400
            return self._send_json_response(result, status_code)

        # 2. Login Student Account (SQLite Database)
        elif path == "/api/auth/login":
            phone = body.get("phone", "")
            password = body.get("password", "")

            if not phone or not password:
                return self._send_json_response({
                    "success": False,
                    "error": "Phone number and password are required to login."
                }, 400)

            result = db.login_user(phone, password)
            status_code = 200 if result.get("success") else 401
            return self._send_json_response(result, status_code)

        # 3. Friend Request: Accept or Decline
        elif path == "/api/friends/respond":
            request_id = body.get("requestId")
            action = body.get("action", "accept")
            user_id = body.get("userId", "")

            result = db.respond_friend_request(request_id, action, user_id)
            return self._send_json_response(result)

        # 3b. Send Friend Request to Classmate
        elif path == "/api/friends/send":
            from_user_id = body.get("fromUserId", "")
            from_name = body.get("fromName", "Student")
            from_college = body.get("fromCollege", "GEC Ajmer (1st Year)")
            target = body.get("target", "")
            message = body.get("message", "")

            if not target:
                return self._send_json_response({"success": False, "error": "Please enter a classmate's name or mobile number."}, 400)

            result = db.send_friend_request(from_user_id, from_name, from_college, target, message)
            status_code = 200 if result.get("success") else 400
            return self._send_json_response(result, status_code)

        # 3c. Update Student Profile
        elif path == "/api/user/update":
            user_id = body.get("userId", "")
            name = body.get("name", "")
            college = body.get("college", "")

            if not user_id or not name:
                return self._send_json_response({"success": False, "error": "Name cannot be empty."}, 400)

            updated_user = db.update_user_profile(user_id, name, college)
            if updated_user:
                return self._send_json_response({"success": True, "user": updated_user})
            return self._send_json_response({"success": False, "error": "User not found."}, 404)

        # 4. Task Management: Add Task into SQLite
        elif path == "/api/tasks/create":
            user_id = body.get("userId", "")
            title = body.get("title", "Study Session")
            priority = body.get("priority", "MEDIUM")
            estimated_minutes = int(body.get("estimatedMinutes", 25))

            new_task = db.create_task_for_user(user_id, title, priority, estimated_minutes)
            return self._send_json_response({"success": True, "task": new_task})

        # 5. Task Management: Toggle Task in SQLite
        elif path == "/api/tasks/toggle":
            task_id = body.get("taskId")
            updated = db.toggle_task_status(task_id)
            if updated:
                return self._send_json_response({"success": True, "task": updated})
            return self._send_json_response({"error": "Task not found"}, 404)

        # 6. Focus Session: Complete (30+ min streak rule + Coin calculation in SQLite)
        elif path == "/api/sessions/complete":
            user_id = body.get("userId", "")
            actual_minutes = int(body.get("actualMinutes", 25))

            result = db.complete_user_session(user_id, actual_minutes)
            if result:
                return self._send_json_response({
                    "success": True,
                    "message": "Focus session logged into SQLite database! High-five for staying locked in! 🚀",
                    "user": result["user"],
                    "streakAwarded": result["streakAwarded"],
                    "coinsEarned": result["coinsEarned"]
                })
            return self._send_json_response({"error": "User not found"}, 404)

        # 7. Focus Session: Break (Logged, Never Shamed)
        elif path == "/api/sessions/break":
            return self._send_json_response({
                "success": True,
                "status": "BROKEN",
                "message": "Session recorded with kindness. No streak shame or guilt! Take a breath and return when ready."
            })

        # 8. Focus Session: Log Distraction
        elif path == "/api/sessions/distraction":
            return self._send_json_response({
                "success": True,
                "level": body.get("level", 1),
                "action": "Intervention triggered"
            })

        # 9. Send Peer Cheer / Nudge
        elif path == "/api/groups/cheer":
            return self._send_json_response({
                "success": True,
                "message": f"Cheer sent to {body.get('to', 'Friend')}! ☕"
            })

        else:
            return self._send_json_response({"error": "Unknown POST route"}, 404)

def run_server():
    db.init_database()
    server_address = ('0.0.0.0', PORT)
    httpd = HTTPServer(server_address, SparkxApiHandler)
    
    local_ip = "127.0.0.1"
    try:
        import socket
        local_ip = socket.gethostbyname(socket.gethostname())
    except Exception:
        pass

    print("=" * 70, flush=True)
    print("⚡ SPARKX DIGITAL WELLBEING & SCREEN TIME COACH (v5.0)", flush=True)
    print("   Institution: Government Engineering College Ajmer", flush=True)
    print("   Hackathon:   SPhINX'26 | Track 1.2 Digital Wellbeing", flush=True)
    print("   Team:        SPARKX (1st Year B.Tech CSE)", flush=True)
    print("   Database:    SQLite3 (backend/sparkx_students.db)", flush=True)
    print("-" * 70, flush=True)
    print(f"   🖥️  Desktop URL:   http://localhost:{PORT}/index.html", flush=True)
    print(f"   📱 Mobile Wi-Fi:  http://{local_ip}:{PORT}/index.html", flush=True)
    print(f"   💾 REST API:      http://localhost:{PORT}/api/status", flush=True)
    print("=" * 70, flush=True)
    print("💡 Notes:", flush=True)
    print("   * App starts strictly on Sign Up / Sign In screen.", flush=True)
    print("   * Zero pre-seeded users. All initial stats start at 0.", flush=True)
    print("   * Day 1 Reward: 100 Focus Coins awarded upon account creation.", flush=True)
    print("   * Friend requests & notification bell (🔔) ready.", flush=True)
    print("=" * 70, flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping SPARKX server gracefully.", flush=True)
        httpd.server_close()

if __name__ == "__main__":
    run_server()
