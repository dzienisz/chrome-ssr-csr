# Integrating Extension with Backend

This guide shows how to update your Chrome extension to send data to the backend.

## Step 1: Add Telemetry Module

Create `src/telemetry.js`:

```javascript
/**
 * Telemetry Module
 * Sends analysis data to backend when user has opted in
 */

// Your deployed backend URL
const BACKEND_URL = 'https://your-app.vercel.app';
const API_KEY = 'your-api-secret-key'; // TODO: Store securely

/**
 * Send analysis data to backend
 * @param {string} url - Page URL
 * @param {string} title - Page title
 * @param {Object} results - Analysis results from pageAnalyzer()
 */
async function sendAnalysisData(url, title, results) {
  try {
    // Check if user has opted in to data sharing
    const settings = await chrome.storage.sync.get(['shareData']);

    if (!settings.shareData) {
      return; // User hasn't opted in
    }

    // Prepare data payload
    const payload = {
      url: anonymizeUrl(url),
      domain: extractDomain(url),
      renderType: results.renderType,
      confidence: results.confidence,
      frameworks: results.detailedInfo?.frameworks || [],
      performanceMetrics: {
        domReady: results.detailedInfo?.domReadyTime,
        fcp: results.detailedInfo?.fcp,
      },
      indicators: results.indicators,
      version: chrome.runtime.getManifest().version,
      timestamp: new Date().toISOString(),
    };

    // Send to backend
    const response = await fetch(`${BACKEND_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Failed to send telemetry:', response.status);
    }
  } catch (error) {
    console.error('Telemetry error:', error);
    // Fail silently - don't disrupt user experience
  }
}

/**
 * Anonymize URL by removing query params and path
 * Only keep domain for privacy
 */
function anonymizeUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.origin; // Only protocol + domain
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
window.sendAnalysisData = sendAnalysisData;
```

## Step 2: Update popup.js

Add the telemetry call after successful analysis:

```javascript
// In popup.js, after displaying results

// Around line 120, after creating results HTML
if (analysisResult) {
  // Display results (existing code)
  document.getElementById("result").innerHTML = html;

  // NEW: Send telemetry data
  if (typeof window.sendAnalysisData === 'function') {
    window.sendAnalysisData(
      tab.url,
      tab.title,
      analysisResult
    );
  }

  // Save to history (existing code)
  saveToHistory(tab.url, tab.title, analysisResult);
}
```

## Step 3: Update manifest.json

Add the telemetry script to be injected:

```json
{
  "manifest_version": 3,
  "name": "CSR vs SSR Detector",
  "version": "3.0.6",
  // ... existing config ...
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/telemetry.js"],
      "run_at": "document_idle"
    }
  ]
}
```

Or inject it dynamically in popup.js before analysis:

```javascript
// In analyzeCurrentPage() function, before executing analyzer
chrome.scripting.executeScript({
  target: { tabId: tabs[0].id },
  files: ['src/telemetry.js']
});
```

## Step 4: Update Privacy Policy

Update `privacy-policy.md` to include:

```markdown
## Data Collection (Optional)

When you enable "Share anonymous usage data" in settings:

### What we collect:
- Domain names of analyzed websites (not full URLs)
- Rendering type detected (SSR/CSR/Hybrid)
- Frameworks detected
- Performance metrics (page load times)
- Extension version

### What we DON'T collect:
- Full URLs or page paths
- Page content
- Personal information
- Browsing history
- IP addresses (anonymized by default)

### Why we collect it:
- Improve detection accuracy
- Understand common frameworks
- Generate aggregate statistics
- Improve the extension

### Opting out:
Go to Settings and disable "Share anonymous usage data"
```

## Step 5: Secure API Key Storage

**Option 1: Environment variable during build**
```javascript
const API_KEY = process.env.API_KEY;
```

**Option 2: Fetch from secure endpoint**
```javascript
// Get API key from your backend (more secure)
async function getApiKey() {
  const response = await fetch(`${BACKEND_URL}/api/key`);
  const data = await response.json();
  return data.key;
}
```

**Option 3: Use Chrome identity API** (most secure)
```javascript
chrome.identity.getAuthToken({ interactive: false }, function(token) {
  // Use token for authentication
});
```

## Step 6: Test Locally

1. Start your backend locally:
```bash
cd backend
npm run dev
```

2. Update telemetry.js with local URL:
```javascript
const BACKEND_URL = 'http://localhost:3000';
```

3. Load extension in Chrome
4. Enable "Share anonymous usage data" in settings
5. Analyze a page
6. Check backend console for incoming data
7. Check dashboard at http://localhost:3000/dashboard

## Step 7: Deploy

1. Deploy backend to Vercel (as per backend README)
2. Update `BACKEND_URL` in telemetry.js with production URL
3. Set production API key
4. Test extension with production backend
5. Bump version in manifest.json
6. Package and upload to Chrome Web Store

## Configuration Options

You can make the backend URL configurable in settings:

```javascript
// In options.js, add setting
chrome.storage.sync.set({
  backendUrl: 'https://your-app.vercel.app',
  enableTelemetry: true
});

// In telemetry.js, read from settings
const settings = await chrome.storage.sync.get(['backendUrl', 'enableTelemetry']);
const BACKEND_URL = settings.backendUrl || 'https://your-app.vercel.app';
```

## Monitoring

After deployment, monitor:
- Vercel function logs for errors
- Database growth in Vercel dashboard
- Extension error reports in Chrome Web Store
- Dashboard for data accuracy

## Troubleshooting

**Data not appearing in dashboard?**
- Check browser console for errors
- Verify API key is correct
- Check Vercel function logs
- Ensure `shareData` setting is enabled

**CORS errors?**
- Add CORS headers in API route (already included)
- Check Vercel deployment logs

**Rate limiting issues?**
- Implement Redis-based rate limiting
- Use Upstash Redis (has free tier)
