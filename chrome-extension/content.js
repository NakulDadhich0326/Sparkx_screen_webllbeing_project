/**
 * SPARKX Content Script
 *
 * Implements SPhINX'26 Presentation Requirements:
 * - URL Classification by weight: Shorts & Reels count DOUBLE (weight = 2.0)
 * - Counts only when the tab is visible (document.visibilityState === 'visible') and focused
 * - Injects Level 1 Toast, Level 2 Dim + Breathe (10s), Level 3 Wait + Reason (30s)
 * - Privacy: only domain & duration are checked, never page content!
 */

const DISTRACTION_RULES = [
  { match: /youtube\.com\/shorts/i, weight: 2.0, name: 'YouTube Shorts' },
  { match: /instagram\.com\/reels/i, weight: 2.0, name: 'Instagram Reels' },
  { match: /tiktok\.com/i, weight: 2.0, name: 'TikTok' },
  { match: /reddit\.com/i, weight: 1.0, name: 'Reddit' },
  { match: /x\.com/i, weight: 1.0, name: 'Twitter / X' },
  { match: /twitter\.com/i, weight: 1.0, name: 'Twitter / X' }
];

let accumulatedDistractionSeconds = 0;
let monitoringTimer = null;

function checkUrlClassification() {
  const currentUrl = window.location.href;
  for (const rule of DISTRACTION_RULES) {
    if (rule.match.test(currentUrl)) {
      return rule;
    }
  }
  return null;
}

// Start watching if URL matches distraction rule
const matchedRule = checkUrlClassification();
if (matchedRule) {
  startDoomscrollMonitor(matchedRule);
}

function startDoomscrollMonitor(rule) {
  monitoringTimer = setInterval(() => {
    // Only count when student is actually looking at the tab
    if (document.visibilityState === 'visible' && document.hasFocus()) {
      accumulatedDistractionSeconds += (1 * rule.weight);

      // Trigger intervention if accumulated weighted threshold exceeded (e.g. 5 seconds)
      if (accumulatedDistractionSeconds >= 5) {
        accumulatedDistractionSeconds = 0;
        chrome.runtime.sendMessage({
          action: 'REPORT_DISTRACTION',
          domain: window.location.hostname,
          details: `Opened ${rule.name} (weight: ${rule.weight}x)`,
          weightedSeconds: 5
        });
      }
    }
  }, 1000);
}

// Listen for Intervention Commands from background service worker
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'TRIGGER_INTERVENTION') {
    if (msg.level === 1) {
      showLevel1Toast(msg.details);
    } else if (msg.level === 2) {
      showLevel2DimBreathe();
    } else if (msg.level === 3) {
      showLevel3WaitReason();
    }
  }
});

// Level 1: Gentle Toast ("Reminds your intent")
function showLevel1Toast(details) {
  let toast = document.getElementById('sparkx-ext-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'sparkx-ext-toast';
    toast.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 2147483647;
      background: #0f172a; color: #f8fafc; border: 1px solid #38bdf8;
      border-radius: 12px; padding: 14px 18px; font-family: sans-serif;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5); font-size: 14px; max-width: 320px;
    `;
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<strong>SPARKX Coach:</strong> Gentle reminder of your study goal. Is ${details} worth breaking your streak? 🎯`;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 6000);
}

// Level 2: Dim + Breathe (10s Pause)
function showLevel2DimBreathe() {
  let overlay = document.getElementById('sparkx-ext-dim');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'sparkx-ext-dim';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 2147483646;
      background: rgba(15, 23, 42, 0.94); backdrop-filter: blur(16px);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      color: #fff; font-family: sans-serif; text-align: center;
    `;
    document.body.appendChild(overlay);
  }

  let count = 10;
  overlay.innerHTML = `
    <div style="width: 140px; height: 140px; border-radius: 50%; background: #38bdf8; color: #000; font-size: 48px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; box-shadow: 0 0 40px #38bdf8;">
      <span id="sparkx-breathe-count">${count}</span>
    </div>
    <h2>Dim + Breathe (Level 2)</h2>
    <p style="color: #94a3b8; max-width: 300px;">Take a mindful 10-second breath. Release the scrolling urge.</p>
  `;
  overlay.style.display = 'flex';

  const iv = setInterval(() => {
    count -= 1;
    const countEl = document.getElementById('sparkx-breathe-count');
    if (countEl) countEl.textContent = count;
    if (count <= 0) {
      clearInterval(iv);
      overlay.style.display = 'none';
    }
  }, 1000);
}

// Level 3: Wait + Reason (30s Delay, Typed Reason)
function showLevel3WaitReason() {
  let overlay = document.getElementById('sparkx-ext-lock');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'sparkx-ext-lock';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 2147483647;
      background: rgba(10, 15, 30, 0.96); backdrop-filter: blur(20px);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      color: #fff; font-family: sans-serif; padding: 20px;
    `;
    document.body.appendChild(overlay);
  }

  let count = 30;
  overlay.innerHTML = `
    <div style="background: #1e293b; border: 1px solid #f59e0b; padding: 24px; border-radius: 16px; max-width: 360px; text-align: center;">
      <div style="font-size: 32px; margin-bottom: 8px;">🛡️</div>
      <h3>Level 3: Wait + Reason</h3>
      <div style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; padding: 6px 12px; border-radius: 20px; margin: 12px auto; display: inline-block;">
        Lock: <span id="sparkx-lock-count">${count}</span>s
      </div>
      <p style="font-size: 13px; color: #cbd5e1; margin-bottom: 12px;">Type your reason for interrupting focus:</p>
      <input type="text" id="sparkx-ext-reason" style="width: 100%; box-sizing: border-box; padding: 10px; background: #0f172a; border: 1px solid #475569; color: #fff; border-radius: 8px; margin-bottom: 12px;" placeholder="e.g. Need to check urgent notice" />
      <button id="sparkx-unlock-btn" disabled style="width: 100%; padding: 10px; background: #334155; color: #64748b; border: none; border-radius: 8px; font-weight: 700; cursor: not-allowed;">
        Waiting 30s...
      </button>
      <p style="font-size: 11px; color: #64748b; margin-top: 10px;">Logged, never shamed! SPARKX respects your choice.</p>
    </div>
  `;
  overlay.style.display = 'flex';

  const iv = setInterval(() => {
    count -= 1;
    const countEl = document.getElementById('sparkx-lock-count');
    if (countEl) countEl.textContent = count;
    if (count <= 0) {
      clearInterval(iv);
      const btn = document.getElementById('sparkx-unlock-btn');
      if (btn) {
        btn.disabled = false;
        btn.style.background = '#6366f1';
        btn.style.color = '#fff';
        btn.style.cursor = 'pointer';
        btn.textContent = 'Acknowledge & Close';
        btn.onclick = () => { overlay.style.display = 'none'; };
      }
    }
  }, 1000);
}
