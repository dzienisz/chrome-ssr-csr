/**
 * Telemetry Module
 * Sends analysis data to backend when user has opted in
 */

// Backend URL - Your deployed Vercel app
const BACKEND_URL = 'https://backend-mauve-beta-88.vercel.app';

/**
 * Send analysis data to backend
 * @param {string} url - Page URL
 * @param {string} title - Page title
 * @param {Object} results - Analysis results from pageAnalyzer()
 */
async function sendAnalysisData(url, title, results) {
  try {
    // Note: shareData check is done in popup.js before calling this function
    // chrome.storage is not available in page context where this runs

    console.log('[Telemetry] Sending analysis data to backend...');

    // Prepare data payload
    const payload = {
      url: anonymizeUrl(url),
      domain: extractDomain(url),
      renderType: results.renderType,
      confidence: results.confidence,
      frameworks: results.detailedInfo?.frameworks || [],
      performanceMetrics: {
        domReady: results.detailedInfo?.timing?.domContentLoaded,
        fcp: results.detailedInfo?.timing?.firstContentfulPaint,
      },
      indicators: results.indicators || [],
      version: '3.0.5',  // Hardcoded since chrome.runtime not available in page context
      timestamp: new Date().toISOString(),
    };

    // Send to backend
    const response = await fetch(`${BACKEND_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Telemetry] Failed to send data:', response.status, error);
      return;
    }

    const result = await response.json();
    console.log('[Telemetry] Data sent successfully:', result);
  } catch (error) {
    console.error('[Telemetry] Error sending data:', error);
    // Fail silently - don't disrupt user experience
  }
}

/**
 * Anonymize URL by removing query params and path
 * Only keep protocol + domain for privacy
 */
function anonymizeUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.origin; // Only protocol + domain (e.g., https://example.com)
  } catch {
    return url;
  }
}

/**
 * Extract domain from URL
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return 'unknown';
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.sendAnalysisData = sendAnalysisData;
}
