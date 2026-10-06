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

  // 3. Snapshot how much text the parser produced on its own. The analyzer
  // normally re-fetches the page to see the server HTML, but bot protection
  // (Cloudflare challenges and the like) often answers that fetch with a 403.
  // readyState turns "interactive" when parsing ends and before deferred and
  // module scripts run, so the text present then is what the server sent —
  // plus whatever classic inline scripts wrote, which makes it an upper bound.
  // Only the length is kept, never the text.
  const SNAPSHOT_SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEMPLATE: 1 };
  function measureParsedText() {
    try {
      const body = document.body;
      if (!body) return;
      const walker = document.createTreeWalker(
        body,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            if (node.nodeType === 3) return NodeFilter.FILTER_ACCEPT;
            return SNAPSHOT_SKIP[node.tagName] ||
              node.id === "ssr-detector-probe-data"
              ? NodeFilter.FILTER_REJECT
              : NodeFilter.FILTER_SKIP;
          },
        },
      );
      let text = "";
      while (walker.nextNode()) text += walker.currentNode.data;
      STORE.parsedTextLength = text.replace(/\s+/g, " ").trim().length;
    } catch (e) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("readystatechange", function onState() {
      if (document.readyState !== "interactive") return;
      document.removeEventListener("readystatechange", onState);
      measureParsedText();
    });
  }

  // 4. Listen for Data Request from Isolated World
  window.addEventListener("ssr-detector-request-data", function () {
    let dataDisplay = document.getElementById("ssr-detector-probe-data");
    if (!dataDisplay) {
      const parent = document.head || document.documentElement;
      if (!parent) return;
      dataDisplay = document.createElement("meta");
      dataDisplay.id = "ssr-detector-probe-data";
      parent.appendChild(dataDisplay);
    }
    dataDisplay.setAttribute("data-ssr-detector-snapshot", JSON.stringify(STORE));
    dataDisplay.textContent = "";
    dataDisplay.style.display = "none";
    dataDisplay.dataset.status = "ready";
  });
})();
