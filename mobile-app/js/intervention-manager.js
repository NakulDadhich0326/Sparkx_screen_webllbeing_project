/**
 * SPARKX 3-Level Escalating Distraction Intervention Pipeline
 * Implements Page 3 Flowchart from SPhINX'26 Presentation:
 *
 * Distraction Triggered
 *   ├── Level 1: Gentle Toast Notification ("Reminds your intent / refocus nudge")
 *   ├── Level 2: Dim + Breathe (10-Second Mindfulness Pause)
 *   └── Level 3: Wait + Reason (30-Second Countdown + Typed Reflection Delay)
 *       └── If abandoned: "Session Marked Broken - Logged, Never Shamed!"
 */

class InterventionManager {
  constructor(sessionController) {
    this.sessionController = sessionController;
    this.currentLevel = 0; // 0: clear, 1: toast, 2: dim+breathe, 3: wait+reason
    this.isInterventionActive = false; // Prevents flooding and duplicate cascading alerts
    this.breatheInterval = null;
    this.waitReasonInterval = null;
    this.toastTimeout = null;

    this._bindElements();
  }

  _bindElements() {
    this.toastElement = document.getElementById('interventionToast');
    this.toastText = document.getElementById('toastMessageText');

    this.dimOverlay = document.getElementById('dimBreatheOverlay');
    this.breatheTimerSpan = document.getElementById('breatheTimerCount');
    this.breatheInstruction = document.getElementById('breatheInstruction');

    this.waitOverlay = document.getElementById('waitReasonOverlay');
    this.waitTimerSpan = document.getElementById('waitTimerCount');
    this.reasonInput = document.getElementById('breakReasonInput');
    this.confirmBreakBtn = document.getElementById('confirmBreakBtn');
    this.resumeFocusBtn = document.getElementById('resumeFocusBtn');

    if (this.confirmBreakBtn) {
      this.confirmBreakBtn.addEventListener('click', () => this._handleAbandonSession());
    }
    if (this.resumeFocusBtn) {
      this.resumeFocusBtn.addEventListener('click', () => this._handleResumeAfterDelay());
    }

    if (this.reasonInput) {
      this.reasonInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (this.secondsRemaining > 0) {
            const originalPlaceholder = this.reasonInput.placeholder;
            this.reasonInput.placeholder = `⏳ Please wait ${this.secondsRemaining}s countdown before locking back in...`;
            setTimeout(() => {
              if (this.reasonInput) this.reasonInput.placeholder = originalPlaceholder;
            }, 2000);
          } else {
            this._handleResumeAfterDelay();
          }
        }
      });

      this.reasonInput.addEventListener('input', () => {
        this.reasonInput.style.borderColor = '#334155';
        this.reasonInput.style.boxShadow = 'none';
      });
    }
  }

  handleDistraction(eventData) {
    // Flood guard: If an intervention is already displaying, ignore duplicate triggers
    if (this.isInterventionActive) {
      console.log('[Intervention] Blocked duplicate trigger while intervention is active:', eventData);
      return;
    }

    this.isInterventionActive = true;
    this.currentEventData = eventData;

    // Pause camera distraction checks while intervention is on screen
    if (window.distractionDetector && typeof window.distractionDetector.pauseForIntervention === 'function') {
      window.distractionDetector.pauseForIntervention();
    }

    this.currentLevel = 3;
    console.log(`[Intervention] Wait + Reason modal triggered:`, eventData);

    // Sync with API
    if (window.apiClient && this.sessionController && this.sessionController.activeSession) {
      window.apiClient.logDistraction(
        this.sessionController.activeSession.id,
        3,
        eventData.type,
        eventData.details
      );
    }

    // Launch SPhINX'26 Level 3: Wait + Typed Reason Countdown
    this._triggerLevel3WaitAndReason(eventData);
  }

  // LEVEL 1: Gentle Toast ("Reminds your intent")
  _triggerLevel1Toast(eventData) {
    if (window.soundController) {
      window.soundController.playGentleNudge();
    }

    const goal = this.sessionController.activeSession ? this.sessionController.activeSession.subject : 'Your study task';
    const detailMsg = eventData.details || 'Distraction detected';

    if (this.toastText) {
      this.toastText.innerHTML = `<strong>Gentle Nudge:</strong> ${detailMsg}. Re-anchoring your intent on <em>"${goal}"</em>. Stay with it! 🧘`;
    }

    if (this.toastElement) {
      this.toastElement.classList.add('show');
      if (this.toastTimeout) clearTimeout(this.toastTimeout);
      this.toastTimeout = setTimeout(() => {
        this.toastElement.classList.remove('show');
        this._finishIntervention();
      }, 5000);
    }
  }

  // LEVEL 2: Dim + Breathe (10-second pause)
  _triggerLevel2DimAndBreathe(eventData) {
    if (window.soundController) {
      window.soundController.playBreathingChime(true);
    }

    let secondsRemaining = 10;
    if (this.breatheTimerSpan) this.breatheTimerSpan.textContent = secondsRemaining;
    if (this.breatheInstruction) this.breatheInstruction.textContent = 'Take a slow, deep breath in...';
    if (this.dimOverlay) this.dimOverlay.classList.add('active');

    if (this.breatheInterval) clearInterval(this.breatheInterval);

    this.breatheInterval = setInterval(() => {
      secondsRemaining -= 1;
      if (this.breatheTimerSpan) this.breatheTimerSpan.textContent = secondsRemaining;

      if (secondsRemaining === 5 && window.soundController) {
        window.soundController.playBreathingChime(false);
        if (this.breatheInstruction) this.breatheInstruction.textContent = 'Slowly exhale... release tension';
      }

      if (secondsRemaining <= 0) {
        clearInterval(this.breatheInterval);
        this.breatheInterval = null;
        if (this.dimOverlay) this.dimOverlay.classList.remove('active');
        if (this.toastElement) {
          if (this.toastText) this.toastText.textContent = 'Mindfulness pause complete. Your focus flow is protected! ✨';
          this.toastElement.classList.add('show');
          setTimeout(() => {
            this.toastElement.classList.remove('show');
            this._finishIntervention();
          }, 3500);
        } else {
          this._finishIntervention();
        }
      }
    }, 1000);
  }

  // LEVEL 3: Wait + Reason (Countdown + Typed Reflection Delay)
  _triggerLevel3WaitAndReason(eventData) {
    if (window.soundController) {
      window.soundController.playEscalationAlert();
    }

    const detailMsg = (eventData && eventData.details) || 'Left study window or not looking at screen';
    const isTimerStopped = eventData && eventData.isTimerStopped;

    const modalIcon = document.querySelector('.wait-header-icon');
    const titleEl = document.querySelector('.wait-title');
    const subtitle = document.querySelector('.wait-subtitle');
    const timerBadge = document.querySelector('.wait-timer-badge');

    if (isTimerStopped) {
      this.secondsRemaining = 0;
      if (modalIcon) modalIcon.textContent = '⏱️';
      if (titleEl) titleEl.textContent = '10s Limit Exceeded — Timer Stopped';
      if (subtitle) {
        subtitle.innerHTML = `⚠️ <strong>Distraction Detected:</strong> ${detailMsg}.<br>You were away from the study window for over 10 seconds. The focus timer stopped automatically.<br><strong>Please enter your reason for leaving & distraction:</strong>`;
      }
      if (timerBadge) {
        timerBadge.innerHTML = '🛑 <strong>Timer Automatically Stopped (10s Away)</strong>';
        timerBadge.style.background = 'rgba(239, 68, 68, 0.15)';
        timerBadge.style.borderColor = 'rgba(239, 68, 68, 0.4)';
        timerBadge.style.color = '#f87171';
      }
      if (this.resumeFocusBtn) {
        this.resumeFocusBtn.disabled = false;
        this.resumeFocusBtn.textContent = 'Resume Study Timer ▶';
      }
    } else {
      const countdown = (eventData && typeof eventData.countdown === 'number') ? eventData.countdown : 10;
      this.secondsRemaining = countdown;

      if (modalIcon) modalIcon.textContent = '🛡️';
      if (titleEl) titleEl.textContent = 'Wait + Typed Reason';
      if (subtitle) {
        subtitle.innerHTML = `⚠️ <strong>Distraction Detected:</strong> ${detailMsg}.<br>Give your brain <strong>${countdown} seconds</strong> pause before acting on impulse. Please enter why you lost focus below:`;
      }
      if (timerBadge) {
        timerBadge.innerHTML = `⏱️ Pause Lock: <span id="waitTimerCount">${this.secondsRemaining}</span>s Remaining`;
        timerBadge.style.background = 'rgba(245, 158, 11, 0.12)';
        timerBadge.style.borderColor = 'rgba(245, 158, 11, 0.3)';
        timerBadge.style.color = '#fbbf24';
      }
      if (this.resumeFocusBtn) {
        this.resumeFocusBtn.disabled = true;
        this.resumeFocusBtn.textContent = `Waiting ${this.secondsRemaining}s Countdown...`;
      }
    }

    if (this.waitOverlay) this.waitOverlay.classList.add('active');

    if (this.reasonInput) {
      this.reasonInput.value = '';
      this.reasonInput.style.borderColor = '#334155';
      this.reasonInput.style.boxShadow = 'none';
      this.reasonInput.placeholder = 'Why did you leave / what distracted you? (e.g. urgent phone call, opened new tab, needed water)...';
      setTimeout(() => {
        if (this.reasonInput) this.reasonInput.focus();
      }, 150);
    }

    if (this.waitReasonInterval) clearInterval(this.waitReasonInterval);

    if (this.secondsRemaining > 0) {
      this.waitReasonInterval = setInterval(() => {
        this.secondsRemaining -= 1;
        const countSpan = document.getElementById('waitTimerCount');
        if (countSpan) countSpan.textContent = Math.max(0, this.secondsRemaining);

        if (this.secondsRemaining > 0) {
          if (this.resumeFocusBtn) {
            this.resumeFocusBtn.disabled = true;
            this.resumeFocusBtn.textContent = `Waiting ${this.secondsRemaining}s Countdown...`;
          }
        } else {
          clearInterval(this.waitReasonInterval);
          this.waitReasonInterval = null;
          if (this.resumeFocusBtn) {
            this.resumeFocusBtn.disabled = false;
            this.resumeFocusBtn.textContent = 'Lock Back In (Resume Focus) 🚀';
          }
          if (this.reasonInput) this.reasonInput.focus();
        }
      }, 1000);
    }
  }

  // Student decides to abandon session (Level 3 break)
  _handleAbandonSession() {
    const reason = (this.reasonInput && this.reasonInput.value.trim()) || 'Needed a break';

    if (this.waitReasonInterval) {
      clearInterval(this.waitReasonInterval);
      this.waitReasonInterval = null;
    }
    if (this.waitOverlay) this.waitOverlay.classList.remove('active');

    // PDF Page 3: "Session Marked broken: Logged, never shamed"
    if (this.sessionController && typeof this.sessionController.markSessionBroken === 'function') {
      this.sessionController.markSessionBroken(reason);
    }
    this.reset();
  }

  // Student enters reason and resumes studying!
  _handleResumeAfterDelay() {
    const reason = (this.reasonInput && this.reasonInput.value.trim()) || '';

    // Enforce asking reason: student must enter a reason before resuming
    if (!reason) {
      if (this.reasonInput) {
        this.reasonInput.style.borderColor = '#ef4444';
        this.reasonInput.style.boxShadow = '0 0 14px rgba(239, 68, 68, 0.7)';
        this.reasonInput.placeholder = '⚠️ Please enter your reason for leaving / distraction before resuming!';
        this.reasonInput.focus();
      }
      return;
    }

    if (this.waitReasonInterval) {
      clearInterval(this.waitReasonInterval);
      this.waitReasonInterval = null;
    }

    if (this.waitOverlay) this.waitOverlay.classList.remove('active');

    // Log reason to database API if active session
    if (window.apiClient && this.sessionController && this.sessionController.activeSession) {
      window.apiClient.logDistraction(
        this.sessionController.activeSession.id,
        3,
        this.currentEventData?.type || 'DISTRACTION',
        reason
      );
    }

    // Automatically resume the focus timer if it was stopped
    if (window.sessionTimer && !window.sessionTimer.isRunning && window.sessionTimer.activeSession) {
      window.sessionTimer.start(
        window.sessionTimer.activeSession.subject,
        window.sessionTimer.activeSession.targetMinutes,
        true // isResuming = true
      );
      const timerStateBadge = document.getElementById('timerStateBadge');
      const pauseFocusBtn = document.getElementById('pauseFocusBtn');
      if (timerStateBadge) {
        timerStateBadge.className = 'timer-state-pill running';
        timerStateBadge.innerHTML = '<span class="beacon-dot"></span> In Focus Flow 🟢';
      }
      if (pauseFocusBtn) {
        pauseFocusBtn.textContent = 'Pause ⏸';
        pauseFocusBtn.classList.remove('paused');
      }
    }

    if (this.toastElement) {
      if (this.toastText) {
        this.toastText.innerHTML = `🛡️ <strong>Focus Re-Anchored:</strong> Reason logged ("<em>${reason}</em>"). Timer resumed — lock back in! 🚀`;
      }
      this.toastElement.classList.add('show');
      setTimeout(() => {
        this.toastElement.classList.remove('show');
        this._finishIntervention();
      }, 4000);
    } else {
      this._finishIntervention();
    }
    this.currentLevel = 1; // Demote back to level 1
  }

  _finishIntervention() {
    this.isInterventionActive = false;
    if (window.distractionDetector && typeof window.distractionDetector.resumeAfterIntervention === 'function') {
      window.distractionDetector.resumeAfterIntervention();
    }
  }

  reset() {
    this.currentLevel = 0;
    this.isInterventionActive = false;
    if (this.breatheInterval) clearInterval(this.breatheInterval);
    if (this.waitReasonInterval) clearInterval(this.waitReasonInterval);
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    if (this.dimOverlay) this.dimOverlay.classList.remove('active');
    if (this.waitOverlay) this.waitOverlay.classList.remove('active');
    if (this.toastElement) this.toastElement.classList.remove('show');
    if (window.distractionDetector && typeof window.distractionDetector.resumeAfterIntervention === 'function') {
      window.distractionDetector.resumeAfterIntervention();
    }
  }
}

window.InterventionManager = InterventionManager;
