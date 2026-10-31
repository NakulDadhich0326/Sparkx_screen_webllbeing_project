/**
 * SPARKX Gamification & Consistency Score Engine
 * Created by 1st Year Engineering Students for SPhINX'26 Hackathon
 *
 * Implements:
 * - 1st Day Welcome Reward of 100 Coins (All other initial stats start at 0)
 * - 30+ Minutes Streak Rule from PDF Page 3
 * - Consistency Score (0-100 index)
 * - Study Rewards Redemption Store
 */

class GamificationEngine {
  constructor() {
    this.user = {
      name: 'New Student',
      streakDays: 0,
      focusCoins: 100, // 1st Day Reward!
      consistencyScore: 0,
      totalFocusMinutes: 0,
      doomscrollHoursSaved: 0.0,
      badges: ['🌱 Day 1 Starter']
    };

    this.rewardsStore = [
      { id: 'reward_break', title: '15-Min Guilt-Free Break Pass', cost: 80, icon: '☕', description: 'Take a scheduled guilt-free recharge break without resetting streak.' },
      { id: 'reward_theme', title: 'Cyberpunk Neon Focus Theme', cost: 150, icon: '🎨', description: 'Unlock aesthetic ambient theme for study intervals.' },
      { id: 'reward_badge', title: 'SPhINX Top Performer Badge', cost: 300, icon: '🏆', description: 'Showcase exclusive hackathon consistency badge on profile.' },
      { id: 'reward_coffee', title: 'Campus Canteen Coffee Discount', cost: 500, icon: '🎟️', description: 'Partner coupon for GEC Ajmer campus canteen.' }
    ];

    this._loadProfile();
  }

  async _loadProfile() {
    if (window.apiClient && window.apiClient.currentUser) {
      this.user = window.apiClient.currentUser;
      this.updateUI();
      return;
    }

    if (sessionStorage.getItem('sparkx_session_active') === 'true') {
      const saved = localStorage.getItem('sparkx_logged_user');
      if (saved) {
        try {
          const u = JSON.parse(saved);
          if (u && !u.name.toLowerCase().includes('nakul')) {
            this.user = u;
          }
        } catch (e) {}
      }
    }
    this.updateUI();
  }

  setUser(user) {
    this.user = user;
    this.updateUI();
  }

  _saveProfile() {
    localStorage.setItem('sparkx_logged_user', JSON.stringify(this.user));
    this.updateUI();
  }

  recordCompletedSession(minutes) {
    const isOverThirty = minutes >= 30;
    if (isOverThirty) {
      this.user.streakDays = (this.user.streakDays || 0) + 1;
    }

    const coinsGained = (minutes * 2) + (isOverThirty ? 50 : 0);
    this.user.focusCoins = (this.user.focusCoins || 0) + coinsGained;
    this.user.totalFocusMinutes = (this.user.totalFocusMinutes || 0) + minutes;

    // 1 hour of focused study replaces approx 1.5 hours of doomscrolling
    this.user.doomscrollHoursSaved = parseFloat(((this.user.doomscrollHoursSaved || 0) + (minutes / 60 * 1.5)).toFixed(1));

    // Consistency score bonus
    this.user.consistencyScore = Math.min(99, (this.user.consistencyScore || 0) + (isOverThirty ? 3 : 1));

    this._checkBadgeUnlocks();
    this._saveProfile();
  }

  _checkBadgeUnlocks() {
    if (!this.user.badges) this.user.badges = [];
    if (this.user.streakDays >= 1 && !this.user.badges.includes('🔥 1-Day Streak Unlocked')) {
      this.user.badges.push('🔥 1-Day Streak Unlocked');
    }
    if (this.user.streakDays >= 5 && !this.user.badges.includes('⭐ Streak Master')) {
      this.user.badges.push('⭐ Streak Master');
    }
    if (this.user.totalFocusMinutes >= 60 && !this.user.badges.includes('📚 1-Hour Focus Club')) {
      this.user.badges.push('📚 1-Hour Focus Club');
    }
  }

  redeemReward(rewardId) {
    const item = this.rewardsStore.find(r => r.id === rewardId);
    if (!item) return false;

    if (this.user.focusCoins < item.cost) {
      alert(`⚠️ Not enough coins! You have ${this.user.focusCoins} 🪙, need ${item.cost} 🪙. Complete a 35-min study session to earn more coins!`);
      return false;
    }

    this.user.focusCoins -= item.cost;
    this._saveProfile();
    alert(`🎉 Successfully redeemed: "${item.title}"! Enjoy your reward.`);
    this.renderStore();
    return true;
  }

  updateUI() {
    // Header & Summary metrics
    const streakEl = document.getElementById('metricStreak');
    const coinsEl = document.getElementById('metricCoins');
    const walletCoinsEl = document.getElementById('rewardWalletCoins');
    const scoreEl = document.getElementById('metricConsistencyScore');
    const hoursSavedEl = document.getElementById('metricHoursSaved');
    const totalFocusEl = document.getElementById('metricTotalFocus');
    const headerName = document.getElementById('headerStudentName');

    if (streakEl) streakEl.textContent = `${this.user.streakDays || 0} Days 🔥`;
    if (coinsEl) coinsEl.textContent = `${this.user.focusCoins || 0} 🪙`;
    if (walletCoinsEl) walletCoinsEl.textContent = `${this.user.focusCoins || 0} 🪙`;
    if (scoreEl) scoreEl.textContent = `${this.user.consistencyScore || 0}/100 ⚡`;
    if (hoursSavedEl) hoursSavedEl.textContent = `${(this.user.doomscrollHoursSaved || 0).toFixed(1)}h`;
    if (totalFocusEl) totalFocusEl.textContent = `${((this.user.totalFocusMinutes || 0) / 60).toFixed(1)}h`;
    if (headerName) headerName.textContent = (this.user.name || 'Student').split(' ')[0];

    this.renderStore();
    this.renderBadges();
  }

  renderStore() {
    const storeContainer = document.getElementById('rewardsStoreContainer');
    if (!storeContainer) return;

    storeContainer.innerHTML = this.rewardsStore.map(item => `
      <div class="reward-card ${(this.user.focusCoins || 0) >= item.cost ? 'affordable' : 'locked'}">
        <div class="reward-icon">${item.icon}</div>
        <div class="reward-info">
          <h4>${item.title}</h4>
          <p>${item.description}</p>
        </div>
        <button class="btn-redeem" onclick="window.gamificationEngine.redeemReward('${item.id}')">
          ${item.cost} 🪙
        </button>
      </div>
    `).join('');
  }

  renderBadges() {
    const badgeContainer = document.getElementById('badgesContainer');
    if (!badgeContainer) return;

    badgeContainer.innerHTML = (this.user.badges || ['🌱 Day 1 Starter']).map(badge => `
      <span class="badge-chip">${badge}</span>
    `).join('');
  }
}

window.gamificationEngine = new GamificationEngine();
