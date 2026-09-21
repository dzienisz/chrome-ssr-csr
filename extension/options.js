/**
 * Options page controller.
 *
 * Settings live in chrome.storage.sync so they follow the user between
 * profiles; the analysis history stays in storage.local because it names the
 * sites you visited and has no business syncing anywhere.
 */

const DEFAULT_SETTINGS = {
  darkMode: "auto",
  historyLimit: 10,
  notifications: true,
  shareData: true,
  autoAnalyze: true,
};

const FIELDS = {
  darkMode: { el: "darkMode", type: "value" },
  historyLimit: { el: "historyLimit", type: "number" },
  notifications: { el: "notifications", type: "checked" },
  shareData: { el: "shareData", type: "checked" },
  autoAnalyze: { el: "autoAnalyze", type: "checked" },
};

document.addEventListener("DOMContentLoaded", () => {
  window.applyI18n(document);
  document.getElementById("version").textContent = `v${chrome.runtime.getManifest().version}`;

  loadSettings();
  showConfiguredShortcut();

  document.getElementById("save").addEventListener("click", saveSettings);
  document.getElementById("reset").addEventListener("click", resetSettings);
  document.getElementById("darkMode").addEventListener("change", (event) => {
    applyDarkMode(event.target.value);
  });
});

function loadSettings() {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
    for (const [key, field] of Object.entries(FIELDS)) {
      const node = document.getElementById(field.el);
      if (field.type === "checked") node.checked = Boolean(settings[key]);
      else node.value = String(settings[key]);
    }
    applyDarkMode(settings.darkMode);
  });
}

function readSettings() {
  const settings = {};
  for (const [key, field] of Object.entries(FIELDS)) {
    const node = document.getElementById(field.el);
    if (field.type === "checked") settings[key] = node.checked;
    else if (field.type === "number") settings[key] = parseInt(node.value, 10);
    else settings[key] = node.value;
  }
  return settings;
}

function applyDarkMode(mode) {
  const dark =
    mode === "dark" ||
    (mode === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  if (dark) document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
}

function saveSettings() {
  const settings = readSettings();
  chrome.storage.sync.set(settings, () => {
    applyDarkMode(settings.darkMode);
    toast(window.t("settingsSaved", "Settings saved"));

    // The popup may be open; tell it to re-theme. It is usually closed, and a
    // closed popup makes this call fail — which is not an error worth showing.
    try {
      chrome.runtime.sendMessage({ action: "settingsUpdated", settings }, () => {
        void chrome.runtime.lastError;
      });
    } catch (e) {
      void e;
    }
  });
}

function resetSettings() {
  chrome.storage.sync.set(DEFAULT_SETTINGS, () => {
    loadSettings();
    toast(window.t("settingsReset", "Settings reset to defaults"));
  });
}

/**
 * Show the shortcut the user actually has bound rather than the one the
 * manifest suggests — browsers drop a suggested key when it is already taken.
 */
function showConfiguredShortcut() {
  if (!chrome.commands || !chrome.commands.getAll) return;
  chrome.commands.getAll((commands) => {
    const command = (commands || []).find((c) => c.name === "_execute_action");
    const node = document.getElementById("shortcut");
    if (command && command.shortcut) node.textContent = command.shortcut;
    else node.textContent = window.t("shortcutUnset", "Not set");
  });
}

function toast(message) {
  const node = document.getElementById("toast");
  node.textContent = message;
  node.classList.add("show");
  setTimeout(() => node.classList.remove("show"), 2200);
}
