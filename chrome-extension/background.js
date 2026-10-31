/**
 * SPARKX Chrome Extension - Background Service Worker (Manifest V3)
 *
 * Requirements from SPhINX'26 Presentation (Page 3):
 * 1. "a service worker keeps the session state and uses chrome.alarms with stored timestamps,
 *    so timers survive when the worker sleeps."
 * 2. "The phone starts and stops sessions, and the extension polls the server for them."
 * 3. "The background script keeps total across all tabs."
 * 4. "Privacy and reliability: only domains and durations are sent, never page content,
 *    and the extension keeps enforcing locally if the server is offline."
 */

const API_BASE = 'http://localhost:8080/api';

// Initialize alarms on extension install
chrome.runtime.onInstalled.addListener(() => {
  console.log('[SPARKX Worker] Installed. Setting up alarms and timestamp state.');
  chrome.alarms.create('sync_session_alarm', { periodInMinutes: 0.1 }); // Every 6 seconds
});

// Alarm Handler (survives service worker idling)
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'sync_session_alarm') {
    await checkAndSyncActiveSession();
  }
});

// Check phone session by polling backend API
async function checkAndSyncActiveSession() {
  try {
    const response = await fetch(`${API_BASE}/sessions/history`);
    if (!response.ok) return;

    const data = await response.json();
    const active = (data.sessions || []).find(s => s.status === 'ACTIVE');

    if (active) {
      await chrome.storage.local.set({
        sparkx_session_active: true,
        sparkx_session_id: active.id,
        sparkx_started_at: active.startedAt
      });
    } else {
      await chrome.storage.local.set({ sparkx_session_active: false });
    }
  } catch (err) {
    // PDF Page 3: "the extension keeps enforcing locally if the server is offline"
    // Keep enforcing existing local storage state
  }
}

// Receive messages from content script (URL classification and infraction notifications)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'REPORT_DISTRACTION') {
    handleDistractionEvent(message, sender.tab);
    sendResponse({ received: true });
  } else if (message.action === 'GET_SESSION_STATE') {
    chrome.storage.local.get(['sparkx_session_active', 'sparkx_session_id'], (result) => {
      sendResponse(result);
    });
    return true; // Keep channel open for async response
  }
});

// Escalation state across tabs
let currentInterventionLevel = 0;

async function handleDistractionEvent(data, tab) {
  currentInterventionLevel = Math.min(3, currentInterventionLevel + 1);

  // Send intervention action to tab content script
  if (tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'TRIGGER_INTERVENTION',
      level: currentInterventionLevel,
      details: data.details,
      weightedSeconds: data.weightedSeconds
    });
  }

  // Notify backend API (privacy-preserving: only domain & duration, never page content)
  try {
    const sessionData = await chrome.storage.local.get(['sparkx_session_id']);
    await fetch(`${API_BASE}/sessions/distraction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionData.sparkx_session_id || 'ext_local',
        level: currentInterventionLevel,
        triggerType: 'URL_DISTRACTION',
        details: `Visited ${data.domain} (${data.weightedSeconds}s weighted doomscroll)`
      })
    });
  } catch (e) {
    // Offline resilience
  }
}
