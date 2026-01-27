// Listen for extension icon click
chrome.action.onClicked.addListener((tab) => {
  // First inject the analyzer.js script
  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      files: ['src/analyzer-bundle.js']
    },
    () => {
      // After analyzer.js is injected, run the analysis (async)
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          function: async () => await window.pageAnalyzer()
        },
        (results) => {
          if (results && results[0] && results[0].result) {
            const analysisResults = results[0].result;
            
            // Show notification with results
            showNotification(analysisResults, tab.url);
            
            // Save to history
            saveToHistory(tab.url, tab.title || tab.url, analysisResults);
          } else {
            // Show error notification
            chrome.notifications.create({
              type: 'basic',
              iconUrl: 'icon48.png',
              title: 'Analysis Failed',
              message: 'Unable to analyze the current page. Please try again.',
              priority: 1
            });
          }
        }
      );
    }
  );
});

// Show notification with analysis results
function showNotification(results, url) {
  const { renderType, confidence, indicators } = results;
  
  // Create notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon48.png',
    title: `${renderType} (${confidence}% confidence)`,
    message: `Key indicators: ${indicators.slice(0, 2).join(', ')}${indicators.length > 2 ? '...' : ''}`,
    priority: 1
  });
}

// Save analysis to history
function saveToHistory(url, title, results) {
  chrome.storage.local.get(['analysisHistory'], (data) => {
    const history = data.analysisHistory || [];
    
    // Add new entry (limit to 10 entries)
    const newEntry = {
      url: url,
      title: title,
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
