// Store last analysis results for export
let lastAnalysisResult = null;
let lastAnalysisUrl = null;
let lastAnalysisTitle = null;

// Update extension badge based on render type
function updateBadge(renderType, tabId) {
  let text = '';
  let color = '#6b7280'; // gray default

  if (renderType.includes('SSR') || renderType.includes('Server')) {
    text = 'SSR';
    color = '#10b981'; // green
  } else if (renderType.includes('CSR') || renderType.includes('Client')) {
    text = 'CSR';
    color = '#ef4444'; // red
  } else if (renderType.includes('Hybrid') || renderType.includes('Mixed')) {
    text = 'MIX';
    color = '#f59e0b'; // amber
  }

  chrome.action.setBadgeText({ text, tabId });
  chrome.action.setBadgeBackgroundColor({ color, tabId });
}

document.addEventListener('DOMContentLoaded', () => {
  // Inject version from manifest
  document.getElementById('version').textContent = `v${chrome.runtime.getManifest().version}`;

  // Load and apply settings
  loadSettings();

  // Initialize UI elements
  setupUI();

  // Add event listener for settings button
  document.getElementById("settingsButton").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  // Add event listener for analyze button
  document.getElementById("analyze").addEventListener("click", analyzeCurrentPage);

  // Add event listener for history button
  document.getElementById("history-button").addEventListener("click", toggleHistory);

  // Export button listeners
  document.getElementById("exportJson").addEventListener("click", () => exportResults('json'));
  document.getElementById("exportCsv").addEventListener("click", () => exportResults('csv'));
  document.getElementById("exportMd").addEventListener("click", () => exportResults('markdown'));

  // Listen for settings updates
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'settingsUpdated') {
      applySettings(message.settings);
    }
  });
});

// Load settings from storage
function loadSettings() {
  chrome.storage.sync.get({
    darkMode: 'auto',
    historyLimit: 10,
    notifications: true,
    shareData: true
  }, (settings) => {
    applySettings(settings);
  });
}

