/**
 * Results Renderer Module
 * UI components for displaying analysis results
 */

/**
 * Get color based on render type
 * @param {string} renderType - The render type classification
 * @returns {string} Hex color code
 */
function getTypeColor(renderType) {
  if (renderType.includes('SSR')) return '#059669';
  if (renderType.includes('CSR')) return '#dc2626';
  if (renderType.includes('Hybrid')) return '#d97706';
  return '#6b7280';
}

/**
 * Create confidence bar HTML
 * @param {number} confidence - Confidence percentage
 * @returns {string} HTML string for confidence bar
 */
function getConfidenceBar(confidence) {
  const width = Math.max(confidence, 10);
  const color = confidence >= 70 ? '#059669' : confidence >= 50 ? '#d97706' : '#dc2626';

  // Detect dark mode for background
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const barBg = isDark ? '#374151' : '#f1f5f9';

  return `
    <div style="background: ${barBg}; border-radius: 4px; height: 6px; width: 100%; margin-top: 4px; overflow: hidden;">
      <div style="background: ${color}; height: 100%; width: ${width}%; border-radius: 4px; transition: width 0.3s ease;"></div>
    </div>
  `;
}

/**
 * Create complete results HTML
 * @param {Object} results - Analysis results object
 * @returns {string} HTML string for displaying results
 */
function createResultsHTML(results) {
  const { renderType, confidence, indicators, detailedInfo } = results;

  // Detect dark mode
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const borderColor = isDark ? '#374151' : '#ddd';
  const accentColor = isDark ? '#3b82f6' : '#2563eb';
  const textSecondary = isDark ? '#9ca3af' : '#666';
  const badgeBg = isDark ? '#374151' : '#f1f5f9';
  const badgeText = isDark ? '#f9fafb' : '#1f2937';

  let resultHTML = `
    <div style="border: 1px solid ${borderColor}; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
      <div style="margin-bottom: 8px;">
        <strong style="color: ${accentColor};">Render Type:</strong>
        <br>
        <span style="font-weight: 600; color: ${getTypeColor(renderType)}">${renderType}</span>
      </div>
      <div style="margin-bottom: 8px;">
        <strong style="color: ${accentColor};">Confidence:</strong>
        <span style="font-weight: 600;">${confidence}%</span>
        ${getConfidenceBar(confidence)}
      </div>
      <div style="margin-bottom: 8px;">
        <strong style="color: ${accentColor};">Analysis Score:</strong>
        <br>
        <span style="font-size: 12px; color: ${textSecondary};">
          SSR: ${detailedInfo.ssrScore} | CSR: ${detailedInfo.csrScore}
          (${detailedInfo.ssrPercentage}% SSR)
        </span>
      </div>
    </div>

    <div style="margin-bottom: 10px;">
      <strong style="color: ${accentColor};">Key Indicators (${detailedInfo.totalIndicators}):</strong>
      <div style="margin-top: 4px; font-size: 13px; line-height: 1.4;">
        ${indicators.map(indicator => `<span style="display: inline-block; background: ${badgeBg}; color: ${badgeText}; padding: 2px 6px; margin: 2px 2px; border-radius: 5px; font-size: 11px;">${indicator}</span>`).join('')}
      </div>
    </div>
  `;

  // Add framework detection if available
  if (detailedInfo.frameworks && detailedInfo.frameworks.length > 0) {
    resultHTML += `
      <div style="margin-bottom: 8px;">
        <strong style="color: ${accentColor};">Detected Frameworks:</strong>
        <span style="font-weight:700;">${detailedInfo.frameworks.join(', ').toUpperCase()}</span>
      </div>
    `;
  }

  // Add static generator information if available
  if (detailedInfo.generators && detailedInfo.generators.length > 0) {
    resultHTML += `
      <div style="margin-bottom: 8px;">
        <strong style="color: ${accentColor};">Static Site Generator:</strong>
        <span style="font-weight:700;">${detailedInfo.generators.join(', ').toUpperCase()}</span>
      </div>
    `;
  }

  // Add timing information if available
  if (detailedInfo.timing) {
    resultHTML += `
      <div style="margin-bottom: 8px;">
        <strong style="color: ${accentColor};">Performance:</strong>
        <div style="font-size: 12px; color: ${textSecondary}; margin-top: 2px;">
          DOM Ready: ${detailedInfo.timing.domContentLoaded}ms
          ${detailedInfo.timing.firstContentfulPaint ?
            ` | FCP: ${detailedInfo.timing.firstContentfulPaint}ms` : ''}
        </div>
      </div>
    `;
  }

  return resultHTML;
}

// Export functions for use in other files
if (typeof window !== 'undefined') {
  window.getTypeColor = getTypeColor;
  window.getConfidenceBar = getConfidenceBar;
  window.createResultsHTML = createResultsHTML;
}
