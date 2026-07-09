// Welcome / onboarding page logic

document.addEventListener('DOMContentLoaded', () => {
  // Inject version from manifest
  document.getElementById('version').textContent = `v${chrome.runtime.getManifest().version}`;

  // Apply dark mode using the same setting as the popup
  chrome.storage.sync.get({ darkMode: 'auto' }, (settings) => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (settings.darkMode === 'dark' || (settings.darkMode === 'auto' && prefersDark)) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  });

  document.getElementById('open-settings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  document.getElementById('open-privacy').addEventListener('click', () => {
    window.open('https://github.com/dzienisz/chrome-ssr-csr/blob/main/extension/privacy-policy.md', '_blank');
  });

  // Live pin status: Chrome offers no API to pin programmatically,
  // but getUserSettings() tells us whether the user has done it.
  updatePinStatus();
  setInterval(updatePinStatus, 1000);
});

function updatePinStatus() {
  if (!chrome.action || !chrome.action.getUserSettings) return;

  chrome.action.getUserSettings((settings) => {
    const status = document.getElementById('pin-status');
    if (settings.isOnToolbar) {
      status.textContent = '✅ Pinned — you\'re all set!';
      status.classList.add('pinned');
    } else {
      status.textContent = '📌 Not pinned yet';
      status.classList.remove('pinned');
    }
  });
}