// Apply settings to UI
function applySettings(settings) {
  // Apply dark mode based on setting (auto/light/dark)
  if (settings.darkMode === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else if (settings.darkMode === 'light') {
    document.documentElement.removeAttribute('data-theme');
  } else { // auto
    // Detect system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }
}

// Analyze current page
function analyzeCurrentPage() {
  // Show loading state
  document.getElementById("result").innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <div style="border: 4px solid var(--bg-secondary); border-top: 4px solid var(--accent-color); border-radius: 50%; width: 30px; height: 30px; margin: 0 auto; animation: spin 1s linear infinite;"></div>
      <p style="margin-top: 10px; color: var(--text-secondary);">Analyzing page...</p>
    </div>
  `;

  // Hide export buttons during analysis
  document.getElementById("exportButtons").style.display = "none";

  // Add animation style
  if (!document.getElementById('spinner-style')) {
    const style = document.createElement('style');
    style.id = 'spinner-style';
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  // Execute analysis
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    lastAnalysisUrl = tab.url;
    lastAnalysisTitle = tab.title;

    // Check if URL is restricted (chrome://, edge://, about:, etc.)
    const restrictedProtocols = ['chrome:', 'chrome-extension:', 'edge:', 'about:', 'view-source:'];
    const isRestricted = restrictedProtocols.some(protocol => tab.url.startsWith(protocol));

    if (isRestricted) {
      document.getElementById("result").innerHTML = `
        <div style="color: var(--text-secondary); text-align: center; padding: 20px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px;">
          <p style="font-size: 24px; margin-bottom: 10px;">🚫</p>
          <p style="font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">Cannot Analyze This Page</p>
          <p style="font-size: 13px; line-height: 1.5;">
            Chrome extensions cannot access internal browser pages like:
            <br><br>
            <code style="background: var(--bg-primary); padding: 2px 6px; border-radius: 4px;">chrome://</code>
            <code style="background: var(--bg-primary); padding: 2px 6px; border-radius: 4px;">edge://</code>
            <code style="background: var(--bg-primary); padding: 2px 6px; border-radius: 4px;">about:</code>
            <br><br>
            Please navigate to a regular website to analyze it.
          </p>
        </div>
      `;
      return;
    }

    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        files: ['src/analyzer-bundle.js']
      },
      () => {
        // Check for injection errors
        if (chrome.runtime.lastError) {
          document.getElementById("result").innerHTML = `
            <div style="color: var(--danger-color, #dc2626); font-weight: 500; text-align: center; padding: 15px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px;">
              ❌ Cannot access this page
              <p style="font-size: 13px; margin-top: 8px; font-weight: normal; color: var(--text-secondary);">
                ${chrome.runtime.lastError.message}
              </p>
            </div>
          `;
          return;
        }

        // After analyzer.js is injected, run the analysis (async)
        chrome.scripting.executeScript(
          {
            target: { tabId: tab.id },
            function: async () => await window.pageAnalyzer()
          },
          (results) => {
            if (chrome.runtime.lastError) {
              showError();
              return;
            }

            if (results && results[0] && results[0].result) {
              // Get the analysis results
              const analysisResults = results[0].result;
              lastAnalysisResult = analysisResults;

              // Generate HTML for results
              chrome.scripting.executeScript(
                {
                  target: { tabId: tab.id },
                  function: (results) => window.createResultsHTML(results),
                  args: [analysisResults]
                },
                (htmlResults) => {
                  if (htmlResults && htmlResults[0] && htmlResults[0].result) {
                    // Display the formatted results
                    document.getElementById("result").innerHTML = htmlResults[0].result;

                    // Show export buttons
                    document.getElementById("exportButtons").style.display = "flex";

                    // Update badge on extension icon
                    updateBadge(analysisResults.renderType, tab.id);

                    // Save to history
                    saveToHistory(tab.url, analysisResults, tab.title);

                    // Show history button
                    document.getElementById("history-button").style.display = "block";

                    // Send data if sharing is enabled
                    sendDataIfEnabled(tab.url, analysisResults);
                  } else {
                    showError();
                  }
                }
              );
            } else {
              showError();
            }
          }
        );
      }
    );
  });
}

// Export results in different formats
function exportResults(format) {
  if (!lastAnalysisResult) {
    alert('No analysis results to export');
    return;
  }

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `csr-ssr-analysis-${timestamp}`;

  if (format === 'json') {
    exportAsJSON(filename);
  } else if (format === 'csv') {
    exportAsCSV(filename);
  } else if (format === 'markdown') {
    exportAsMarkdown(filename);
  }
}

// Export as JSON
function exportAsJSON(filename) {
  const data = {
    url: lastAnalysisUrl,
    title: lastAnalysisTitle,
    timestamp: new Date().toISOString(),
    analysis: lastAnalysisResult
  };

  const dataStr = JSON.stringify(data, null, 2);
  downloadFile(dataStr, `${filename}.json`, 'application/json');
}

// Export as CSV
function exportAsCSV(filename) {
  const { renderType, confidence, indicators, detailedInfo } = lastAnalysisResult;

  const csvContent = [
    ['Field', 'Value'],
    ['URL', lastAnalysisUrl],
    ['Title', lastAnalysisTitle],
    ['Timestamp', new Date().toISOString()],
    ['Render Type', renderType],
    ['Confidence', `${confidence}%`],
    ['SSR Score', detailedInfo.ssrScore],
    ['CSR Score', detailedInfo.csrScore],
    ['SSR Percentage', `${detailedInfo.ssrPercentage}%`],
    ['Frameworks', detailedInfo.frameworks ? detailedInfo.frameworks.join(', ') : 'None'],
    ['Generators', detailedInfo.generators ? detailedInfo.generators.join(', ') : 'None'],
    ['Key Indicators', indicators.join('; ')],
    ['DOM Ready Time', detailedInfo.timing ? `${detailedInfo.timing.domContentLoaded}ms` : 'N/A'],
    ['First Contentful Paint', detailedInfo.timing && detailedInfo.timing.firstContentfulPaint ? `${detailedInfo.timing.firstContentfulPaint}ms` : 'N/A']
  ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

  downloadFile(csvContent, `${filename}.csv`, 'text/csv');
}

// Export as Markdown
function exportAsMarkdown(filename) {
  const { renderType, confidence, indicators, detailedInfo } = lastAnalysisResult;

  let markdown = `# CSR vs SSR Analysis Report\n\n`;
  markdown += `**URL:** ${lastAnalysisUrl}\n\n`;
  markdown += `**Title:** ${lastAnalysisTitle}\n\n`;
  markdown += `**Date:** ${new Date().toLocaleString()}\n\n`;
  markdown += `---\n\n`;
  markdown += `## Results\n\n`;
  markdown += `- **Render Type:** ${renderType}\n`;
  markdown += `- **Confidence:** ${confidence}%\n`;
  markdown += `- **SSR Score:** ${detailedInfo.ssrScore}\n`;
  markdown += `- **CSR Score:** ${detailedInfo.csrScore}\n`;
  markdown += `- **SSR Percentage:** ${detailedInfo.ssrPercentage}%\n\n`;

  if (detailedInfo.frameworks && detailedInfo.frameworks.length > 0) {
    markdown += `### Detected Frameworks\n\n`;
    detailedInfo.frameworks.forEach(fw => {
      markdown += `- ${fw.toUpperCase()}\n`;
    });
    markdown += `\n`;
  }

  if (detailedInfo.generators && detailedInfo.generators.length > 0) {
    markdown += `### Static Site Generators\n\n`;
    detailedInfo.generators.forEach(gen => {
      markdown += `- ${gen.toUpperCase()}\n`;
    });
    markdown += `\n`;
  }

  markdown += `### Key Indicators (${detailedInfo.totalIndicators})\n\n`;
  indicators.forEach(indicator => {
    markdown += `- ${indicator}\n`;
  });
  markdown += `\n`;

  if (detailedInfo.timing) {
    markdown += `### Performance Metrics\n\n`;
    markdown += `- **DOM Ready:** ${detailedInfo.timing.domContentLoaded}ms\n`;
    if (detailedInfo.timing.firstContentfulPaint) {
      markdown += `- **First Contentful Paint:** ${detailedInfo.timing.firstContentfulPaint}ms\n`;
    }
    markdown += `\n`;
  }

  markdown += `---\n\n`;
  const version = chrome.runtime.getManifest().version;
  markdown += `*Generated by CSR vs SSR Detector v${version}*\n`;

  downloadFile(markdown, `${filename}.md`, 'text/markdown');
}

// Download file helper
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// Send data if sharing is enabled
function sendDataIfEnabled(url, results) {
  console.log('[Telemetry] sendDataIfEnabled called');

  chrome.storage.sync.get({ shareData: true }, async (settings) => {
    console.log('[Telemetry] shareData setting:', settings.shareData);

    if (!settings.shareData) {
      console.log('[Telemetry] Data sharing is disabled - skipping');
      return;
    }

    try {
      console.log('[Telemetry] Sending analysis data to backend...');

      // Backend configuration
      const BACKEND_URL = 'https://backend-mauve-beta-88.vercel.app';

      // Extract domain from URL
      let domain = 'unknown';
      let anonymizedUrl = url;
      try {
        const urlObj = new URL(url);
        domain = urlObj.hostname;
        anonymizedUrl = urlObj.origin;
      } catch (e) {
        console.error('[Telemetry] URL parse error:', e);
      }

      // Prepare payload
      const payload = {
        url: anonymizedUrl,
        domain: domain,
        renderType: results.renderType,
        confidence: results.confidence,
        frameworks: results.detailedInfo?.frameworks || [],
        
        // Phase 1: Core Web Vitals
        coreWebVitals: results.coreWebVitals || null,
        
        // Phase 1: Page Type
        pageType: results.pageType || null,
        
        // Phase 1: Device & Connection Info
        deviceInfo: results.deviceInfo || null,
        
        // Phase 2: Tech Stack
        techStack: results.techStack || null,
        
        // Phase 2: SEO & Accessibility
        seoAccessibility: results.seoAccessibility || null,

        // Phase 3: User Journey
        hydrationData: results.hydrationData || null,
        navigationData: results.navigationData || null,
        
        performanceMetrics: {
          domReady: results.detailedInfo?.timing?.domContentLoaded,
          fcp: results.detailedInfo?.timing?.firstContentfulPaint,
          // Content comparison metrics (v3.2.0)
          contentRatio: results.detailedInfo?.contentComparison?.ratio,
          rawHtmlLength: results.detailedInfo?.contentComparison?.rawLength,
          renderedLength: results.detailedInfo?.contentComparison?.renderedLength,
          hybridScore: results.detailedInfo?.hybridScore,
        },
        indicators: results.indicators || [],
        version: chrome.runtime.getManifest().version,
        timestamp: new Date().toISOString(),
      };

      console.log('[Telemetry] Payload:', payload);

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
        console.error('[Telemetry] Failed:', response.status, error);
        return;
      }

      const result = await response.json();
      console.log('[Telemetry] Success:', result);
    } catch (error) {
      console.error('[Telemetry] Error:', error);
      // Fail silently - don't disrupt user experience
    }
  });
}

// Setup UI elements
function setupUI() {
  // Add history button
  if (!document.getElementById("history-button")) {
    const historyButton = document.createElement("button");
    historyButton.id = "history-button";
    historyButton.textContent = "View History";
    historyButton.style.cssText = `
      background-color: var(--button-secondary);
      color: var(--text-primary);
      padding: 8px 16px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      margin-top: 10px;
      display: none;
      width: 100%;
    `;
    document.body.insertBefore(historyButton, document.getElementById("exportButtons"));
  }

  // Add history container
  if (!document.getElementById("history-container")) {
    const historyContainer = document.createElement("div");
    historyContainer.id = "history-container";
    historyContainer.style.cssText = `
      display: none;
      margin-top: 15px;
      max-height: 200px;
      overflow-y: auto;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background-color: var(--bg-secondary);
    `;
    document.body.appendChild(historyContainer);
  }

  // Add help section
  if (!document.getElementById("help-section")) {
    const helpSection = document.createElement("div");
    helpSection.id = "help-section";
    helpSection.style.cssText = `
      margin-top: 15px;
      padding: 10px;
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      font-size: 12px;
      color: var(--text-secondary);
    `;
    helpSection.innerHTML = `
      <p><strong>What's the difference?</strong></p>
      <p><strong>SSR (Server-Side Rendering):</strong> Content is generated on the server before being sent to the browser. Better for SEO and initial load performance.</p>
      <p><strong>CSR (Client-Side Rendering):</strong> Content is generated in the browser using JavaScript. Better for rich interactions and app-like experiences.</p>
    `;
    document.body.appendChild(helpSection);
  }
}

// Show error message
function showError() {
  document.getElementById("result").innerHTML = `
    <div style="color: var(--danger-color, #dc2626); font-weight: 500; text-align: center; padding: 15px;">
      ❌ Analysis failed. Please try again.
    </div>
  `;
}

// Save analysis to history
function saveToHistory(url, results, title) {
  chrome.storage.sync.get({ historyLimit: 10 }, (settings) => {
    chrome.storage.local.get(['analysisHistory'], (data) => {
      const history = data.analysisHistory || [];

      // Add new entry
      const newEntry = {
        url: url,
        title: title || url,
        timestamp: Date.now(),
        results: results
      };

      // Add to beginning of array
      history.unshift(newEntry);

      // Apply history limit
      const limit = settings.historyLimit === -1 ? Infinity : settings.historyLimit;
      if (history.length > limit) {
        history.splice(limit);
      }

      // Save back to storage
      chrome.storage.local.set({ analysisHistory: history });
    });
  });
}

// Toggle history display
function toggleHistory() {
  const historyContainer = document.getElementById("history-container");
  const isVisible = historyContainer.style.display === "block";

  if (isVisible) {
    historyContainer.style.display = "none";
    document.getElementById("history-button").textContent = "View History";
  } else {
    // Load and display history
    chrome.storage.local.get(['analysisHistory'], (data) => {
      const history = data.analysisHistory || [];

      if (history.length === 0) {
        historyContainer.innerHTML = `
          <div style="padding: 15px; text-align: center; color: var(--text-secondary);">
            No analysis history yet
          </div>
        `;
      } else {
        historyContainer.innerHTML = history.map((entry, index) => `
          <div style="padding: 10px; border-bottom: ${index < history.length - 1 ? '1px solid var(--border-color)' : 'none'};">
            <div style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-primary);">
              ${entry.title}
            </div>
            <div style="font-size: 12px; color: var(--text-secondary);">
              ${new Date(entry.timestamp).toLocaleString()}
            </div>
            <div style="margin-top: 5px;">
              <span style="display: inline-block; background: ${getTypeColor(entry.results.renderType)}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px;">
                ${entry.results.renderType}
              </span>
              <span style="font-size: 12px; margin-left: 5px; color: var(--text-secondary);">
                ${entry.results.confidence}% confidence
              </span>
            </div>
          </div>
        `).join('');
      }

      historyContainer.style.display = "block";
      document.getElementById("history-button").textContent = "Hide History";
    });
  }
}

// Helper function to get color based on render type
function getTypeColor(renderType) {
  if (renderType.includes('SSR')) return '#059669';
  if (renderType.includes('CSR')) return '#dc2626';
  if (renderType.includes('Hybrid')) return '#d97706';
  return '#6b7280';
}
