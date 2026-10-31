/**
 * SPARKX Real-Time Distraction Detector (v8.0)
 * SPhINX'26 Hackathon | Government Engineering College Ajmer
 * Team: SPARKX (1st Year B.Tech CSE)
 *
 * Implements:
 * 1. Physical Front-Camera Computer Vision (WebRTC + Edge Canvas Gaze/Posture Analysis)
 * 2. Robust camera error recovery with detailed troubleshooting for browser permissions
 * 3. Immediate Tab Switch & External Link Distraction Detection with live 10-Second Countdown
 * 4. Browser tab title alert with live remaining seconds: "⚠️ (10s) FOCUS LOST! Return to Study!"
 * 5. Audio chime alerts upon leaving the study tab
 * 6. URL & Location launcher for doomscroll apps (Shorts & Reels weighted double)
 * 7. Anti-flooding protection (never freezes camera or loops alert timers)
 */

class DistractionDetector {
  constructor(onDistractionDetected) {
    this.onDistraction = onDistractionDetected; // Callback to trigger intervention
    this.isActive = false;                      // True when focus timer is running
    this.isTabGuardArmed = true;                // Tab switch & link guard always armed once loaded
    this.isPausedForIntervention = false;       // Pauses checks while toast/modal is on screen
    this.cameraStream = null;
    this.videoElement = null;
    this.canvasElement = null;
    this.canvasCtx = null;
    this.detectionInterval = null;

    // Physical Camera State
    this.isCameraPermitted = false;
    this.fallbackModeActive = false;
    this.consecutiveLookDownFrames = 0;
    this.consecutiveLookAwayFrames = 0;
    this.consecutiveAbsenceFrames = 0;
    this.attentionScore = 100;

    // 10-Second Tab Switch / Link Grace Period Countdown
    this.tabSwitchAlertTimer = null;
    this.tabSwitchSecondsLeft = 10;
    this.tabLeftTime = null;
    this.gracePeriodExpired = false;
    this.originalPageTitle = document.title;
    this.currentTriggerReason = 'Tab Switch';

    // Blacklisted Apps / Sites (Shorts & Reels weighted double as per PDF Page 3)
    this.distractionAppList = [
      { name: 'Instagram Reels', domain: 'instagram.com/reels', weight: 2.0, category: 'Short-Form Video' },
      { name: 'YouTube Shorts', domain: 'youtube.com/shorts', weight: 2.0, category: 'Short-Form Video' },
      { name: 'TikTok', domain: 'tiktok.com', weight: 2.0, category: 'Short-Form Video' },
      { name: 'Twitter / X', domain: 'x.com', weight: 1.0, category: 'Social Media' },
      { name: 'Reddit Doomscroll', domain: 'reddit.com', weight: 1.0, category: 'Social Media' },
      { name: 'Netflix / Streaming', domain: 'netflix.com', weight: 1.5, category: 'Entertainment' }
    ];

    this._bindVisibilityEvents();
  }

