/**
 * SPARKX Master Application Controller (v6.0)
 * Created by 1st Year Engineering Students for SPhINX'26 Hackathon
 * Government Engineering College Ajmer
 * Team: SPARKX (1st Year B.Tech CSE)
 *
 * Implements:
 * - Dedicated Screen Switching: Auth View (Sign Up & Login) <-> Main Dashboard View
 * - Starts strictly on Sign Up / Sign In screen by default with NO pre-loaded user
 * - SQLite Database User Registration & Login (0 pre-seeded users)
 * - 1st Day Welcome Reward of 100 Coins (all initial stats start at 0)
 * - Revamped High-Tech Pomodoro Focus Timer with neon dual-rings & preset pills
 * - Real-time Front-Camera Vision AI for gaze and phone tilt detection (no camera freezes!)
 * - Tab visibility change distraction guard (anti-flooding, no 10s flood error)
 * - Dedicated Student Profile Section with stats & badge progression
 * - Friend Request Sending & Tracking System (Send invites to classmates)
 * - Notification Bell with Red Alert Badge (Accept/Decline incoming requests)
 * - Quick 1-Click Demo Fill for hackathon testing
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize Core Engines
  const timer = new SessionTimer();
  const interventionManager = new InterventionManager(timer);
  const distractionDetector = new DistractionDetector((distractionEvent) => {
    interventionManager.handleDistraction(distractionEvent);
  });

  window.sessionTimer = timer;
  window.distractionDetector = distractionDetector;
  window.interventionManager = interventionManager;

  // View Switcher: Auth Screen vs Main Dashboard
  const viewAuth = document.getElementById('viewAuth');
  const viewMain = document.getElementById('viewMain');

  function showView(viewName) {
    if (viewName === 'auth') {
      if (viewAuth) viewAuth.classList.add('active');
      if (viewMain) viewMain.classList.remove('active');
    } else {
      if (viewAuth) viewAuth.classList.remove('active');
      if (viewMain) viewMain.classList.add('active');
    }
  }

  // 2. Physical Camera Controls & Test Simulation Triggers
  const videoPreview = document.getElementById('cameraVideoPreview');
  const canvasElement = document.getElementById('cameraCanvas');
  const toggleCameraBtn = document.getElementById('toggleCameraBtn');
  const cameraStatusBadge = document.getElementById('cameraStatusBadge');
  const testLookDownBtn = document.getElementById('testLookDownBtn');
  const testLookAwayBtn = document.getElementById('testLookAwayBtn');
  const testTabDistractionBtn = document.getElementById('testTabDistractionBtn');

  async function tryConnectRealCamera() {
    if (toggleCameraBtn) {
      toggleCameraBtn.textContent = 'Connecting Camera... ⌛';
      toggleCameraBtn.disabled = true;
    }
    const result = await distractionDetector.initCamera(videoPreview, canvasElement);
    if (toggleCameraBtn) toggleCameraBtn.disabled = false;

    if (result.success) {
      if (toggleCameraBtn) {
        toggleCameraBtn.textContent = 'Physical Camera: Active 🟢';
        toggleCameraBtn.classList.add('active');
        toggleCameraBtn.classList.remove('fallback');
      }
      showToast('📷 Physical front camera connected! Live gaze tracking is active.');
    } else {
      if (toggleCameraBtn) {
        toggleCameraBtn.textContent = 'Camera Blocked: Tap to Fix ⚠️';
        toggleCameraBtn.classList.add('fallback');
        toggleCameraBtn.classList.remove('active');
      }
      showCameraTroubleshootModal(result.error, result.message);
    }
    return result;
  }

  function showCameraTroubleshootModal(errorName = '', errorMessage = '') {
    let specificGuide = `
      <ol style="margin: 0; padding-left: 20px; line-height: 1.6; font-size: 0.84rem; color: #e2e8f0;">
        <li>Look at the top URL address bar in your browser (left of <code>localhost:8080</code>).</li>
        <li>Click the <strong>Lock (🔒)</strong> or <strong>Camera (🎥)</strong> icon.</li>
        <li>Change <strong>Camera</strong> permission from <em>"Block"</em> to <strong>"Allow"</strong>.</li>
        <li>Click the <strong>Retry Physical Camera</strong> button below!</li>
      </ol>
    `;

    if (errorName === 'NotReadableError') {
      specificGuide = `
        <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; border-radius: 10px; padding: 10px; font-size: 0.84rem; color: #fca5a5;">
          <strong>Camera Already in Use!</strong><br>
          Another application (Zoom, MS Teams, Discord, or another browser window) is currently holding your webcam lock. Please close it, then tap retry!
        </div>
      `;
    } else if (errorName === 'NotFoundError') {
      specificGuide = `
        <div style="background: rgba(245, 158, 11, 0.15); border: 1px solid #f59e0b; border-radius: 10px; padding: 10px; font-size: 0.84rem; color: #fde68a;">
          <strong>No Webcam Found!</strong><br>
          No physical camera hardware was found. Please plug in a USB camera or toggle your laptop camera privacy shutter switch.
        </div>
      `;
    } else if (errorName === 'InsecureContext') {
      specificGuide = `
        <div style="background: rgba(56, 189, 248, 0.15); border: 1px solid #38bdf8; border-radius: 10px; padding: 10px; font-size: 0.84rem; color: #bae6fd;">
          <strong>Access via Localhost Required!</strong><br>
          Browsers only permit camera over HTTP on <code>localhost</code>. Please open <strong>http://localhost:8080/index.html</strong> on this machine!
        </div>
      `;
    }

    showModal('📷 Physical Camera Troubleshooting', `
      <div style="text-align: left; padding: 4px 0;">
        <div style="text-align: center; margin-bottom: 10px;">
          <div style="font-size: 3rem; margin-bottom: 4px;">📷 ⚠️</div>
          <h3 style="color: #f87171; margin-bottom: 4px;">Physical Camera Access Blocked</h3>
          <p style="color: #94a3b8; font-size: 0.8rem;">Reason: <strong>${errorName || 'Permission Denied'}</strong></p>
        </div>

        <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 14px; margin-bottom: 14px;">
          <strong style="color: #38bdf8; display: block; margin-bottom: 8px; font-size: 0.9rem;">🔧 How to Unblock Physical Camera:</strong>
          ${specificGuide}
        </div>

        <div style="display: flex; gap: 8px;">
          <button id="modalBtnRetryRealCam" class="btn-primary-student full-width" style="padding: 11px; font-size: 0.9rem;">
            🔄 Retry Physical Camera
          </button>
          <button id="modalBtnContinue10s" class="btn-demo-fill" style="margin: 0; padding: 11px 14px; font-size: 0.82rem; white-space: nowrap;">
            🛡️ Use 10s Tab Guard
          </button>
        </div>
      </div>
    `);

    setTimeout(() => {
      const btnRetry = document.getElementById('modalBtnRetryRealCam');
      const btnFallback = document.getElementById('modalBtnContinue10s');

      if (btnRetry) {
        btnRetry.onclick = async () => {
          if (modalOverlay) modalOverlay.classList.remove('visible');
          await tryConnectRealCamera();
        };
      }

      if (btnFallback) {
        btnFallback.onclick = () => {
          if (modalOverlay) modalOverlay.classList.remove('visible');
          showToast('🛡️ 10-Second Tab Switch Guard is actively protecting your study session.');
        };
      }
    }, 50);
  }

  if (toggleCameraBtn) {
    toggleCameraBtn.addEventListener('click', async () => {
      if (distractionDetector.isCameraPermitted) {
        showToast('📷 Physical camera is active and monitoring!');
      } else {
        await tryConnectRealCamera();
      }
    });
  }

  if (cameraStatusBadge) {
    cameraStatusBadge.style.cursor = 'pointer';
    cameraStatusBadge.addEventListener('click', () => {
      if (!distractionDetector.isCameraPermitted) {
        tryConnectRealCamera();
      }
    });
  }

  const cameraPlaceholder = document.getElementById('cameraPlaceholderOverlay');
  if (cameraPlaceholder) {
    cameraPlaceholder.style.cursor = 'pointer';
    cameraPlaceholder.addEventListener('click', () => {
      if (!distractionDetector.isCameraPermitted) {
        tryConnectRealCamera();
      }
    });
  }

  // Gaze & Posture Test Triggers
  if (testLookDownBtn) {
    testLookDownBtn.addEventListener('click', () => {
      distractionDetector.triggerPhoneLookDownTest();
    });
  }

  if (testLookAwayBtn) {
    testLookAwayBtn.addEventListener('click', () => {
      distractionDetector.triggerLookAwayTest();
    });
  }

  // 10-Second Tab Countdown Test Trigger
  if (testTabDistractionBtn) {
    testTabDistractionBtn.addEventListener('click', () => {
      distractionDetector._handleTabHidden('Manual 10s Tab Test');
      showToast('⏱️ 10s grace period active! If away >10s, timer stops automatically & asks reason.');
    });
  }

  // Anti-Doomscroll Interactive Links (Opens tab and starts 10-second countdown!)
  const doomLinkBtns = document.querySelectorAll('.chip-doom-link');
  doomLinkBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.getAttribute('data-url');
      const name = btn.getAttribute('data-name');
      distractionDetector.handleExternalLinkLaunch(url, name);
      showToast(`🚀 Opened ${name}! 10-second grace countdown active.`);
    });
  });

  // Custom Link Location Launcher
  const btnLaunchLocationLink = document.getElementById('btnLaunchLocationLink');
  const testLinkLocationInput = document.getElementById('testLinkLocationInput');
  if (btnLaunchLocationLink && testLinkLocationInput) {
    btnLaunchLocationLink.addEventListener('click', () => {
      let url = testLinkLocationInput.value.trim();
      if (!url) return;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      distractionDetector.handleExternalLinkLaunch(url, 'External Site');
      showToast(`🚀 Opened link! 10-second grace countdown started.`);
    });
  }

  // 3. REVAMPED POMODORO FOCUS TIMER CONTROLS
  const startFocusBtn = document.getElementById('startFocusBtn');
  const pauseFocusBtn = document.getElementById('pauseFocusBtn');
  const cancelFocusBtn = document.getElementById('cancelFocusBtn');
  const focusGoalInput = document.getElementById('focusGoalInput');
  const timerDisplay = document.getElementById('timerDisplay');
  const timerRingProgress = document.getElementById('timerRingProgress');
  const activeFocusCard = document.getElementById('activeFocusCard');
  const idleSetupCard = document.getElementById('idleSetupCard');
  const activeGoalLabel = document.getElementById('activeGoalLabel');
  const timerStateBadge = document.getElementById('timerStateBadge');
  const btnToggleAudio = document.getElementById('btnToggleAudio');
  const presetPills = document.querySelectorAll('.preset-pill');

  let selectedDurationMinutes = 35; // Default 35m streak qualifier

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function updateRing(ratio) {
    if (!timerRingProgress) return;
    const circumference = 2 * Math.PI * 110;
    const offset = circumference * (1 - ratio);
    timerRingProgress.style.strokeDashoffset = offset;
  }

  function setTimerState(state, text) {
    if (!timerStateBadge) return;
    timerStateBadge.className = `timer-state-pill ${state}`;
    timerStateBadge.innerHTML = `<span class="beacon-dot"></span> ${text}`;
  }

  // Duration Preset Pills (1-tap selection)
  presetPills.forEach(pill => {
    pill.addEventListener('click', () => {
      presetPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedDurationMinutes = parseInt(pill.getAttribute('data-minutes'), 10) || 25;

      if (!timer.isRunning) {
        timerDisplay.textContent = formatTime(selectedDurationMinutes * 60);
        updateRing(0);
      }
    });
  });

  // Sound Feedback Toggle
  if (btnToggleAudio) {
    btnToggleAudio.addEventListener('click', () => {
      if (window.soundController) {
        window.soundController.soundEnabled = !window.soundController.soundEnabled;
        btnToggleAudio.textContent = window.soundController.soundEnabled ? '🔊 Sound On' : '🔇 Muted';
        btnToggleAudio.classList.toggle('muted', !window.soundController.soundEnabled);
        showToast(window.soundController.soundEnabled ? 'Audio feedback unmuted 🔊' : 'Audio feedback muted 🔇');
      }
    });
  }

  timer.onTick = (remainingSecs, elapsedSecs, ratio) => {
    if (timerDisplay) timerDisplay.textContent = formatTime(remainingSecs);
    updateRing(ratio);
  };

  timer.onComplete = (session, actualMinutes, result) => {
    distractionDetector.stopMonitoring();
    interventionManager.reset();

    if (activeFocusCard) activeFocusCard.classList.add('hidden');
    if (idleSetupCard) idleSetupCard.classList.remove('hidden');
    setTimerState('ready', 'Session Complete! 🎉');

    if (window.soundController) {
      window.soundController.playSessionCompleted();
    }

    const taskTitle = session && session.subject ? session.subject : (focusGoalInput ? focusGoalInput.value : 'Study Session');
    const displayMins = actualMinutes > 0 ? actualMinutes : 1;
    const streakNotice = result.streakAwarded ?
      '🔥 30+ Minutes Milestone Achieved! Daily streak increased by 1 day!' :
      '💡 Pro-tip: Study 30+ minutes in a session to advance your daily streak!';

    showModal('Task Focus Complete! 🏆', `
      <div style="text-align: center; padding: 12px 0;">
        <div style="font-size: 3.5rem; margin-bottom: 8px;">🎉</div>
        <h3 style="color: #4ade80; margin-bottom: 6px;">Task Complete!</h3>
        <p style="color: #cbd5e1; margin-bottom: 12px;">
          Task: <strong>${taskTitle}</strong><br>
          You maintained locked-in focus for <strong>${displayMins} minute${displayMins !== 1 ? 's' : ''}</strong>!
        </p>
        <div style="background: rgba(37, 99, 235, 0.15); border: 1px solid #2563eb; padding: 12px; border-radius: 12px; margin-bottom: 14px; text-align: left; font-size: 0.88rem;">
          <div style="margin-bottom: 4px;">🪙 <strong>+${result.coinsEarned || displayMins * 2} Focus Coins</strong> added to student wallet!</div>
          <div style="margin-top: 4px; font-size: 0.82rem; color: #38bdf8;">${streakNotice}</div>
        </div>
        <button id="btnClaimTaskCompletion" class="btn-primary-student full-width" style="padding: 12px; font-size: 0.95rem;">
          🎉 Claim Rewards & Complete Task
        </button>
      </div>
    `);

    setTimeout(() => {
      const btn = document.getElementById('btnClaimTaskCompletion');
      if (btn) {
        btn.onclick = () => {
          if (modalOverlay) modalOverlay.classList.remove('visible');
          showToast('🎉 Task completed! Focus coins credited.');
        };
      }
    }, 50);
  };

  timer.onBreak = (session, elapsedMinutes, reason) => {
    distractionDetector.stopMonitoring();
    interventionManager.reset();

    if (activeFocusCard) activeFocusCard.classList.add('hidden');
    if (idleSetupCard) idleSetupCard.classList.remove('hidden');
    setTimerState('ready', 'Session Paused 🌱');

    showModal('Session Logged Gracefully 🌱', `
      <div style="text-align: center; padding: 12px 0;">
        <div style="font-size: 3.5rem; margin-bottom: 8px;">🕊️</div>
        <h3 style="color: #38bdf8; margin-bottom: 6px;">Logged, Never Shamed</h3>
        <p style="color: #cbd5e1; font-size: 0.95rem; margin-bottom: 14px;">
          Reason logged: <em>"${reason}"</em>.<br>
          You focused for <strong>${elapsedMinutes} minutes</strong> — that is real progress!
        </p>
        <p style="color: #94a3b8; font-size: 0.85rem;">
          In SPARKX, we believe digital wellbeing is built with positive encouragement. Take a breath and return when ready!
        </p>
      </div>
    `);
  };

  if (startFocusBtn) {
    startFocusBtn.addEventListener('click', async () => {
      const goal = focusGoalInput.value.trim() || 'Engineering Mathematics Unit 2';
      const duration = selectedDurationMinutes;

      if (activeGoalLabel) activeGoalLabel.textContent = goal;
      if (timerDisplay) timerDisplay.textContent = formatTime(duration * 60);
      updateRing(0);

      idleSetupCard.classList.add('hidden');
      activeFocusCard.classList.remove('hidden');
      setTimerState('running', 'In Focus Flow 🟢');

      // Ensure physical camera is requested
      if (!distractionDetector.isCameraPermitted) {
        const camRes = await distractionDetector.initCamera(videoPreview, canvasElement);
        if (!camRes.success) {
          showToast('⚠️ Physical camera not connected. 10-Second Tab Guard is actively protecting your session!');
        }
      }

      timer.start(goal, duration);
      distractionDetector.startMonitoring();
    });
  }

  if (pauseFocusBtn) {
    pauseFocusBtn.addEventListener('click', () => {
      if (timer.isRunning) {
        timer.pause();
        distractionDetector.pauseMonitoring();
        pauseFocusBtn.textContent = 'Resume ▶';
        pauseFocusBtn.classList.add('paused');
        setTimerState('paused', 'Paused ⏸');
      } else {
        timer.start(timer.activeSession.subject, timer.activeSession.targetMinutes, true);
        distractionDetector.startMonitoring();
        pauseFocusBtn.textContent = 'Pause ⏸';
        pauseFocusBtn.classList.remove('paused');
        setTimerState('running', 'In Focus Flow 🟢');
      }
    });
  }

  if (cancelFocusBtn) {
    cancelFocusBtn.addEventListener('click', () => {
      if (confirm('Take a pause from this focus session? It will be logged safely without shame.')) {
        interventionManager.reset();
        timer.markSessionBroken('Manually paused session');
      }
    });
  }

  // 4. Tasks Manager with direct focus integration
  const taskManager = new TaskManager((task) => {
    switchTab('tabFocus');
    if (focusGoalInput) focusGoalInput.value = task.title;
    if (activeGoalLabel) activeGoalLabel.textContent = task.title;

    selectedDurationMinutes = task.estimatedMinutes || 25;
    presetPills.forEach(p => {
      if (parseInt(p.getAttribute('data-minutes'), 10) === selectedDurationMinutes) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });

    if (timerDisplay) timerDisplay.textContent = formatTime(selectedDurationMinutes * 60);
    updateRing(0);
  });
  window.taskManager = taskManager;

  // 5. Tab Navigation
  const navButtons = document.querySelectorAll('.nav-bottom-item, .nav-tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  function switchTab(targetTabId) {
    navButtons.forEach(btn => {
      if (btn.getAttribute('data-tab') === targetTabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    tabPanes.forEach(pane => {
      if (pane.id === targetTabId) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });

    if (targetTabId === 'tabRewards' && window.gamificationEngine) {
      window.gamificationEngine.updateUI();
    }
    if (targetTabId === 'tabGroups') {
      if (window.groupSyncController) {
        window.groupSyncController.loadGroupData();
        window.groupSyncController.loadLeaderboard();
      }
      loadSentFriendRequests();
    }
    if (targetTabId === 'tabTasks' && window.taskManager) {
      window.taskManager.loadTasks();
    }
  }

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      if (tab) switchTab(tab);
    });
  });

  // 6. Generic Modal Dialog
  const modalOverlay = document.getElementById('globalModalOverlay');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const closeModalBtn = document.getElementById('closeModalBtn');

  function showModal(title, contentHtml) {
    if (!modalOverlay) return;
    if (modalTitle) modalTitle.textContent = title;
    if (modalBody) modalBody.innerHTML = contentHtml;
    modalOverlay.classList.add('visible');
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      modalOverlay.classList.remove('visible');
    });
  }

  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) modalOverlay.classList.remove('visible');
    });
  }

  // -------------------------------------------------------------
  // 7. LOGIN & SIGNUP LOGIC (Database + 100 Coin Day 1 Bonus)
  // -------------------------------------------------------------
  const tabSignupBtn = document.getElementById('tabSignupBtn');
  const tabLoginBtn = document.getElementById('tabLoginBtn');
  const signupFormContainer = document.getElementById('signupFormContainer');
  const loginFormContainer = document.getElementById('loginFormContainer');

  if (tabSignupBtn && tabLoginBtn) {
    tabSignupBtn.onclick = () => {
      tabSignupBtn.classList.add('active');
      tabLoginBtn.classList.remove('active');
      signupFormContainer.style.display = 'block';
      loginFormContainer.style.display = 'none';
    };
    tabLoginBtn.onclick = () => {
      tabLoginBtn.classList.add('active');
      tabSignupBtn.classList.remove('active');
      signupFormContainer.style.display = 'none';
      loginFormContainer.style.display = 'block';
    };
  }

  // Quick Demo Student Fill (1-Click Test)
  const quickDemoStudentBtn = document.getElementById('quickDemoStudentBtn');
  if (quickDemoStudentBtn) {
    quickDemoStudentBtn.onclick = () => {
      const demoNames = ['Rahul Sharma', 'Ananya Verma', 'Pooja Jangid', 'Rohit Meena', 'Priya Soni'];
      const pickedName = demoNames[Math.floor(Math.random() * demoNames.length)];
      const randomPhone = '98' + Math.floor(10000000 + Math.random() * 90000000);

      const nameInput = document.getElementById('signupName');
      const phoneInput = document.getElementById('signupPhone');
      const collegeInput = document.getElementById('signupCollege');
      const passwordInput = document.getElementById('signupPassword');

      if (nameInput) nameInput.value = pickedName;
      if (phoneInput) phoneInput.value = randomPhone;
      if (collegeInput) collegeInput.value = 'GEC Ajmer (1st Year CS)';
      if (passwordInput) passwordInput.value = 'student123';

      showToast(`⚡ Auto-filled ${pickedName}! Click 'CREATE ACCOUNT' below.`);
    };
  }

  // Handle Sign Up Form Submit
  const signupForm = document.getElementById('studentSignupForm');
  if (signupForm) {
    signupForm.onsubmit = async (e) => {
      e.preventDefault();
      const name = document.getElementById('signupName').value.trim();
      const phone = document.getElementById('signupPhone').value.trim();
      const college = document.getElementById('signupCollege').value.trim();
      const password = document.getElementById('signupPassword').value.trim();

      const res = await window.apiClient.signup(name, phone, password, college);
      if (res && res.success) {
        handleAuthSuccess(res.user, true); // true = Show 100 Coin celebration!
      } else {
        alert('⚠️ ' + (res.error || 'Failed to create account.'));
      }
    };
  }

  // Handle Login Form Submit
  const loginForm = document.getElementById('studentLoginForm');
  if (loginForm) {
    loginForm.onsubmit = async (e) => {
      e.preventDefault();
      const phone = document.getElementById('loginPhone').value.trim();
      const password = document.getElementById('loginPassword').value.trim();

      const res = await window.apiClient.login(phone, password);
      if (res && res.success) {
        handleAuthSuccess(res.user, false);
      } else {
        alert('⚠️ ' + (res.error || 'Invalid mobile number or password.'));
      }
    };
  }

  function handleAuthSuccess(user, isNewSignup) {
    showView('main');
    window.gamificationEngine.setUser(user);

    const bannerName = document.getElementById('bannerStudentName');
    const bannerCollege = document.getElementById('bannerStudentCollege');
    const headerProfileName = document.getElementById('headerProfileName');
    if (bannerName) bannerName.textContent = user.name;
    if (bannerCollege) bannerCollege.textContent = user.college || 'GEC Ajmer';
    if (headerProfileName) headerProfileName.textContent = user.name.split(' ')[0];

    updateNotificationBadge();
    loadSentFriendRequests();
    if (window.taskManager) window.taskManager.loadTasks();

    // Automatically prompt physical front camera permission on login if not yet connected
    if (!distractionDetector.isCameraPermitted) {
      setTimeout(() => {
        tryConnectRealCamera();
      }, 500);
    }

    if (isNewSignup) {
      showModal('🎉 Welcome to SPARKX!', `
        <div style="text-align: center; padding: 12px 0;">
          <div style="font-size: 3.5rem; margin-bottom: 6px;">🎁</div>
          <h3 style="color: #fbbf24; margin-bottom: 4px;">Day 1 Reward Claimed!</h3>
          <p style="color: #cbd5e1; font-size: 0.95rem; margin-bottom: 14px;">
            Welcome, <strong>${user.name}</strong>! We have credited <strong>100 Focus Coins</strong> into your student wallet!
          </p>
          <div style="background: rgba(37,99,235,0.15); border: 2px solid #2563eb; border-radius: 12px; padding: 12px; text-align: left; margin-bottom: 14px; font-size: 0.85rem;">
            <div style="margin-bottom: 4px;">🪙 <strong>Focus Coins:</strong> 100 Coins (Day 1 Bonus Awarded!)</div>
            <div style="margin-bottom: 4px;">🔥 <strong>Daily Streak:</strong> 0 Days (Study 30+ mins to unlock Day 1 streak)</div>
            <div style="margin-bottom: 4px;">⚡ <strong>Consistency Score:</strong> 0/100</div>
            <div style="margin-bottom: 4px;">⏱️ <strong>Total Focus Time:</strong> 0.0 Hours</div>
            <div>💾 <strong>Database:</strong> Registered in SQLite (sparkx_students.db)</div>
          </div>
          <button id="btnStartDay1" class="btn-primary-student full-width">
            Start My 1st Study Session 🚀
          </button>
        </div>
      `);
      setTimeout(() => {
        const btn = document.getElementById('btnStartDay1');
        if (btn) btn.onclick = () => modalOverlay.classList.remove('visible');
      }, 50);
    } else {
      showToast(`Welcome back, ${user.name}! 📚`);
    }
  }

  // Sign Out Button Handler
  const btnSignOut = document.getElementById('btnSignOut');
  if (btnSignOut) {
    btnSignOut.addEventListener('click', () => {
      window.apiClient.logout();
      showView('auth');
      showToast('👋 Signed out! Enter credentials or create an account to resume.');
    });
  }

  // -------------------------------------------------------------
  // 8. DEDICATED STUDENT PROFILE SECTION (User Request)
  // -------------------------------------------------------------
  function openProfileModal() {
    const u = window.apiClient.currentUser || window.gamificationEngine.user || {
      name: 'Student',
      college: 'GEC Ajmer (1st Year CS)',
      phone: '9876543210',
      focusCoins: 100,
      streakDays: 0,
      consistencyScore: 0,
      totalFocusMinutes: 0,
      doomscrollHoursSaved: 0.0
    };

    const focusHours = ((u.totalFocusMinutes || 0) / 60).toFixed(1);

    showModal('👤 Student Profile', `
      <div class="profile-modal-container">
        <!-- Top Avatar Card -->
        <div class="profile-hero-card">
          <div class="profile-avatar-circle">👨‍🎓</div>
          <h3 class="profile-hero-name" id="profDisplayName">${u.name}</h3>
          <span class="profile-hero-college" id="profDisplayCollege">${u.college || 'GEC Ajmer (1st Year)'}</span>
          <span class="profile-phone-tag">📱 ${u.phone || 'Registered Student'}</span>
        </div>

        <!-- 4-Box Key Metrics Grid -->
        <div class="profile-stats-grid">
          <div class="prof-stat-box amber">
            <span class="prof-lbl">Focus Coins</span>
            <span class="prof-val">${u.focusCoins || 100} 🪙</span>
          </div>
          <div class="prof-stat-box red">
            <span class="prof-lbl">Daily Streak</span>
            <span class="prof-val">${u.streakDays || 0} Days 🔥</span>
          </div>
          <div class="prof-stat-box blue">
            <span class="prof-lbl">Consistency</span>
            <span class="prof-val">${u.consistencyScore || 0}/100 ⚡</span>
          </div>
          <div class="prof-stat-box green">
            <span class="prof-lbl">Total Focused</span>
            <span class="prof-val">${focusHours}h ⏱️</span>
          </div>
        </div>

        <!-- Badges Progression -->
        <div style="margin: 12px 0 6px; font-size: 0.82rem; font-weight: 800; color: #94a3b8; text-transform: uppercase;">
          🏅 Earned Badges
        </div>
        <div class="profile-badges-row">
          <span class="badge-pill unlocked">🌱 1st Day Starter</span>
          <span class="badge-pill ${(u.streakDays >= 1) ? 'unlocked' : 'locked'}">🔥 1-Day Streak</span>
          <span class="badge-pill ${(u.streakDays >= 5) ? 'unlocked' : 'locked'}">⭐ Streak Master</span>
          <span class="badge-pill ${(u.totalFocusMinutes >= 60) ? 'unlocked' : 'locked'}">📚 1-Hour Focus</span>
        </div>

        <!-- Edit Profile Form -->
        <details class="profile-edit-details" style="margin-top: 14px;">
          <summary class="profile-edit-summary">✏️ Edit Profile Details</summary>
          <div class="form-stack" style="margin-top: 8px;">
            <label class="form-label">Full Name</label>
            <input type="text" id="editProfName" class="input-field" value="${u.name}" />
            <label class="form-label">College & Branch</label>
            <input type="text" id="editProfCollege" class="input-field" value="${u.college || 'GEC Ajmer (1st Year CS)'}" />
            <button id="btnSaveProfile" class="btn-primary-student" style="padding: 10px; margin-top: 4px;">
              💾 Save Changes
            </button>
          </div>
        </details>

        <!-- Profile Action Buttons -->
        <div style="display: flex; gap: 8px; margin-top: 14px;">
          <button id="btnSwitchAccountProfile" class="btn-demo-fill full-width" style="margin: 0; padding: 10px;">
            🔄 Switch Account
          </button>
          <button id="btnSignOutProfile" class="btn-signout-small" style="padding: 10px 16px; font-size: 0.8rem;">
            Sign Out
          </button>
        </div>
      </div>
    `);

    setTimeout(() => {
      const btnSave = document.getElementById('btnSaveProfile');
      const btnSwitch = document.getElementById('btnSwitchAccountProfile');
      const btnSignOutModal = document.getElementById('btnSignOutProfile');

      if (btnSave) {
        btnSave.onclick = async () => {
          const newName = document.getElementById('editProfName').value.trim();
          const newCollege = document.getElementById('editProfCollege').value.trim();
          if (newName) {
            const res = await window.apiClient.updateProfile(newName, newCollege);
            if (res && res.success) {
              const bannerName = document.getElementById('bannerStudentName');
              const bannerCollege = document.getElementById('bannerStudentCollege');
              const headerProfileName = document.getElementById('headerProfileName');
              if (bannerName) bannerName.textContent = newName;
              if (bannerCollege) bannerCollege.textContent = newCollege;
              if (headerProfileName) headerProfileName.textContent = newName.split(' ')[0];
              modalOverlay.classList.remove('visible');
              showToast('Profile updated successfully! ✨');
            }
          }
        };
      }

      if (btnSwitch) {
        btnSwitch.onclick = () => {
          modalOverlay.classList.remove('visible');
          showView('auth');
        };
      }

      if (btnSignOutModal) {
        btnSignOutModal.onclick = () => {
          modalOverlay.classList.remove('visible');
          window.apiClient.logout();
          showView('auth');
          showToast('Signed out successfully! 👋');
        };
      }
    }, 50);
  }

  const btnOpenProfile = document.getElementById('btnOpenProfile');
  if (btnOpenProfile) {
    btnOpenProfile.addEventListener('click', openProfileModal);
  }

  const studentStatusBar = document.getElementById('studentStatusBar');
  if (studentStatusBar) {
    studentStatusBar.addEventListener('click', openProfileModal);
  }

  // -------------------------------------------------------------
  // 9. SEND FRIEND REQUEST SYSTEM (User Request)
  // -------------------------------------------------------------
  const sendBuddyForm = document.getElementById('sendBuddyForm');
  const buddyTargetInput = document.getElementById('buddyTargetInput');
  const buddyMessageInput = document.getElementById('buddyMessageInput');

  // Quick Classmate Suggestion Chips
  const classmateChips = document.querySelectorAll('.chip-suggest');
  classmateChips.forEach(chip => {
    chip.addEventListener('click', () => {
      if (buddyTargetInput) {
        buddyTargetInput.value = chip.getAttribute('data-name');
        buddyTargetInput.focus();
      }
    });
  });

  if (sendBuddyForm) {
    sendBuddyForm.onsubmit = async (e) => {
      e.preventDefault();
      const target = buddyTargetInput.value.trim();
      const message = buddyMessageInput.value.trim() || "Let's study together in SPARKX study circles!";

      if (!target) return;

      const res = await window.apiClient.sendFriendRequest(target, message);
      if (res && res.success) {
        showToast(res.message || `Friend request sent to ${target}! 🚀`);
        buddyTargetInput.value = '';
        loadSentFriendRequests();
      } else {
        alert('⚠️ ' + (res.error || 'Failed to send request.'));
      }
    };
  }

  async function loadSentFriendRequests() {
    const listEl = document.getElementById('sentRequestsList');
    const countEl = document.getElementById('sentRequestsCount');
    if (!listEl) return;

    try {
      const res = await window.apiClient.getSentFriendRequests();
      const sent = (res && res.sentRequests) ? res.sentRequests : [];

      if (countEl) countEl.textContent = sent.length;

      if (sent.length === 0) {
        listEl.innerHTML = `
          <div style="font-size: 0.78rem; color: #64748b; padding: 6px 0;">
            No sent requests yet. Enter a classmate's name or number above to connect!
          </div>
        `;
      } else {
        listEl.innerHTML = sent.map(r => `
          <div class="sent-req-item">
            <div class="sent-req-info">
              <strong>${r.toName}</strong>
              <span class="sent-req-msg">"${r.message || 'Study Invite'}"</span>
            </div>
            <span class="sent-req-status pending">⏳ Pending</span>
          </div>
        `).join('');
      }
    } catch (e) {
      if (countEl) countEl.textContent = '0';
    }
  }

  // -------------------------------------------------------------
  // 10. NOTIFICATION BELL & FRIEND REQUEST SYSTEM
  // -------------------------------------------------------------
  async function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;

    try {
      const res = await window.apiClient.getFriendRequests();
      const count = res && res.count !== undefined ? res.count : (res.requests ? res.requests.filter(r => r.status === 'PENDING').length : 0);

      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    } catch (e) {
      badge.textContent = '1';
      badge.style.display = 'inline-block';
    }
  }

  const notificationsBtn = document.getElementById('notificationsBtn');
  if (notificationsBtn) {
    notificationsBtn.addEventListener('click', async () => {
      const res = await window.apiClient.getFriendRequests();
      const requests = (res && res.requests) ? res.requests : [];
      const pending = requests.filter(r => r.status === 'PENDING');

      let requestsHtml = '';
      if (pending.length === 0) {
        requestsHtml = `
          <div style="text-align: center; padding: 24px 0; color: #94a3b8;">
            <div style="font-size: 2.5rem; margin-bottom: 8px;">📬</div>
            <p>No new incoming friend requests.</p>
            <p style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">Send requests to your college classmates from the Study Squad tab!</p>
          </div>
        `;
      } else {
        requestsHtml = pending.map(req => `
          <div class="notification-item-card" id="reqCard_${req.id}">
            <div class="notif-top">
              <span class="notif-avatar">${req.fromAvatar || '👨‍🎨'}</span>
              <div class="notif-info">
                <h4>${req.fromName}</h4>
                <span>${req.fromCollege || 'Govt. Engineering College Ajmer'}</span>
              </div>
            </div>
            <p class="notif-msg">"${req.message || 'Wants to join your focus accountability squad!'}"</p>
            <div class="notif-actions">
              <button class="btn-accept-request" onclick="window.handleAcceptFriend('${req.id}', '${req.fromName}')">
                Accept Friend ✅
              </button>
              <button class="btn-decline-request" onclick="window.handleDeclineFriend('${req.id}')">
                Decline ❌
              </button>
            </div>
          </div>
        `).join('');
      }

      showModal('🔔 Friend Requests & Alerts', `
        <div style="margin-bottom: 12px; font-size: 0.82rem; color: #94a3b8;">
          Connect with college classmates to build daily study streaks together.
        </div>
        <div id="friendRequestsList">
          ${requestsHtml}
        </div>
      `);
    });
  }

  window.handleAcceptFriend = async (reqId, friendName) => {
    await window.apiClient.respondFriendRequest(reqId, 'accept');
    const card = document.getElementById(`reqCard_${reqId}`);
    if (card) {
      card.innerHTML = `<div style="color: #4ade80; font-weight: 700; text-align: center; padding: 8px;">✅ Connected with ${friendName}! Added to Study Squad.</div>`;
    }
    updateNotificationBadge();
    if (window.groupSyncController) window.groupSyncController.loadGroupData();
    showToast(`Added ${friendName} to Study Circle! ☕`);
  };

  window.handleDeclineFriend = async (reqId) => {
    await window.apiClient.respondFriendRequest(reqId, 'decline');
    const card = document.getElementById(`reqCard_${reqId}`);
    if (card) {
      card.remove();
    }
    updateNotificationBadge();
  };

  // College Team Info Modal
  const teamInfoBtn = document.getElementById('teamInfoBtn');
  if (teamInfoBtn) {
    teamInfoBtn.addEventListener('click', () => {
      showModal("SPARKX — SPhINX'26 Hackathon", `
        <div class="team-modal-content">
          <div class="team-badge-header">
            <h4>GOVERNMENT ENGINEERING COLLEGE AJMER</h4>
            <p>Problem 1.2: Digital Wellbeing & Screen Time Coach for Students</p>
            <span style="background: #2563eb; color: #fff; padding: 2px 8px; border-radius: 8px; font-size: 0.68rem; font-weight: 800;">
              1st Year Engineering Team Project
            </span>
          </div>
          <div class="team-list" style="margin-top: 10px;">
            <div class="member-item"><strong>Nakul Dadhich</strong> <span class="member-role">Team Leader</span></div>
            <div class="member-item"><strong>Gaurav Kumar</strong> <span class="member-role">PPT & UI/UX</span></div>
            <div class="member-item"><strong>Ankit Kumar Meena</strong> <span class="member-role">Gaze Detection AI</span></div>
            <div class="member-item"><strong>Bhumika Rawat</strong> <span class="member-role">Backend & Database</span></div>
          </div>
          <div class="uniqueness-box">
            <h5>Our Three Uniqueness Pillars:</h5>
            <ul>
              <li><strong>Focus Reward:</strong> Earn consistency coins, 100 Day-1 bonus & redeemable perks.</li>
              <li><strong>Live Detection:</strong> Real-time camera gaze & 10-second tab switch guard.</li>
              <li><strong>Competition Score:</strong> Privacy-preserving leaderboard (Name & Rank only).</li>
            </ul>
          </div>
        </div>
      `);
    });
  }

  function showToast(msg) {
    const toast = document.getElementById('interventionToast');
    const toastText = document.getElementById('toastMessageText');
    if (toast && toastText) {
      toastText.innerHTML = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3500);
    }
  }

  // Desktop Expanded View Toggle
  const toggleFrameBtn = document.getElementById('toggleFrameBtn');
  const deviceWrapper = document.getElementById('deviceWrapper');
  if (toggleFrameBtn && deviceWrapper) {
    toggleFrameBtn.addEventListener('click', () => {
      deviceWrapper.classList.toggle('desktop-expanded');
      toggleFrameBtn.textContent = deviceWrapper.classList.contains('desktop-expanded') ? '📱 Mobile Frame' : '🖥️ Expanded View';
    });
  }

  // INITIAL STATE ON LOAD:
  // Strictly start on Auth View (Sign Up / Sign In) unless actively logged in during this session!
  if (!window.apiClient.currentUser) {
    showView('auth');
  } else {
    showView('main');
    window.gamificationEngine.setUser(window.apiClient.currentUser);
    const bannerName = document.getElementById('bannerStudentName');
    const bannerCollege = document.getElementById('bannerStudentCollege');
    const headerProfileName = document.getElementById('headerProfileName');
    if (bannerName) bannerName.textContent = window.apiClient.currentUser.name;
    if (bannerCollege) bannerCollege.textContent = window.apiClient.currentUser.college || 'GEC Ajmer';
    if (headerProfileName) headerProfileName.textContent = window.apiClient.currentUser.name.split(' ')[0];
    updateNotificationBadge();
    loadSentFriendRequests();
  }
});
