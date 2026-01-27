/**
 * SSR Detector Probe
 * Runs in the MAIN world to intercept console logs and navigation events
 */

(function() {
  // Prevent multiple injections
  if (window.__SSR_DETECTOR_PROBE_ACTIVE__) return;
  window.__SSR_DETECTOR_PROBE_ACTIVE__ = true;

  const STORE = {
    hydrationErrors: [],
    navigations: [],
    startTime: Date.now()
  };

  // 1. Intercept Console Errors (Hydration Mismatches)
  const originalConsoleError = console.error;
  console.error = function(...args) {
    // Call original
    originalConsoleError.apply(console, args);

    try {
      // Analyze for hydration patterns
      const msg = args.map(a => String(a)).join(' ');
      
      const isHydrationError = 
        msg.includes('Text content does not match server-rendered HTML') ||
        msg.includes('Hydration failed') ||
        msg.includes('There was an error while hydrating') ||
        msg.includes('Prop `className` did not match') || // React
        msg.includes('Hydration node mismatch') || // Vue
        msg.includes('Client-side rendered virtual DOM tree is not matching'); // Vue

      if (isHydrationError) {
        STORE.hydrationErrors.push({
          msg: msg.substring(0, 200), // Truncate
          time: Date.now() - STORE.startTime
        });
      }
    } catch (e) {
      // safe fail
    }
  };

  // 2. Intercept History API (Soft Navigations)
  function proxyHistory(method) {
    const original = history[method];
    history[method] = function(...args) {
      const result = original.apply(history, args);
      try {
        STORE.navigations.push({
          type: method,
          view: window.location.pathname,
          time: Date.now() - STORE.startTime
        });
      } catch (e) {}
      return result;
    };
  }

  proxyHistory('pushState');
  proxyHistory('replaceState');

  // 3. Listen for Data Request from Isolated World
  window.addEventListener('ssr-detector-request-data', function() {
    const dataDisplay = document.getElementById('ssr-detector-probe-data');
    if (dataDisplay) {
      dataDisplay.textContent = JSON.stringify(STORE);
      dataDisplay.dataset.status = 'ready';
    } else {
      // Create if missing (should be created by analyzer, but fallback here)
      const div = document.createElement('div');
      div.id = 'ssr-detector-probe-data';
      div.style.display = 'none';
      div.textContent = JSON.stringify(STORE);
      div.dataset.status = 'ready';
      document.body.appendChild(div);
    }
  });

})();
