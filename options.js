// Default settings
const DEFAULT_SETTINGS = {
  darkMode: false,
  historyLimit: 10,
  notifications: true,
  shareData: false
};

// Load settings when page opens
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupEventListeners();
});

// Load settings from storage
function loadSettings() {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
    // Apply settings to UI
    document.getElementById('darkMode').checked = settings.darkMode;
    document.getElementById('historyLimit').value = settings.historyLimit;
    document.getElementById('notifications').checked = settings.notifications;
    document.getElementById('shareData').checked = settings.shareData;

    // Apply dark mode if enabled
    if (settings.darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  });
}

// Save settings to storage
function saveSettings() {
  const settings = {
    darkMode: document.getElementById('darkMode').checked,
    historyLimit: parseInt(document.getElementById('historyLimit').value),
    notifications: document.getElementById('notifications').checked,
    shareData: document.getElementById('shareData').checked
  };

  chrome.storage.sync.set(settings, () => {
    // Apply dark mode immediately
    if (settings.darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

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

  // Dark mode toggle - apply immediately
  document.getElementById('darkMode').addEventListener('change', (e) => {
    if (e.target.checked) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  });

  // Auto-save on toggle switches (optional - comment out if you want manual save only)
  /*
  document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', saveSettings);
  });

  document.getElementById('historyLimit').addEventListener('change', saveSettings);
  */
}
