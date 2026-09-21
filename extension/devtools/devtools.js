/**
 * DevTools entry point. Its only job is to register the panel; everything
 * else happens in panel.js, which is loaded when the panel is first shown.
 */
chrome.devtools.panels.create(
  "Rendering",
  "../icon48.png",
  "panel.html",
  () => {
    // Panel created. Errors here are surfaced by DevTools itself.
  },
);