  // -------------------------------------------------------------
  // TAB SWITCH & LINK DISTRACTION MONITORING (10-SECOND COUNTDOWN)
  // -------------------------------------------------------------
  _bindVisibilityEvents() {
    // 1. Browser Tab Visibility Change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this._handleTabHidden('Switched to Another Browser Tab');
      } else {
        this._handleTabRestored('Returned from Another Browser Tab');
      }
    });

    // 2. Window Blur (e.g. switching window or clicking external link popup)
    window.addEventListener('blur', () => {
      setTimeout(() => {
        if (!document.hasFocus() && !this.tabLeftTime) {
          this._handleTabHidden('Switched Window / Opened External Tab');
        }
      }, 150);
    });

    // 3. Window Focus Restored
    window.addEventListener('focus', () => {
      this._handleTabRestored('Window Regained Focus');
    });

    // 4. Page Hide
    window.addEventListener('pagehide', () => {
      this._handleTabHidden('Navigated Away from Study Tab');
    });
  }

  _handleTabHidden(triggerReason = 'Tab Switched / New Tab Opened') {
    if (this.isPausedForIntervention) return;
    if (this.tabLeftTime) return; // Countdown already running

    this.tabLeftTime = Date.now();
    this.currentTriggerReason = triggerReason;
    this.gracePeriodExpired = false;

    console.warn(`[SPARKX Guard] Student left study window (${triggerReason}). Starting 10-second grace period!`);

    // Play audible alert sound
    if (window.soundController) {
      window.soundController.playEscalationAlert();
    }

    // Engage 10-second alert grace period countdown & title alert
    this._startFallbackCountdown(triggerReason);
  }

  _startFallbackCountdown(triggerReason = 'Tab Switched') {
    if (this.tabSwitchAlertTimer) clearInterval(this.tabSwitchAlertTimer);

    this.tabSwitchSecondsLeft = 10;
    const alertBanner = document.getElementById('cameraFallbackAlert');
    const countdownSpan = document.getElementById('fallbackCountdown');

    if (alertBanner) {
      const titleEl = alertBanner.querySelector('strong');
      const msgEl = alertBanner.querySelector('span');
      if (titleEl) titleEl.textContent = `⚠️ Distraction: ${triggerReason}`;
      if (msgEl) msgEl.textContent = `Return to study window within 10s grace period!`;
      if (countdownSpan) countdownSpan.textContent = this.tabSwitchSecondsLeft;
      alertBanner.classList.add('visible');
    }

    // Set initial title with countdown
    document.title = `⚠️ (10s) RETURN TO STUDY! [SPARKX Focus]`;

    this.tabSwitchAlertTimer = setInterval(() => {
      this.tabSwitchSecondsLeft -= 1;
      if (countdownSpan) countdownSpan.textContent = Math.max(0, this.tabSwitchSecondsLeft);

      // Live countdown visible in browser tab bar!
      if (this.tabSwitchSecondsLeft > 0) {
        document.title = `⚠️ (${this.tabSwitchSecondsLeft}s) RETURN TO STUDY! [SPARKX Focus]`;
      } else {
        document.title = `🚨 (0s) 10s EXPIRED! Timer Stopped!`;
      }

      // If after 10 seconds the student has not come back:
      if (this.tabSwitchSecondsLeft <= 0) {
        clearInterval(this.tabSwitchAlertTimer);
        this.tabSwitchAlertTimer = null;
        this.gracePeriodExpired = true;

        console.warn(`[SPARKX Guard] 10s grace period expired! Student did not return. Automatically stopping timer.`);

        // 1. AUTOMATICALLY STOP/PAUSE THE FOCUS TIMER!
        if (window.sessionTimer && window.sessionTimer.isRunning) {
          window.sessionTimer.pause();
          const timerStateBadge = document.getElementById('timerStateBadge');
          const pauseFocusBtn = document.getElementById('pauseFocusBtn');
          if (timerStateBadge) {
            timerStateBadge.className = 'timer-state-pill paused';
            timerStateBadge.innerHTML = '<span class="beacon-dot"></span> Timer Stopped (10s Limit Exceeded) ⏸️';
          }
          if (pauseFocusBtn) {
            pauseFocusBtn.textContent = 'Resume ▶';
            pauseFocusBtn.classList.add('paused');
          }
        }

        if (window.soundController) {
          window.soundController.playEscalationAlert();
        }

        // 2. OPEN SMALL POPUP WINDOW ASKING REASON TO LEAVE & DISTRACTION
        this.triggerDistractionEvent({
          type: 'TAB_SWITCH_TIMEOUT',
          details: `Left study window for over 10s (${triggerReason})`,
          isTimerStopped: true,
          severityWeight: 2.0
        });
      }
    }, 1000);
  }

  _handleTabRestored(triggerReason = 'Returned to Study Window') {
    // Clear countdown interval
    if (this.tabSwitchAlertTimer) {
      clearInterval(this.tabSwitchAlertTimer);
      this.tabSwitchAlertTimer = null;
    }

    // Restore original title
    document.title = this.originalPageTitle;

    const alertBanner = document.getElementById('cameraFallbackAlert');
    if (alertBanner) alertBanner.classList.remove('visible');

    if (!this.tabLeftTime) return;

    const awaySeconds = Math.round((Date.now() - this.tabLeftTime) / 1000);
    const trigger = this.currentTriggerReason || triggerReason;
    const wasOverLimit = awaySeconds >= 10 || this.gracePeriodExpired;
    this.tabLeftTime = null;

    // CASE 1: Student did NOT come back within 10 seconds (awaySeconds >= 10)
    if (wasOverLimit) {
      console.warn(`[SPARKX Guard] Student returned after ${awaySeconds}s (>10s limit). Timer stopped. Showing reason popup.`);

      // Automatically stop timer if not already paused
      if (window.sessionTimer && window.sessionTimer.isRunning) {
        window.sessionTimer.pause();
        const timerStateBadge = document.getElementById('timerStateBadge');
        const pauseFocusBtn = document.getElementById('pauseFocusBtn');
        if (timerStateBadge) {
          timerStateBadge.className = 'timer-state-pill paused';
          timerStateBadge.innerHTML = '<span class="beacon-dot"></span> Timer Stopped (10s Limit Exceeded) ⏸️';
        }
        if (pauseFocusBtn) {
          pauseFocusBtn.textContent = 'Resume ▶';
          pauseFocusBtn.classList.add('paused');
        }
      }

      // Check if popup window is already active
      const overlay = document.getElementById('waitReasonOverlay');
      const isOverlayActive = overlay && overlay.classList.contains('active');

      if (!isOverlayActive) {
        this.isPausedForIntervention = false;
        this.triggerDistractionEvent({
          type: 'TAB_SWITCH_TIMEOUT',
          details: `Away from study window for ${awaySeconds}s (${trigger}). 10-second limit exceeded!`,
          isTimerStopped: true,
          awaySeconds: awaySeconds,
          severityWeight: 2.0
        });
      }

      // Focus reason input directly
      const reasonInput = document.getElementById('breakReasonInput');
      if (reasonInput) {
        setTimeout(() => reasonInput.focus(), 150);
      }
    }
    // CASE 2: Student CAME BACK WITHIN 10 SECONDS! (awaySeconds < 10)
    else if (awaySeconds > 0) {
      console.log(`[SPARKX Guard] Student returned within ${awaySeconds}s. Focus preserved! Timer is still running.`);

      // Timer does NOT stop! It continues running smoothly.
      const toast = document.getElementById('interventionToast');
      const toastText = document.getElementById('toastMessageText');
      if (toast && toastText) {
        toastText.innerHTML = `🛡️ <strong>Focus Preserved:</strong> Returned within ${awaySeconds}s! Your timer is still running smoothly.`;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3500);
      }
    }
  }

  // Handle opening an external link or location (e.g. Instagram, YouTube)
  handleExternalLinkLaunch(url, appName) {
    console.log(`[SPARKX Guard] Launching distracting link: ${appName} (${url})`);

    // Play audible alert sound
    if (window.soundController) {
      window.soundController.playEscalationAlert();
    }

    // Start 10-second grace period countdown!
    this._handleTabHidden(`Opened ${appName}`);

    // Open link in new tab
    window.open(url, '_blank');
  }

  // -------------------------------------------------------------
  // PHYSICAL FRONT-CAMERA STREAM & EDGE COMPUTER VISION
  // -------------------------------------------------------------
  async initCamera(videoEl, canvasEl) {
    this.videoElement = videoEl || this.videoElement;
    this.canvasElement = canvasEl || this.canvasElement;
    if (this.canvasElement) {
      this.canvasCtx = this.canvasElement.getContext('2d', { willReadFrequently: true });
    }

    // If camera stream is already running, re-attach and reuse
    if (this.cameraStream && this.cameraStream.active) {
      this.videoElement.srcObject = this.cameraStream;
      await this.videoElement.play().catch(() => {});
      this.isCameraPermitted = true;
      this.fallbackModeActive = false;
      this._updateCameraBadge(true);
      this._hidePlaceholder();
      return { success: true };
    }

    // Check Secure Context (WebRTC requires HTTPS or localhost)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      let errReason = 'WebRTC Camera API not supported in this browser.';
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        errReason = `Insecure Origin: Browsers block camera on network IP (${window.location.hostname}). Please open http://localhost:8080/index.html!`;
      }
      this._handleCameraError('InsecureContext', errReason);
      return { success: false, error: 'InsecureContext', message: errReason };
    }

    try {
      let stream = null;
      let lastErr = null;

      // Tier 1: Generic video: true (Most universal constraint — directly triggers native browser permission prompt without overconstraints)
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch (err1) {
        lastErr = err1;
        // Tier 2: With ideal width/height
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false
          });
        } catch (err2) {
          lastErr = err2;
          // Tier 3: Facing mode user (for mobile phones)
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
          } catch (err3) {
            lastErr = err3;
          }
        }
      }

      if (!stream) {
        throw (lastErr || new Error('Physical camera stream could not be acquired'));
      }

      this.cameraStream = stream;
      this.videoElement.srcObject = this.cameraStream;
      this.videoElement.setAttribute('autoplay', '');
      this.videoElement.setAttribute('playsinline', '');
      this.videoElement.setAttribute('muted', '');
      this.videoElement.muted = true;
      await this.videoElement.play();

      this.isCameraPermitted = true;
      this.fallbackModeActive = false;
      this._updateCameraBadge(true);
      this._hidePlaceholder();

      // Start computer vision tracking immediately to monitor seeing on screen or not
      this.startMonitoring();

      console.log('✅ [SPARKX Camera] Physical camera stream connected successfully! Active gaze tracking started.');
      return { success: true };
    } catch (err) {
      const errName = err ? (err.name || 'NotAllowedError') : 'NotAllowedError';
      const errMsg = err ? (err.message || 'Camera permission denied') : 'Camera permission denied';
      console.warn(`⚠️ [SPARKX Camera] Physical camera access failed (${errName}):`, errMsg);

      this._handleCameraError(errName, errMsg);
      return {
        success: false,
        error: errName,
        message: errMsg,
        fallbackActive: true
      };
    }
  }

  _handleCameraError(errName, errMsg) {
    this.isCameraPermitted = false;
    this.fallbackModeActive = true;
    this._updateCameraBadge(false);

    const placeholder = document.getElementById('cameraPlaceholderOverlay');
    if (placeholder) {
      let title = 'Camera Access Blocked';
      let sub = 'Tap button below to unblock or retry';

      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        title = 'Browser Camera Permission Denied';
        sub = 'Click 🔒/📷 icon in address bar -> Set to "Allow" -> Click Retry';
      } else if (errName === 'NotReadableError') {
        title = 'Camera Busy (Used by Another App)';
        sub = 'Close Zoom, Teams or other webcam apps, then click Retry';
      } else if (errName === 'NotFoundError') {
        title = 'No Physical Webcam Detected';
        sub = 'Please connect a USB webcam or enable camera switch';
      } else if (errName === 'InsecureContext') {
        title = 'Access via http://localhost:8080';
        sub = 'Open on localhost for browser camera permissions';
      }

      placeholder.innerHTML = `
        <span class="placeholder-cam-icon">⚠️</span>
        <span class="placeholder-cam-title" style="color: #f59e0b;">${title}</span>
        <span class="placeholder-cam-sub">${sub}</span>
      `;
      placeholder.classList.remove('hidden');
    }
  }

  _hidePlaceholder() {
    const placeholder = document.getElementById('cameraPlaceholderOverlay');
    if (placeholder) placeholder.classList.add('hidden');
    if (this.videoElement) this.videoElement.style.display = 'block';
  }

  _updateCameraBadge(isWorking) {
    const badge = document.getElementById('cameraStatusBadge');
    if (!badge) return;

    if (isWorking) {
      badge.innerHTML = `<span class="dot-indicator green"></span> Physical Camera: Active 🟢`;
      badge.className = 'camera-status-pill active';
    } else {
      badge.innerHTML = `<span class="dot-indicator red"></span> Camera Blocked (Tap to Fix) ⚠️`;
      badge.className = 'camera-status-pill fallback';
    }
  }

  // -------------------------------------------------------------
  // MONITORING & COMPUTER VISION FRAME ANALYSIS
  // -------------------------------------------------------------
  startMonitoring() {
    this.isActive = true;
    this.isPausedForIntervention = false;
    this.consecutiveLookDownFrames = 0;
    this.consecutiveLookAwayFrames = 0;
    this.consecutiveAbsenceFrames = 0;

    if (this.detectionInterval) clearInterval(this.detectionInterval);

    this.detectionInterval = setInterval(() => {
      this._analyzeCameraFrame();
    }, 800);
  }

  pauseMonitoring() {
    this.isActive = false;
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
  }

  pauseForIntervention() {
    this.isPausedForIntervention = true;
  }

  resumeAfterIntervention() {
    this.isPausedForIntervention = false;
    this.consecutiveLookDownFrames = 0;
    this.consecutiveLookAwayFrames = 0;
    this.consecutiveAbsenceFrames = 0;
  }

  stopMonitoring() {
    this.isActive = false;
    this.isPausedForIntervention = false;
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
    if (this.tabSwitchAlertTimer) {
      clearInterval(this.tabSwitchAlertTimer);
      this.tabSwitchAlertTimer = null;
    }
  }

  // Real-Time Computer Vision Edge Analysis on Video Frame
  _analyzeCameraFrame() {
    if (this.isPausedForIntervention) return;
    if (!this.isCameraPermitted) return;
    if (!this.videoElement || this.videoElement.readyState < 2) return;

    const width = 160;
    const height = 120;
    if (!this.canvasElement || !this.canvasCtx) return;

    this.canvasElement.width = width;
    this.canvasElement.height = height;

    try {
      this.canvasCtx.drawImage(this.videoElement, 0, 0, width, height);
      const frameData = this.canvasCtx.getImageData(0, 0, width, height).data;

      let topLuminance = 0;
      let topPixels = 0;
      let bottomLuminance = 0;
      let bottomPixels = 0;
      let leftLuminance = 0;
      let leftPixels = 0;
      let rightLuminance = 0;
      let rightPixels = 0;
      let totalLuminance = 0;
      let totalPixels = 0;

      for (let y = 0; y < height; y += 4) {
        for (let x = 0; x < width; x += 4) {
          const index = (y * width + x) * 4;
          const r = frameData[index];
          const g = frameData[index + 1];
          const b = frameData[index + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;

          totalLuminance += lum;
          totalPixels += 1;

          if (y < height * 0.5 && x > width * 0.25 && x < width * 0.75) {
            topLuminance += lum;
            topPixels += 1;
          }

          if (y >= height * 0.5 && x > width * 0.25 && x < width * 0.75) {
            bottomLuminance += lum;
            bottomPixels += 1;
          }

          if (x < width * 0.3) {
            leftLuminance += lum;
            leftPixels += 1;
          }

          if (x > width * 0.7) {
            rightLuminance += lum;
            rightPixels += 1;
          }
        }
      }

      const avgTotal = totalPixels > 0 ? totalLuminance / totalPixels : 0;
      const avgTop = topPixels > 0 ? topLuminance / topPixels : 0;
      const avgBottom = bottomPixels > 0 ? bottomLuminance / bottomPixels : 0;
      const avgLeft = leftPixels > 0 ? leftLuminance / leftPixels : 0;
      const avgRight = rightPixels > 0 ? rightLuminance / rightPixels : 0;

      // 1. ABSENCE: Not seeing on screen (Student stepped away from desk)
      if (avgTotal < 12) {
        this.consecutiveAbsenceFrames += 1;
        this._updateReticleVisual('ABSENT');
        if (this.consecutiveAbsenceFrames >= 3) {
          this.consecutiveAbsenceFrames = 0;
          this.triggerDistractionEvent({
            type: 'STUDENT_ABSENT',
            details: 'Not seeing on screen (Student stepped away from desk)',
            countdown: 10,
            severityWeight: 1.0
          });
        }
        return;
      } else {
        this.consecutiveAbsenceFrames = 0;
      }

      // 2. LOOKING DOWN AT MOBILE PHONE: Not seeing on screen (Head tilted down / phone in lap)
      const topBottomRatio = avgBottom > 0 ? avgTop / avgBottom : 1.0;
      const isLookingDown = topBottomRatio < 0.72 || (avgTop < avgTotal * 0.75 && avgBottom > avgTotal * 1.15);

      if (isLookingDown) {
        this.consecutiveLookDownFrames += 1;
        this._updateReticleVisual('LOOK_DOWN');

        if (this.consecutiveLookDownFrames >= 2) {
          this.consecutiveLookDownFrames = 0;
          this.triggerDistractionEvent({
            type: 'PHONE_DOWN_GAZE',
            details: 'Not seeing on screen (Head tilted down / Looking at mobile phone)',
            countdown: 10,
            severityWeight: 1.4
          });
        }
        return;
      } else {
        this.consecutiveLookDownFrames = Math.max(0, this.consecutiveLookDownFrames - 1);
      }

      // 3. LOOKING AWAY TO SIDE: Not seeing on screen (Gaze / head diverted sideways away from monitor)
      const horizontalDiff = Math.abs(avgLeft - avgRight);
      const isLookingAway = horizontalDiff > 24;

      if (isLookingAway) {
        this.consecutiveLookAwayFrames += 1;
        this._updateReticleVisual('LOOK_AWAY');

        if (this.consecutiveLookAwayFrames >= 2) {
          this.consecutiveLookAwayFrames = 0;
          this.triggerDistractionEvent({
            type: 'GAZE_LOOKAWAY',
            details: 'Not seeing on screen (Gaze diverted away from study desk)',
            countdown: 10,
            severityWeight: 1.2
          });
        }
        return;
      } else {
        this.consecutiveLookAwayFrames = Math.max(0, this.consecutiveLookAwayFrames - 1);
      }

      // 4. LOCKED IN: Seeing on screen!
      this._updateReticleVisual('FOCUSED');
    } catch (e) {
      console.warn('[Distraction Detector] Frame processing error:', e);
    }
  }

  _updateReticleVisual(state) {
    const box = document.querySelector('.camera-face-box');
    const badge = document.getElementById('cameraStatusBadge');
    const reticleText = document.getElementById('reticleStatusText');
    if (!box) return;

    if (state === 'LOOK_DOWN') {
      box.style.borderColor = '#ef4444';
      box.style.boxShadow = '0 0 18px rgba(239, 68, 68, 0.9)';
      if (badge) badge.innerHTML = `<span class="dot-indicator red"></span> Not Seeing Screen (Phone?) 📱`;
      if (reticleText) {
        reticleText.textContent = 'Not Seeing Screen 📱';
        reticleText.style.color = '#ef4444';
      }
    } else if (state === 'LOOK_AWAY') {
      box.style.borderColor = '#f59e0b';
      box.style.boxShadow = '0 0 18px rgba(245, 158, 11, 0.9)';
      if (badge) badge.innerHTML = `<span class="dot-indicator amber"></span> Not Seeing Screen (Gaze Away) 👀`;
      if (reticleText) {
        reticleText.textContent = 'Not Seeing Screen 👀';
        reticleText.style.color = '#f59e0b';
      }
    } else if (state === 'ABSENT') {
      box.style.borderColor = '#ef4444';
      box.style.boxShadow = 'none';
      if (badge) badge.innerHTML = `<span class="dot-indicator red"></span> Not Seeing Screen (Desk Empty) 🪑`;
      if (reticleText) {
        reticleText.textContent = 'Not Seeing Screen 🪑';
        reticleText.style.color = '#ef4444';
      }
    } else {
      box.style.borderColor = '#10b981';
      box.style.boxShadow = '0 0 12px rgba(16, 185, 129, 0.6)';
      if (badge) badge.innerHTML = `<span class="dot-indicator green"></span> Seeing on Screen 🎯`;
      if (reticleText) {
        reticleText.textContent = 'Seeing on Screen [Locked In 🎯]';
        reticleText.style.color = '#10b981';
      }
    }
  }

  triggerDistractionEvent(eventData) {
    if (this.isPausedForIntervention) return;
    if (this.onDistraction) {
      this.onDistraction(eventData);
    }
  }

  // Manual Test Simulation Triggers
  triggerSimulatedDistraction(appKey = 'Instagram Reels') {
    const item = this.distractionAppList.find(a => a.name.toLowerCase().includes(appKey.toLowerCase())) || {
      name: appKey,
      weight: 2.0,
      category: 'Doomscrolling'
    };

    this.triggerDistractionEvent({
      type: 'BLACKLIST_APP',
      details: `Opened ${item.name} (${item.category} - double weighted distraction!)`,
      countdown: 10,
      severityWeight: item.weight
    });
  }

  triggerPhoneLookDownTest() {
    this._updateReticleVisual('LOOK_DOWN');
    setTimeout(() => {
      if (!this.isPausedForIntervention) {
        this._updateReticleVisual('FOCUSED');
      }
    }, 4000);

    this.triggerDistractionEvent({
      type: 'PHONE_DOWN_GAZE',
      details: 'Gaze diverted downward (Simulated phone tilt posture test).',
      countdown: 10,
      severityWeight: 1.4
    });
  }

  triggerLookAwayTest() {
    this._updateReticleVisual('LOOK_AWAY');
    setTimeout(() => {
      if (!this.isPausedForIntervention) {
        this._updateReticleVisual('FOCUSED');
      }
    }, 4000);

    this.triggerDistractionEvent({
      type: 'GAZE_LOOKAWAY',
      details: 'Gaze diverted from study desk (Simulated look-away test).',
      countdown: 10,
      severityWeight: 1.2
    });
  }
}

window.DistractionDetector = DistractionDetector;
