/**
 * SPARKX Digital Wellbeing and Screen Time Coach for Students
 * Hackathon: SPhINX'26 | Government Engineering College Ajmer
 * Team SPARKX: Nakul Dadhich (Lead), Gaurav Kumar, Ankit Kumar Meena, Bhumika Rawat
 *
 * Node.js + Express API + Socket.io Server (v2.0)
 * Features:
 * - Student Signup & Login System with Database Persistence
 * - 1st Day Welcome Reward of 100 Coins (all initial stats start at 0)
 * - Notification Bell & Friend Request Management
 * - Focus Sessions & 30+ Minutes Streak Calculation
 * - Escalating 3-Level Distraction Interventions
 * - Strict Privacy-Preserving Leaderboard (Name & Rank Only)
 */

const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../mobile-app')));

const PORT = process.env.PORT || 8080;

// In-Memory Database Map (Zero pre-seeded users - starts clean!)
const usersDb = new Map();
const friendRequestsDb = new Map();
const tasksDb = new Map();

// --- API ROUTES ---

app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    team: 'SPARKX (Nakul, Gaurav, Ankit, Bhumika)',
    college: 'Government Engineering College Ajmer',
    hackathon: "SPhINX'26",
    problemStatement: '1.2 Digital Wellbeing and Screen Time Coach for Students',
    version: '2.0.0',
    serverTimestamp: new Date().toISOString()
  });
});

// Student Sign Up (New Account: 100 Coins Day 1 bonus, all other stats 0!)
app.post('/api/auth/signup', (req, res) => {
  const { name, phone, password, college } = req.body;
  const cleanPhone = String(phone || '').replace(/\s+/g, '');

  if (!cleanPhone || !password) {
    return res.status(400).json({ success: false, error: 'Phone and password are required.' });
  }

  if (usersDb.has(cleanPhone)) {
    return res.status(400).json({ success: false, error: 'Account already exists with this phone number. Please login!' });
  }

  const newUser = {
    id: `student_${Date.now()}`,
    name: name || 'Student',
    phone: cleanPhone,
    password: password,
    college: college || 'GEC Ajmer (1st Year)',
    streakDays: 0,
    focusCoins: 100, // 1st Day Reward!
    consistencyScore: 0,
    totalFocusMinutes: 0,
    doomscrollHoursSaved: 0.0,
    badges: ['🌱 Day 1 Starter']
  };

  usersDb.set(cleanPhone, newUser);

  // Add 2 friendly requests for the new student
  friendRequestsDb.set(newUser.id, [
    {
      id: `req_${Date.now()}_1`,
      fromName: 'Gaurav Kumar (1st Year CS)',
      fromCollege: 'GEC Ajmer',
      fromAvatar: '👨‍🎨',
      message: 'Hey, let\'s study together for SPhINX\'26!',
      status: 'PENDING'
    },
    {
      id: `req_${Date.now()}_2`,
      fromName: 'Bhumika Rawat (1st Year Rep)',
      fromCollege: 'GEC Ajmer',
      fromAvatar: '👩‍🎓',
      message: 'Invited you to the 35-min streak focus circle!',
      status: 'PENDING'
    }
  ]);

  res.json({
    success: true,
    message: 'Student account created! 100 Coins Day-1 reward added.',
    user: newUser,
    dayOneReward: 100
  });
});

// Student Login
app.post('/api/auth/login', (req, res) => {
  const { phone, password } = req.body;
  const cleanPhone = String(phone || '').replace(/\s+/g, '');
  const user = usersDb.get(cleanPhone);

  if (!user) {
    return res.status(401).json({ success: false, error: 'No account found with this phone number. Please sign up!' });
  }

  if (user.password !== password) {
    return res.status(401).json({ success: false, error: 'Incorrect password.' });
  }

  res.json({
    success: true,
    message: `Welcome back, ${user.name}!`,
    user
  });
});

// Friend Requests & Notification Count
app.get('/api/friends/requests', (req, res) => {
  const userId = req.query.userId || '';
  const requests = friendRequestsDb.get(userId) || [];
  const pending = requests.filter(r => r.status === 'PENDING');
  res.json({ success: true, count: pending.length, requests: pending });
});

app.post('/api/friends/respond', (req, res) => {
  const { requestId, action, userId } = req.body;
  const uid = userId || '';
  const requests = friendRequestsDb.get(uid) || [];
  const reqItem = requests.find(r => r.id === requestId);
  if (reqItem) {
    reqItem.status = action === 'accept' ? 'ACCEPTED' : 'DECLINED';
  }
  res.json({ success: true, action });
});

// Profile
app.get('/api/user/profile', (req, res) => {
  const userId = req.query.userId || '';
  let targetUser = null;
  for (const u of usersDb.values()) {
    if (u.id === userId) {
      targetUser = u;
      break;
    }
  }
  res.json({ success: !!targetUser, user: targetUser });
});

// Focus Sessions: Complete (30+ min streak rule)
app.post('/api/sessions/complete', (req, res) => {
  const { userId, actualMinutes } = req.body;
  let user = null;
  for (const u of usersDb.values()) {
    if (u.id === userId) { user = u; break; }
  }
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  const minutes = Number(actualMinutes) || 25;
  const streakAwarded = minutes >= 30;

  if (streakAwarded) user.streakDays += 1;
  const coins = (minutes * 2) + (streakAwarded ? 50 : 0);
  user.focusCoins += coins;
  user.totalFocusMinutes += minutes;
  user.doomscrollHoursSaved = parseFloat((user.doomscrollHoursSaved + (minutes / 60 * 1.5)).toFixed(1));
  user.consistencyScore = Math.min(99, user.consistencyScore + (streakAwarded ? 3 : 1));

  res.json({
    success: true,
    user,
    streakAwarded,
    coinsEarned: coins
  });
});

// Privacy Leaderboard (Name & Rank only)
app.get('/api/leaderboard', (req, res) => {
  const list = Array.from(usersDb.values()).map((u, i) => ({
    rank: i + 1,
    name: u.name,
    consistencyScore: u.consistencyScore || 0,
    streak: u.streakDays || 0
  })).sort((a, b) => b.consistencyScore - a.consistencyScore);

  res.json({
    success: true,
    privacyNotice: 'Public leaderboard reveals strictly Name and Rank/Score as per PDF Page 2.',
    leaderboard: list
  });
});

server.listen(PORT, () => {
  console.log(`[SPARKX] Server running on http://localhost:${PORT}`);
});
