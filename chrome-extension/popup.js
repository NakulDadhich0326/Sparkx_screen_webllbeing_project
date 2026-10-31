document.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('syncStatus');

  chrome.runtime.sendMessage({ action: 'GET_SESSION_STATE' }, (res) => {
    if (res && res.sparkx_session_active) {
      statusEl.textContent = 'Phone Focus In Sync 🔥';
      statusEl.style.color = '#34d399';
    } else {
      statusEl.textContent = 'Guard Ready 🛡️';
      statusEl.style.color = '#38bdf8';
    }
  });
});
