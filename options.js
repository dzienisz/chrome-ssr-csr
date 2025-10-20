// Default settings
const DEFAULT_SETTINGS = {
  darkMode: 'auto', // 'auto', 'light', 'dark'
  historyLimit: 10,
  notifications: true,
  shareData: false
};

// Load settings when page opens
document.addEventListener('DOMContentLoaded', () => {
  // Inject version from manifest
  document.getElementById('version').textContent = `v${chrome.runtime.getManifest().version}`;

  loadSettings();
  setupEventListeners();
});

// Load settings from storage
function loadSettings() {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
    // Apply settings to UI
    document.getElementById('darkMode').value = settings.darkMode;
    document.getElementById('historyLimit').value = settings.historyLimit;
    document.getElementById('notifications').checked = settings.notifications;
    document.getElementById('shareData').checked = settings.shareData;

    // Apply dark mode based on setting
    applyDarkMode(settings.darkMode);
  });
}

// Apply dark mode based on setting (auto/light/dark)
function applyDarkMode(mode) {
  if (mode === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else if (mode === 'light') {
    document.documentElement.removeAttribute('data-theme');
  } else { // auto
    // Detect system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }
}

// Save settings to storage
function saveSettings() {
  const settings = {
    darkMode: document.getElementById('darkMode').value,
    historyLimit: parseInt(document.getElementById('historyLimit').value),
    notifications: document.getElementById('notifications').checked,
    shareData: document.getElementById('shareData').checked
  };

  chrome.storage.sync.set(settings, () => {
    // Apply dark mode immediately
    applyDarkMode(settings.darkMode);

    // Show success message
    showStatusMessage('Settings saved successfully!');

    // Notify popup to update if it's open (ignore errors if popup is closed)
    try {
      chrome.runtime.sendMessage({
        action: 'settingsUpdated',
        settings: settings
      }, () => {
        // Ignore error if popup isn't open
        if (chrome.runtime.lastError) {
          // Silently ignore - popup just isn't open
        }
      });
    } catch (e) {
      // Silently ignore - popup isn't open
    }
  });
}

// Reset to default settings
function resetSettings() {
  if (confirm('Are you sure you want to reset all settings to defaults?')) {
    chrome.storage.sync.set(DEFAULT_SETTINGS, () => {
      loadSettings();
      showStatusMessage('Settings reset to defaults!');
    });
  }
}


// Show status message
function showStatusMessage(message) {
  const statusEl = document.getElementById('statusMessage');
  statusEl.textContent = message;
  statusEl.classList.add('show');

  setTimeout(() => {
    statusEl.classList.remove('show');
  }, 3000);
}

// Setup event listeners
function setupEventListeners() {
  // Save button
  document.getElementById('saveButton').addEventListener('click', saveSettings);

  // Reset button
  document.getElementById('resetButton').addEventListener('click', resetSettings);

  // Dark mode select - apply immediately on change
  document.getElementById('darkMode').addEventListener('change', (e) => {
    applyDarkMode(e.target.value);
  });

  // Auto-save on toggle switches (optional - comment out if you want manual save only)
  /*
  document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', saveSettings);
  });

  document.getElementById('historyLimit').addEventListener('change', saveSettings);
  */
}
