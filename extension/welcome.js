/**
 * Onboarding page.
 *
 * The pin status polls because there is no event for it: browsers expose
 * whether the action is pinned, but not a notification when that changes, and
 * the whole point of the step is to update the moment the user pins it.
 */

const PIN_POLL_MS = 1000;

document.addEventListener("DOMContentLoaded", () => {
  window.applyI18n(document);
  document.getElementById("version").textContent = `v${chrome.runtime.getManifest().version}`;

  chrome.storage.sync.get({ darkMode: "auto" }, (settings) => {
    const dark =
      settings.darkMode === "dark" ||
      (settings.darkMode === "auto" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) document.documentElement.setAttribute("data-theme", "dark");
  });

  document.getElementById("open-settings").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  document.getElementById("open-privacy").addEventListener("click", () => {
    window.open(
      "https://github.com/dzienisz/chrome-ssr-csr/blob/main/extension/privacy-policy.md",
      "_blank",
      "noopener",
    );
  });

  updatePinStatus();
  setInterval(updatePinStatus, PIN_POLL_MS);
});

function updatePinStatus() {
  if (!chrome.action || !chrome.action.getUserSettings) return;

  chrome.action.getUserSettings((settings) => {
    const status = document.getElementById("pin-status");
    if (settings.isOnToolbar) {
      status.textContent = window.t("pinPinned", "Pinned — you're all set.");
      status.classList.add("pinned");
    } else {
      status.textContent = window.t("pinNotPinned", "Not pinned yet");
      status.classList.remove("pinned");
    }
  });
}
