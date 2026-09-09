/**
 * SSR Detector Probe
 * Runs in the MAIN world to intercept console logs and navigation events
 */

(function () {
  // Prevent multiple injections
  if (window.__SSR_DETECTOR_PROBE_ACTIVE__) return;
  window.__SSR_DETECTOR_PROBE_ACTIVE__ = true;

  const MAX_NAVIGATION_SAMPLES = 100;
  const MAX_HYDRATION_SAMPLES = 5;
  const STORE = {
    hydrationErrorCount: 0,
    navigationCount: 0,
    hydrationErrors: [],
    navigations: [],
    startTime: Date.now(),
  };

  // 1. Intercept Console Errors (Hydration Mismatches)
  const originalConsoleError = console.error;
  console.error = function (...args) {
    // Call original
    originalConsoleError.apply(console, args);

    try {
      // Analyze for hydration patterns
      const msg = args.map((a) => String(a)).join(" ");

      const isHydrationError =
        msg.includes("Text content does not match server-rendered HTML") ||
        msg.includes("Hydration failed") ||
        msg.includes("There was an error while hydrating") ||
        msg.includes("Prop `className` did not match") || // React
        msg.includes("Hydration node mismatch") || // Vue
        msg.includes("Client-side rendered virtual DOM tree is not matching"); // Vue

      if (isHydrationError) {
        STORE.hydrationErrorCount++;
        if (STORE.hydrationErrors.length >= MAX_HYDRATION_SAMPLES)
          STORE.hydrationErrors.shift();
        STORE.hydrationErrors.push({
          msg: msg.substring(0, 200), // Truncate
          time: Date.now() - STORE.startTime,
        });
      }
    } catch (e) {
      // safe fail
    }
  };

  // 2. Record client-side route changes.
  // Two sources, because neither covers everything: the Navigation API sees
  // routers that never touch history.*, and the history patch still works in
  // engines that ship no Navigation API. Whether pushState() also surfaces as
  // a navigate event differs by engine, so record() dedupes instead of
  // assuming either way.
  function record(type, source, viewOverride) {
    try {
      // The navigate event fires *before* the URL changes, so its destination
      // is the only correct view for that source.
      const view = viewOverride || window.location.pathname;
      const time = Date.now() - STORE.startTime;
      const last = STORE.navigations[STORE.navigations.length - 1];
      if (last && last.view === view && time - last.time < 50) return;
      STORE.navigationCount++;
      if (STORE.navigations.length >= MAX_NAVIGATION_SAMPLES)
        STORE.navigations.shift();
      STORE.navigations.push({ type, view, time, source });
    } catch (e) {}
  }

  function proxyHistory(method) {
    const original = history[method];
    history[method] = function (...args) {
      const result = original.apply(history, args);
      record(method, "history");
      return result;
    };
  }

  proxyHistory("pushState");
  proxyHistory("replaceState");

  // Navigation API — Baseline since Firefox 147 (Jan 2026), so this is the
  // cross-browser path now, not a Chromium-only extra.
  if (
    window.navigation &&
    typeof window.navigation.addEventListener === "function"
  ) {
    try {
      window.navigation.addEventListener("navigate", function (event) {
        // Same-document only: a full document load ends this probe anyway.
        if (event.destination && event.destination.sameDocument === false)
          return;
        let view;
        try {
          view = new URL(event.destination.url).pathname;
        } catch (e) {}
        record(event.navigationType || "navigate", "navigation-api", view);
      });
      STORE.hasNavigationApi = true;
    } catch (e) {}
  }

  // 3. Listen for Data Request from Isolated World
  window.addEventListener("ssr-detector-request-data", function () {
    const dataDisplay = document.getElementById("ssr-detector-probe-data");
    if (dataDisplay) {
      dataDisplay.textContent = JSON.stringify(STORE);
      dataDisplay.dataset.status = "ready";
    } else {
      // Create if missing (should be created by analyzer, but fallback here)
      const div = document.createElement("div");
      div.id = "ssr-detector-probe-data";
      div.style.display = "none";
      div.textContent = JSON.stringify(STORE);
      div.dataset.status = "ready";
      document.body.appendChild(div);
    }
  });
})();
