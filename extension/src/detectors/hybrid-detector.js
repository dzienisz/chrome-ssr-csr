/**
 * Hybrid Pattern Detector Module
 * Detects patterns specific to hybrid/islands architecture
 */

/**
 * Detect hybrid rendering patterns (islands, partial hydration, RSC)
 * @returns {Object} Detection results with hybrid indicators
 */
function detectHybridPatterns() {
  const indicators = [];
  let hybridScore = 0;
  const details = {};

  // Detect Astro islands architecture
  const astroIslands = document.querySelectorAll('[data-astro-island], astro-island');
  if (astroIslands.length > 0) {
    hybridScore += 30;
    indicators.push(`Astro islands architecture (${astroIslands.length} islands)`);
    details.astroIslands = astroIslands.length;
  }

  // Detect multiple hydration targets (common in partial hydration)
  const hydrationTargets = document.querySelectorAll(
    '[data-hydrate], [data-island], [data-client], [client\\:load], [client\\:idle], [client\\:visible]'
  );
  if (hydrationTargets.length > 1) {
    hybridScore += 25;
    indicators.push(`Partial hydration pattern (${hydrationTargets.length} targets)`);
    details.hydrationTargets = hydrationTargets.length;
  }

  // Detect React Server Components patterns
  const hasServerComponents = document.querySelector('[data-rsc], [data-server-component]') !== null;
  if (hasServerComponents) {
    hybridScore += 20;
    indicators.push("React Server Components detected");
    details.hasRSC = true;
  }

  // Detect streaming markers (Suspense boundaries)
  const suspenseBoundaries = document.querySelectorAll('template[data-suspense], [data-suspense-boundary]');
  const streamingComments = document.body.innerHTML.includes('<!--$-->') ||
                            document.body.innerHTML.includes('<!--/$-->');
  if (suspenseBoundaries.length > 0 || streamingComments) {
    hybridScore += 15;
    indicators.push("Streaming SSR with Suspense boundaries");
    details.hasStreaming = true;
  }

  // Detect progressive enhancement patterns
  const enhancementMarkers = document.querySelectorAll(
    '[data-enhance], [data-progressive], [data-turbo], [data-turbolinks]'
  );
  if (enhancementMarkers.length > 0) {
    hybridScore += 15;
    indicators.push("Progressive enhancement pattern");
    details.progressiveEnhancement = true;
  }

  // Detect Qwik's resumability (hybrid by design)
  const qwikContainer = document.querySelector('[q\\:container]');
  if (qwikContainer) {
    hybridScore += 25;
    indicators.push("Qwik resumability (hybrid architecture)");
    details.qwikResumability = true;
  }

  // Check for mixed content patterns (rich SSR content + client interactivity)
  const hasRichContent = document.querySelectorAll('article, main, [role="main"]').length > 0 &&
                         document.body.innerText.trim().length > 500;
  const hasClientInteractivity = document.querySelectorAll(
    '[onclick], [onchange], button[type="submit"], form[action], [data-action]'
  ).length > 3;

  if (hasRichContent && hasClientInteractivity) {
    hybridScore += 10;
    indicators.push("Mixed SSR content with client interactivity");
  }

  return {
    hybridScore,
    indicators,
    details
  };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.detectHybridPatterns = detectHybridPatterns;
}
