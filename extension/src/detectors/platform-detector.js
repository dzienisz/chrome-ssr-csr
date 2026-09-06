/**
 * Modern Platform Detector Module
 *
 * Signals from web-platform features that postdate the original scoring model
 * (2026): the Speculation Rules API, cross-document view transitions and
 * declarative partial updates. All three say something about a page's
 * rendering architecture that no framework marker does.
 *
 * Every signal is credited from the RAW HTML only. Speculation rules and
 * partial-update templates injected by JS after boot describe what the client
 * did, not what the server sent — the same rule framework-detector applies to
 * hydration markers.
 */

/**
 * @param {Document|null} rawDocument - Parsed raw (pre-JS) HTML document
 * @param {string|null} rawHTML - Raw HTML source for the same fetch
 * @returns {Object} Detection results with score and indicators
 */
function detectPlatformSignals(rawDocument, rawHTML) {
  const config = window.DETECTOR_CONFIG;
  const indicators = [];
  let ssrScore = 0;
  let csrScore = 0;
  const details = {};

  const rawSource = rawHTML ||
    (rawDocument && rawDocument.documentElement
      ? rawDocument.documentElement.outerHTML
      : '');

  // --- Speculation Rules: prerendering/prefetching whole documents only
  // makes sense when navigations *are* document loads, i.e. an MPA.
  if (rawDocument) {
    const specRules = rawDocument.querySelectorAll('script[type="speculationrules"]');
    if (specRules.length > 0) {
      ssrScore += config.scoring.speculationRules;
      indicators.push(`speculation rules in raw HTML (${specRules.length}) - multi-page architecture (SSR)`);
      details.speculationRules = specRules.length;
    }
  }

  // --- Cross-document view transitions: an MPA that animates between real
  // navigations. Only the at-rule form with navigation:auto is cross-document;
  // document.startViewTransition() (the SPA form) leaves no static marker.
  const crossDocVT = /@view-transition\s*\{[^}]*navigation\s*:\s*(auto|same-origin)/i.test(rawSource);
  if (crossDocVT) {
    ssrScore += config.scoring.crossDocViewTransition;
    indicators.push('@view-transition navigation rule - cross-document transitions (SSR/MPA)');
    details.crossDocumentViewTransitions = true;
  }

  // --- Declarative partial updates: out-of-order HTML streaming with no JS
  // at all. DOMParser turns the processing instructions into bogus comments,
  // so the raw source is the only reliable place to look for them.
  const hasPartialMarkers = /<\?(start|end|marker)[\s?>]/.test(rawSource);
  const hasTemplateFor = /<template[^>]*\sfor\s*=/.test(rawSource);
  if (hasPartialMarkers && hasTemplateFor) {
    ssrScore += config.scoring.declarativePartialUpdate;
    indicators.push('declarative partial updates - JS-free streaming SSR');
    details.declarativePartialUpdates = true;
  }

  // --- Navigation context. Not scored here: performance-detector needs it to
  // decide whether the timing signals are trustworthy at all, and it is worth
  // reporting either way.
  const navContext = window.getNavigationContext();
  if (navContext.wasPrerendered) {
    indicators.push('page was prerendered before activation - timing signals adjusted');
  } else if (navContext.wasPrefetched) {
    indicators.push('navigation served from a prefetch - timing signals adjusted');
  }
  details.navigationContext = navContext;

  return { ssrScore, csrScore, indicators, details };
}

/**
 * How this document arrived, so timing-based signals can be corrected or
 * discarded. A prerendered document starts its clock long before the user
 * sees it (activationStart), and a prefetched one has a near-zero TTFB it
 * never actually paid — both distort the SSR/CSR timing heuristics.
 *
 * @returns {{wasPrerendered: boolean, wasPrefetched: boolean,
 *            activationStart: number, deliveryType: string,
 *            timingIsReliable: boolean}}
 */
function getNavigationContext() {
  const fallback = {
    wasPrerendered: false,
    wasPrefetched: false,
    activationStart: 0,
    deliveryType: '',
    timingIsReliable: true
  };

  try {
    const navTiming = performance.getEntriesByType('navigation')[0];
    if (!navTiming) return fallback;

    // activationStart is 0 for normal navigations, > 0 once a prerendered
    // document is activated. document.prerendering only covers the window
    // where prerendering is still in flight.
    const activationStart = navTiming.activationStart || 0;
    const deliveryType = navTiming.deliveryType || '';
    const wasPrerendered = activationStart > 0 || document.prerendering === true;
    const wasPrefetched = deliveryType === 'navigational-prefetch';

    return {
      wasPrerendered,
      wasPrefetched,
      activationStart: Math.round(activationStart),
      deliveryType,
      timingIsReliable: !wasPrerendered && !wasPrefetched
    };
  } catch (e) {
    return fallback;
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.detectPlatformSignals = detectPlatformSignals;
  window.getNavigationContext = getNavigationContext;
}
