/**
 * Scoring Module
 * Calculates final scores and classification
 */

/**
 * Calculate final classification based on scores
 * @param {number} ssrScore - Total SSR score
 * @param {number} csrScore - Total CSR score
 * @param {number} hybridScore - Total hybrid score (islands, partial hydration)
 * @param {Array} indicators - All indicators found
 * @returns {Object} Classification with confidence
 */
function calculateClassification(ssrScore, csrScore, hybridScore, indicators) {
  const config = window.DETECTOR_CONFIG;

  const totalScore = ssrScore + csrScore;
  const ssrPercentage = totalScore > 0 ? Math.round((ssrScore / totalScore) * 100) : 50;

  let renderType, confidence;

  // Enhanced confidence calculation
  const indicatorCount = indicators.length;
  const baseConfidence = Math.abs(ssrPercentage - 50) * config.confidence.baseMultiplier;
  const indicatorBonus = Math.min(
    indicatorCount * config.confidence.indicatorBonus,
    config.confidence.maxIndicatorBonus
  );

  // Check for strong hybrid signals first (islands architecture, partial hydration)
  const isStrongHybrid = hybridScore >= 30;
  const hasBothSignals = ssrScore >= 20 && csrScore >= 20;

  // Determine render type and confidence based on thresholds
  if (isStrongHybrid || (hasBothSignals && ssrPercentage >= 35 && ssrPercentage <= 65)) {
    // Strong hybrid indicators or balanced scores with both SSR and CSR signals
    renderType = "Hybrid/Islands Architecture";
    confidence = Math.min(50 + hybridScore + indicatorBonus, config.confidence.maxConfidenceHybrid + 10);
  } else if (ssrPercentage >= config.thresholds.ssr) {
    renderType = "Server-Side Rendered (SSR)";
    confidence = Math.min(baseConfidence + indicatorBonus, config.confidence.maxConfidenceSsr);
  } else if (ssrPercentage <= config.thresholds.csr) {
    renderType = "Client-Side Rendered (CSR)";
    confidence = Math.min(baseConfidence + indicatorBonus, config.confidence.maxConfidenceSsr);
  } else if (ssrPercentage >= config.thresholds.likelySsr) {
    renderType = "Likely SSR with Hydration";
    confidence = Math.min(baseConfidence + indicatorBonus, config.confidence.maxConfidenceLikely);
  } else if (ssrPercentage <= config.thresholds.likelyCsr) {
    renderType = "Likely CSR/SPA";
    confidence = Math.min(baseConfidence + indicatorBonus, config.confidence.maxConfidenceLikely);
  } else {
    renderType = "Hybrid/Mixed Rendering";
    confidence = Math.min(baseConfidence + 10 + (hybridScore / 2), config.confidence.maxConfidenceHybrid);
  }

  return {
    renderType,
    confidence: Math.max(confidence, config.confidence.minConfidence),
    ssrPercentage,
    hybridScore,
    indicatorCount
  };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.calculateClassification = calculateClassification;
}
