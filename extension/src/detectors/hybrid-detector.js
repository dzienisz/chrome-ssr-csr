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
  const signals = [];
  let hybridScore = 0;
  const details = {};

  // Detect Astro islands architecture
  const astroIslands = document.querySelectorAll(
    "[data-astro-island], astro-island",
  );
  if (astroIslands.length > 0) {
    hybridScore += 30;
    indicators.push(
      `Astro islands architecture (${astroIslands.length} islands)`,
    );
    signals.push({
      id: "hybrid.astroIslands",
      label: `Astro islands (${astroIslands.length})`,
      impact: "hybrid",
      weight: 30,
      detail: "Static HTML with independently hydrated interactive components dropped into it.",
    });
    details.astroIslands = astroIslands.length;
  }

  // Detect multiple hydration targets (common in partial hydration)
  const hydrationTargets = document.querySelectorAll(
    "[data-hydrate], [data-island], [data-client], [client\\:load], [client\\:idle], [client\\:visible]",
  );
  if (hydrationTargets.length > 1) {
    hybridScore += 25;
    indicators.push(
      `Partial hydration pattern (${hydrationTargets.length} targets)`,
    );
    signals.push({
      id: "hybrid.partialHydration",
      label: `Partial hydration (${hydrationTargets.length} targets)`,
      impact: "hybrid",
      weight: 25,
      detail: "Only marked regions get JavaScript; the rest of the page stays static server markup.",
    });
    details.hydrationTargets = hydrationTargets.length;
  }

  // Detect React Server Components patterns
  const hasServerComponents =
    document.querySelector("[data-rsc], [data-server-component]") !== null;
  if (hasServerComponents) {
    hybridScore += 20;
    indicators.push("React Server Components detected");
    signals.push({
      id: "hybrid.rsc",
      label: "React Server Components",
      impact: "hybrid",
      weight: 20,
      detail: "Components rendered on the server stream into a client tree that never ships their code.",
    });
    details.hasRSC = true;
  }

  // Detect streaming markers (Suspense boundaries)
  const suspenseBoundaries = document.querySelectorAll(
    "template[data-suspense], [data-suspense-boundary]",
  );
  const bodyHTML = window.getDetectionBodyHTML();
  const streamingComments =
    bodyHTML.includes("<!--$-->") || bodyHTML.includes("<!--/$-->");
  if (suspenseBoundaries.length > 0 || streamingComments) {
    hybridScore += 15;
    indicators.push("Streaming SSR with Suspense boundaries");
    signals.push({
      id: "hybrid.streaming",
      label: "Streaming SSR with Suspense",
      impact: "hybrid",
      weight: 15,
      detail: "The server flushed the shell first and filled the slow parts in as they resolved.",
    });
    details.hasStreaming = true;
  }

  // Detect progressive enhancement patterns
  const enhancementMarkers = document.querySelectorAll(
    "[data-enhance], [data-progressive], [data-turbo], [data-turbolinks]",
  );
  if (enhancementMarkers.length > 0) {
    hybridScore += 15;
    indicators.push("Progressive enhancement pattern");
    signals.push({
      id: "hybrid.progressive",
      label: "Progressive enhancement",
      impact: "hybrid",
      weight: 15,
      detail: "Server markup is enhanced in place (Turbo/Stimulus-style) instead of replaced by a client app.",
    });
    details.progressiveEnhancement = true;
  }

  // Detect Qwik's resumability (hybrid by design)
  const qwikContainer = document.querySelector("[q\\:container]");
  if (qwikContainer) {
    hybridScore += 25;
    indicators.push("Qwik resumability (hybrid architecture)");
    signals.push({
      id: "hybrid.qwik",
      label: "Qwik resumability",
      impact: "hybrid",
      weight: 25,
      detail: "State is serialized into the HTML so the client resumes rather than re-executing the app.",
    });
    details.qwikResumability = true;
  }

  // Check for mixed content patterns (rich SSR content + client interactivity)
  const hasRichContent =
    document.querySelectorAll('article, main, [role="main"]').length > 0 &&
    document.body.innerText.trim().length > 500;
  const hasClientInteractivity =
    document.querySelectorAll(
      '[onclick], [onchange], button[type="submit"], form[action], [data-action]',
    ).length > 3;

  if (hasRichContent && hasClientInteractivity) {
    hybridScore += 10;
    indicators.push("Mixed SSR content with client interactivity");
    signals.push({
      id: "hybrid.mixed",
      label: "Server content plus client interactivity",
      impact: "hybrid",
      weight: 10,
      detail: "A real document body alongside enough interactive controls to need a client runtime.",
    });
  }

  return {
    hybridScore,
    indicators,
    signals,
    details,
  };
}

// Export for use in other modules
if (typeof window !== "undefined") {
  window.detectHybridPatterns = detectHybridPatterns;
}
