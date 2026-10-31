/**
 * SPARKX Focus Session & Pomodoro Timer Engine
 * Implements:
 * - Interval focus division (25m, 50m, custom target minutes + short breaks)
 * - Sleep-proof timestamp architecture (survives worker/browser sleeps)
 * - 30+ Minutes Streak Rule from PDF Page 3
 * - Safe Logging & Non-punitive reinforcement for broken sessions
 */

class SessionTimer {
  constructor() {
    this.activeSession = null;
    this.timerInterval = null;
    this.targetSeconds = 25 * 60;
    this.elapsedSeconds = 0;
    this.isRunning = false;

    // Callbacks
    this.onTick = null;
    this.onComplete = null;
    this.onBreak = null;

    this._restorePersistedSession();
  }

  // Restore session if page refreshed / device woke up from sleep
  _restorePersistedSession() {
    const saved = localStorage.getItem('sparkx_active_session');
    if (!saved) return;

    try {
      const data = JSON.parse(saved);
      if (data && data.status === 'ACTIVE') {
        const now = Math.floor(Date.now() / 1000);
        const elapsedSinceStart = now - data.startedTimestamp;

        this.activeSession = data;
        this.targetSeconds = data.targetMinutes * 60;
        this.elapsedSeconds = Math.min(elapsedSinceStart, this.targetSeconds);

        if (this.elapsedSeconds >= this.targetSeconds) {
          // Finished while sleeping
          this.completeSession();
        } else {
          this.start(data.subject, data.targetMinutes, true);
        }
      }
    } catch (e) {
      localStorage.removeItem('sparkx_active_session');
    }
  }

  start(subject = 'Focused Study Session', targetMinutes = 25, isResuming = false) {
    if (!isResuming) {
      this.targetSeconds = targetMinutes * 60;
      this.elapsedSeconds = 0;
      this.activeSession = {
        id: `sess_${Date.now()}`,
        subject: subject,
        targetMinutes: targetMinutes,
        startedTimestamp: Math.floor(Date.now() / 1000),
        status: 'ACTIVE'
      };
      localStorage.setItem('sparkx_active_session', JSON.stringify(this.activeSession));

      if (window.apiClient) {
        window.apiClient.startSession(subject, targetMinutes, true);
      }
    }

    this.isRunning = true;
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      // Timestamp calculation guarantees accuracy even if the mobile tab was backgrounded!
      const currentEpoch = Math.floor(Date.now() / 1000);
      this.elapsedSeconds = currentEpoch - this.activeSession.startedTimestamp;

      if (this.onTick) {
        this.onTick(this.getRemainingSeconds(), this.elapsedSeconds, this.getProgressRatio());
      }

      if (this.elapsedSeconds >= this.targetSeconds) {
        this.completeSession();
      }
    }, 1000);
  }

  pause() {
    this.isRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  getRemainingSeconds() {
    return Math.max(0, this.targetSeconds - this.elapsedSeconds);
  }

  getProgressRatio() {
    return Math.min(1.0, this.elapsedSeconds / this.targetSeconds);
  }

  // Session Completed Flow (Slide 3: "Update streak 30+ minutes count")
  async completeSession() {
    this.pause();
    const actualMinutes = Math.floor(this.elapsedSeconds / 60);

    if (window.soundController) {
      window.soundController.playSessionCompleted();
    }

    let completionResult = {
      streakAwarded: actualMinutes >= 30,
      coinsEarned: actualMinutes * 2 + (actualMinutes >= 30 ? 50 : 0)
    };

    if (window.apiClient && this.activeSession) {
      completionResult = await window.apiClient.completeSession(this.activeSession.id, actualMinutes);
    }

    if (window.gamificationEngine) {
      window.gamificationEngine.recordCompletedSession(actualMinutes);
    }

    localStorage.removeItem('sparkx_active_session');
    const completedSessionRef = this.activeSession;
    this.activeSession = null;

    if (this.onComplete) {
      this.onComplete(completedSessionRef, actualMinutes, completionResult);
    }
  }

  // PDF Page 3: "Session Marked broken: Logged, never shamed"
  async markSessionBroken(reason) {
    this.pause();
    const elapsedMinutes = Math.floor(this.elapsedSeconds / 60);

    if (window.apiClient && this.activeSession) {
      await window.apiClient.breakSession(this.activeSession.id, reason);
    }

    localStorage.removeItem('sparkx_active_session');
    const brokenSessionRef = this.activeSession;
    this.activeSession = null;

    if (this.onBreak) {
      this.onBreak(brokenSessionRef, elapsedMinutes, reason);
    }
  }
}

window.SessionTimer = SessionTimer;
