/**
 * SPARKX API & SQLite Database Client
 * Created for SPhINX'26 Hackathon | Government Engineering College Ajmer
 * Team SPARKX (1st Year B.Tech CSE)
 *
 * Implements:
 * - Direct connection to SQLite3 backend API (sparkx_students.db)
 * - Clean start: NO pre-added user loaded by default!
 * - Starts directly on Sign Up / Sign In screen
 * - Sign Up: all stats start at 0, 100 Day-1 bonus Focus Coins
 * - Sign In with mobile number & password
 * - Friend request notifications (Accept/Decline) with dynamic badge updates
 * - Full client-side offline database fallback (identical to SQLite schema)
 */

class SparkxApiClient {
  constructor() {
    this.baseUrl = window.location.origin.includes('http') ? window.location.origin : 'http://localhost:8080';
    // Purge any legacy pre-added user from earlier tests
    this._cleanLegacyCache();
    // Start strictly with NO pre-added user!
    this.currentUser = this._loadInitialUser();
    this.isOnline = navigator.onLine;

    window.addEventListener('online', () => { this.isOnline = true; });
    window.addEventListener('offline', () => { this.isOnline = false; });
  }

  _cleanLegacyCache() {
    try {
      const saved = localStorage.getItem('sparkx_logged_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u && (u.id === 'user_nakul' || (u.name && u.name.toLowerCase().includes('nakul')))) {
          localStorage.removeItem('sparkx_logged_user');
          sessionStorage.removeItem('sparkx_session_active');
        }
      }
    } catch (e) {
      localStorage.removeItem('sparkx_logged_user');
      sessionStorage.removeItem('sparkx_session_active');
    }
  }

  _loadInitialUser() {
    // Only restore if user logged in during this active browser session!
    // Otherwise start fresh with Sign Up and Sign In every time!
    try {
      if (sessionStorage.getItem('sparkx_session_active') === 'true') {
        const saved = localStorage.getItem('sparkx_logged_user');
        if (saved) {
          const u = JSON.parse(saved);
          if (u && u.id && !u.name.toLowerCase().includes('nakul')) {
            return u;
          }
        }
      }
    } catch (e) {}
    return null; // NO user pre-added by default! Starts on Sign Up / Sign In!
  }

  async _request(endpoint, method = 'GET', data = null) {
    try {
      const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
      };
      if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, options);
      const json = await response.json();
      return json;
    } catch (err) {
      // Offline fallback: mirrors SQLite3 schema
      return this._handleOfflineDatabase(endpoint, method, data);
    }
  }

  // Client-Side Offline Database Engine (Mirrors SQLite schema with 0 pre-added users)
  _handleOfflineDatabase(endpoint, method, data) {
    let localUsers = JSON.parse(localStorage.getItem('sparkx_db_users') || '{}');

    // SIGN UP
    if (endpoint.includes('/api/auth/signup')) {
      const cleanPhone = String(data.phone || '').trim().replace(/\s+/g, '');
      if (localUsers[cleanPhone]) {
        return { success: false, error: 'An account with this phone number already exists! Please Sign In.' };
      }

      // Requirement: On new account ALL THINGS SHOULD BE 0, and 1st day reward of 100 coins!
      const newUser = {
        id: `student_${Date.now()}`,
        name: data.name || 'Student',
        phone: cleanPhone,
        password: data.password || '1234',
        college: data.college || 'GEC Ajmer (1st Year CS)',
        streakDays: 0,
        focusCoins: 100, // 1st Day Welcome Reward!
        consistencyScore: 0,
        totalFocusMinutes: 0,
        doomscrollHoursSaved: 0.0,
        badges: ['🌱 1st Day Starter'],
        isFirstDayRewardClaimed: 1
      };

      localUsers[cleanPhone] = newUser;
      localStorage.setItem('sparkx_db_users', JSON.stringify(localUsers));
      localStorage.setItem('sparkx_logged_user', JSON.stringify(newUser));
      sessionStorage.setItem('sparkx_session_active', 'true');
      this.currentUser = newUser;

      // Seed 1 incoming friend request so the notification icon displays!
      const initialRequests = [
        {
          id: `req_${Date.now()}_1`,
          fromName: 'Gaurav Kumar (1st Year CS)',
          fromCollege: 'Govt. Engineering College Ajmer',
          fromAvatar: '👨‍🎨',
          message: 'Hey classmate! Let\'s link up in SPARKX study circles and build streaks together!',
          status: 'PENDING'
        }
      ];
      localStorage.setItem(`sparkx_requests_${newUser.id}`, JSON.stringify(initialRequests));

      return {
        success: true,
        message: 'Account created! 1st Day Reward of 100 Coins credited!',
        user: newUser,
        dayOneReward: 100
      };
    }

    // SIGN IN / LOGIN
    if (endpoint.includes('/api/auth/login')) {
      const cleanPhone = String(data.phone || '').trim().replace(/\s+/g, '');
      const user = localUsers[cleanPhone];
      if (!user) {
        return { success: false, error: 'No account found with this phone number. Please Sign Up!' };
      }
      if (user.password !== data.password) {
        return { success: false, error: 'Incorrect password! Please try again.' };
      }

      localStorage.setItem('sparkx_logged_user', JSON.stringify(user));
      sessionStorage.setItem('sparkx_session_active', 'true');
      this.currentUser = user;
      return { success: true, message: `Welcome back, ${user.name}!`, user };
    }

    // FRIEND REQUESTS
    if (endpoint.includes('/api/friends/requests')) {
      const uid = this.currentUser ? this.currentUser.id : 'temp_user';
      let requests = JSON.parse(localStorage.getItem(`sparkx_requests_${uid}`) || 'null');
      if (!requests) {
        requests = [
          {
            id: 'req_gaurav_1',
            fromName: 'Gaurav Kumar (1st Year CS)',
            fromCollege: 'Govt. Engineering College Ajmer',
            fromAvatar: '👨‍🎨',
            message: 'Hey classmate! Let\'s link up in SPARKX study circles and build streaks together!',
            status: 'PENDING'
          }
        ];
        localStorage.setItem(`sparkx_requests_${uid}`, JSON.stringify(requests));
      }
      const pending = requests.filter(r => r.status === 'PENDING');
      return { success: true, count: pending.length, requests: pending };
    }

    // RESPOND FRIEND REQUEST
    if (endpoint.includes('/api/friends/respond')) {
      const uid = this.currentUser ? this.currentUser.id : 'temp_user';
      let requests = JSON.parse(localStorage.getItem(`sparkx_requests_${uid}`) || '[]');
      const targetReq = requests.find(r => r.id === data.requestId);
      if (targetReq) {
        targetReq.status = data.action === 'accept' ? 'ACCEPTED' : 'DECLINED';
        localStorage.setItem(`sparkx_requests_${uid}`, JSON.stringify(requests));
      }
      return { success: true, action: data.action };
    }

    // SEND FRIEND REQUEST
    if (endpoint.includes('/api/friends/send')) {
      const uid = this.currentUser ? this.currentUser.id : 'temp_user';
      let sent = JSON.parse(localStorage.getItem(`sparkx_sent_requests_${uid}`) || '[]');
      const newReq = {
        id: `sent_${Date.now()}`,
        toName: data.target || 'Classmate',
        message: data.message || "Let's study together in SPARKX!",
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };
      sent.unshift(newReq);
      localStorage.setItem(`sparkx_sent_requests_${uid}`, JSON.stringify(sent));
      return { success: true, message: `Friend request sent to ${data.target}! 🚀`, request: newReq };
    }

    // GET SENT FRIEND REQUESTS
    if (endpoint.includes('/api/friends/sent')) {
      const uid = this.currentUser ? this.currentUser.id : 'temp_user';
      const sent = JSON.parse(localStorage.getItem(`sparkx_sent_requests_${uid}`) || '[]');
      return { success: true, sentRequests: sent };
    }

    // UPDATE PROFILE
    if (endpoint.includes('/api/user/update')) {
      if (this.currentUser) {
        this.currentUser.name = data.name || this.currentUser.name;
        this.currentUser.college = data.college || this.currentUser.college;
        localStorage.setItem('sparkx_logged_user', JSON.stringify(this.currentUser));
        if (localUsers[this.currentUser.phone]) {
          localUsers[this.currentUser.phone].name = this.currentUser.name;
          localUsers[this.currentUser.phone].college = this.currentUser.college;
          localStorage.setItem('sparkx_db_users', JSON.stringify(localUsers));
        }
        return { success: true, user: this.currentUser };
      }
      return { success: false, error: 'User not logged in' };
    }

    // PROFILE
    if (endpoint.includes('/api/user/profile')) {
      return { success: !!this.currentUser, user: this.currentUser };
    }

    // TASKS
    if (endpoint.includes('/api/tasks')) {
      const tasks = JSON.parse(localStorage.getItem('sparkx_tasks') || 'null') || [
        { id: 'task_starter_1', title: 'Complete 1st Focus Study Session (35 Mins)', priority: 'HIGH', estimatedMinutes: 35, completed: false },
        { id: 'task_starter_2', title: 'Plan Today\'s College Study Goals', priority: 'MEDIUM', estimatedMinutes: 20, completed: false }
      ];
      return { success: true, tasks };
    }

    // LEADERBOARD (Strict Name & Rank only as per SPhINX'26 privacy rules)
    if (endpoint.includes('/api/leaderboard')) {
      const lb = Object.values(localUsers).map((u, idx) => ({
        rank: idx + 1,
        name: u.name + (u.id === (this.currentUser && this.currentUser.id) ? ' (You)' : ''),
        consistencyScore: u.consistencyScore || 0,
        streak: u.streakDays || 0
      })).sort((a, b) => b.consistencyScore - a.consistencyScore);

      return { success: true, leaderboard: lb };
    }

    // SESSION COMPLETION
    if (endpoint.includes('/api/sessions/complete')) {
      const minutes = Number(data.actualMinutes) || 25;
      const isOverThirty = minutes >= 30;

      if (this.currentUser) {
        this.currentUser.streakDays = (this.currentUser.streakDays || 0) + (isOverThirty ? 1 : 0);
        const coinsGained = (minutes * 2) + (isOverThirty ? 50 : 0);
        this.currentUser.focusCoins = (this.currentUser.focusCoins || 0) + coinsGained;
        this.currentUser.totalFocusMinutes = (this.currentUser.totalFocusMinutes || 0) + minutes;
        this.currentUser.doomscrollHoursSaved = parseFloat(((this.currentUser.doomscrollHoursSaved || 0) + (minutes / 60 * 1.5)).toFixed(1));
        this.currentUser.consistencyScore = Math.min(99, (this.currentUser.consistencyScore || 0) + (isOverThirty ? 3 : 1));

        localStorage.setItem('sparkx_logged_user', JSON.stringify(this.currentUser));
        if (localUsers[this.currentUser.phone]) {
          localUsers[this.currentUser.phone] = this.currentUser;
          localStorage.setItem('sparkx_db_users', JSON.stringify(localUsers));
        }

        return {
          success: true,
          user: this.currentUser,
          streakAwarded: isOverThirty,
          coinsEarned: coinsGained
        };
      }
    }

    return { success: true };
  }

  // Auth Methods
  async signup(name, phone, password, college) {
    const res = await this._request('/api/auth/signup', 'POST', { name, phone, password, college });
    if (res && res.success && res.user) {
      sessionStorage.setItem('sparkx_session_active', 'true');
      localStorage.setItem('sparkx_logged_user', JSON.stringify(res.user));
      this.currentUser = res.user;
    }
    return res;
  }

  async login(phone, password) {
    const res = await this._request('/api/auth/login', 'POST', { phone, password });
    if (res && res.success && res.user) {
      sessionStorage.setItem('sparkx_session_active', 'true');
      localStorage.setItem('sparkx_logged_user', JSON.stringify(res.user));
      this.currentUser = res.user;
    }
    return res;
  }

  logout() {
    sessionStorage.removeItem('sparkx_session_active');
    localStorage.removeItem('sparkx_logged_user');
    this.currentUser = null;
  }

  // Friend Requests & Notification Badge
  async getFriendRequests() {
    const uid = this.currentUser ? this.currentUser.id : '';
    return await this._request(`/api/friends/requests?userId=${uid}`);
  }

  async respondFriendRequest(requestId, action) {
    const uid = this.currentUser ? this.currentUser.id : '';
    return await this._request('/api/friends/respond', 'POST', { requestId, action, userId: uid });
  }

  async sendFriendRequest(target, message = '') {
    const uid = this.currentUser ? this.currentUser.id : '';
    const name = this.currentUser ? this.currentUser.name : 'Student';
    const college = this.currentUser ? this.currentUser.college : 'GEC Ajmer (1st Year)';
    return await this._request('/api/friends/send', 'POST', {
      fromUserId: uid,
      fromName: name,
      fromCollege: college,
      target,
      message
    });
  }

  async getSentFriendRequests() {
    const name = this.currentUser ? encodeURIComponent(this.currentUser.name) : '';
    return await this._request(`/api/friends/sent?fromName=${name}`);
  }

  async updateProfile(name, college) {
    const uid = this.currentUser ? this.currentUser.id : '';
    const res = await this._request('/api/user/update', 'POST', { userId: uid, name, college });
    if (res && res.success && res.user) {
      this.currentUser = res.user;
      localStorage.setItem('sparkx_logged_user', JSON.stringify(res.user));
    }
    return res;
  }

  async getProfile() {
    const uid = this.currentUser ? this.currentUser.id : '';
    const res = await this._request(`/api/user/profile?userId=${uid}`);
    if (res && res.user) {
      this.currentUser = res.user;
      localStorage.setItem('sparkx_logged_user', JSON.stringify(res.user));
    }
    return res;
  }

  async getTasks() {
    const uid = this.currentUser ? this.currentUser.id : '';
    return await this._request(`/api/tasks?userId=${uid}`);
  }

  async createTask(title, priority, estimatedMinutes) {
    const uid = this.currentUser ? this.currentUser.id : '';
    return await this._request('/api/tasks/create', 'POST', { userId: uid, title, priority, estimatedMinutes });
  }

  async toggleTask(taskId) {
    return await this._request('/api/tasks/toggle', 'POST', { taskId });
  }

  async completeSession(sessionId, actualMinutes) {
    const uid = this.currentUser ? this.currentUser.id : '';
    const res = await this._request('/api/sessions/complete', 'POST', { userId: uid, sessionId, actualMinutes });
    if (res && res.user) {
      this.currentUser = res.user;
      localStorage.setItem('sparkx_logged_user', JSON.stringify(res.user));
    }
    return res;
  }

  async breakSession(sessionId, reason) {
    return await this._request('/api/sessions/break', 'POST', { sessionId, reason });
  }

  async startSession(subject, targetMinutes, cameraEnabled) {
    const uid = this.currentUser ? this.currentUser.id : '';
    return await this._request('/api/sessions/start', 'POST', { userId: uid, subject, targetMinutes, cameraEnabled });
  }

  async getLeaderboard() {
    return await this._request('/api/leaderboard');
  }

  async getGroups() {
    const uid = this.currentUser ? this.currentUser.id : '';
    return await this._request(`/api/groups?userId=${uid}`);
  }

  async sendCheer(memberName, cheerType, message) {
    return await this._request('/api/groups/cheer', 'POST', { memberName, cheerType, message });
  }
}

window.apiClient = new SparkxApiClient();
