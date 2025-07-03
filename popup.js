document.addEventListener('DOMContentLoaded', () => {
  // Initialize UI elements
  setupUI();
  
  // Add event listener for analyze button
  document.getElementById("analyze").addEventListener("click", () => {
    // Show loading state
    document.getElementById("result").innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <div style="border: 4px solid #f3f4f6; border-top: 4px solid #2563eb; border-radius: 50%; width: 30px; height: 30px; margin: 0 auto; animation: spin 1s linear infinite;"></div>
        <p style="margin-top: 10px; color: #4b5563;">Analyzing page...</p>
      </div>
    `;
    
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
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          files: ['analyzer.js']
        },
        () => {
          // After analyzer.js is injected, run the analysis
          chrome.scripting.executeScript(
            {
              target: { tabId: tabs[0].id },
              function: () => window.pageAnalyzer()
            },
            (results) => {
              if (results && results[0] && results[0].result) {
                // Get the analysis results
                const analysisResults = results[0].result;
                
                // Generate HTML for results
                chrome.scripting.executeScript(
                  {
                    target: { tabId: tabs[0].id },
                    function: (results) => window.createResultsHTML(results),
                    args: [analysisResults]
                  },
                  (htmlResults) => {
                    if (htmlResults && htmlResults[0] && htmlResults[0].result) {
                      // Display the formatted results
                      document.getElementById("result").innerHTML = htmlResults[0].result;
                      
                      // Save to history
                      saveToHistory(tabs[0].url, analysisResults);
                      
                      // Show history button
                      document.getElementById("history-button").style.display = "block";
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
  });
  
  // Add event listener for history button
  document.getElementById("history-button").addEventListener("click", () => {
    toggleHistory();
  });
});

// Setup UI elements
function setupUI() {
  // Add history button
  if (!document.getElementById("history-button")) {
    const historyButton = document.createElement("button");
    historyButton.id = "history-button";
    historyButton.textContent = "View History";
    historyButton.style.cssText = `
      background-color: #f3f4f6;
      color: #1f2937;
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      margin-top: 10px;
      display: none;
    `;
    document.body.insertBefore(historyButton, document.getElementById("result"));
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
      border: 1px solid #e5e7eb;
      border-radius: 6px;
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
      background-color: #f3f4f6;
      border-radius: 6px;
      font-size: 12px;
      color: #4b5563;
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
    <div style="color: #dc2626; font-weight: 500; text-align: center; padding: 15px;">
      ❌ Analysis failed. Please try again.
    </div>
  `;
}

// Save analysis to history
function saveToHistory(url, results, title) {
  chrome.storage.local.get(['analysisHistory'], (data) => {
    const history = data.analysisHistory || [];
    
    // Add new entry (limit to 10 entries)
    const newEntry = {
      url: url,
      title: title || url,
      timestamp: Date.now(),
      results: results
    };
    
    // Add to beginning of array and limit to 10 entries
    history.unshift(newEntry);
    if (history.length > 10) history.pop();
    
    // Save back to storage
    chrome.storage.local.set({ analysisHistory: history });
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
          <div style="padding: 15px; text-align: center; color: #6b7280;">
            No analysis history yet
          </div>
        `;
      } else {
        historyContainer.innerHTML = history.map((entry, index) => `
          <div style="padding: 10px; border-bottom: ${index < history.length - 1 ? '1px solid #e5e7eb' : 'none'};">
            <div style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${entry.title}
            </div>
            <div style="font-size: 12px; color: #6b7280;">
              ${new Date(entry.timestamp).toLocaleString()}
            </div>
            <div style="margin-top: 5px;">
              <span style="display: inline-block; background: ${getTypeColor(entry.results.renderType)}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px;">
                ${entry.results.renderType}
              </span>
              <span style="font-size: 12px; margin-left: 5px;">
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

// Helper function to get color based on render type (fallback if analyzer.js not loaded)
function getTypeColor(renderType) {
  if (renderType.includes('SSR')) return '#059669';
  if (renderType.includes('CSR')) return '#dc2626';
  if (renderType.includes('Hybrid')) return '#d97706';
  return '#6b7280';
}
