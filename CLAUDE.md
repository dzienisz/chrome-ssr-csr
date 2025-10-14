# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome Manifest V3 extension that detects whether a webpage uses Server-Side Rendering (SSR) or Client-Side Rendering (CSR). The extension is published on the Chrome Web Store and helps developers and SEO specialists understand page rendering strategies.

## Development Setup

### Loading the Extension

1. Open Chrome and navigate to `chrome://extensions`
2. Enable "Developer Mode" (toggle in top-right)
3. Click "Load unpacked" and select the project directory
4. The extension icon will appear in the Chrome toolbar

### Testing Changes

After making code changes:
1. Go to `chrome://extensions`
2. Click the refresh icon on the CSR vs SSR Detector card
3. Test the extension on various websites (e.g., Next.js sites, React SPAs, static sites)

### No Build Process

This is a vanilla JavaScript project with no build step, transpilation, or package manager. All files are loaded directly by Chrome.

## Architecture

### Three-Part Execution Model

The extension uses Chrome's Manifest V3 architecture with three distinct execution contexts:

1. **background.js** (Service Worker)
   - Runs in the background as a service worker
   - Listens for extension icon clicks via `chrome.action.onClicked`
   - Orchestrates script injection into the active tab
   - Handles notifications and saves analysis history to `chrome.storage.local`
   - Maximum 10 history entries stored

2. **analyzer.js** (Content Script - Injected)
   - Injected into the target webpage on-demand
   - Exposes `window.pageAnalyzer()` function that performs the core analysis
   - Analyzes DOM structure, meta tags, script tags, performance timing, and framework markers
   - Returns structured analysis results with:
     - `renderType`: Classification (SSR/CSR/Hybrid/etc.)
     - `confidence`: Percentage (30-95%)
     - `indicators`: Array of detection signals
     - `detailedInfo`: Scores, frameworks detected, performance metrics
   - Also exposes helper functions: `getTypeColor()`, `getConfidenceBar()`, `createResultsHTML()`

3. **popup.js** (Popup UI)
   - Runs when user clicks extension icon and popup opens
   - Handles "Analyze Page" button click
   - Injects `analyzer.js` into the active tab
   - Calls `window.pageAnalyzer()` and `window.createResultsHTML()` in the tab context
   - Displays formatted results in the popup
   - Manages history display and toggle functionality

### Detection Algorithm (analyzer.js)

The `pageAnalyzer()` function uses a weighted scoring system:

- **SSR Indicators** (increase ssrScore):
  - Rich initial content (paragraphs, headings, articles)
  - Framework hydration markers (React, Next.js, Nuxt, Gatsby, Remix, etc.)
  - Serialized data (`__NEXT_DATA__`, `__INITIAL_STATE__`, etc.)
  - Rich meta tags and SSR framework meta
  - Fast performance timing (DOM ready < 30ms, FCP < 800ms)
  - Structured data (JSON-LD)
  - Low script-to-content ratio

- **CSR Indicators** (increase csrScore):
  - Minimal initial text content
  - Client-side routing elements
  - Loading states with minimal content
  - Slow DOM ready time (> 500ms)
  - High script-to-content ratio
  - Framework scripts without hydration markers

- **Final Classification**:
  - `ssrPercentage = (ssrScore / (ssrScore + csrScore)) * 100`
  - ≥75%: "Server-Side Rendered (SSR)"
  - ≤25%: "Client-Side Rendered (CSR)"
  - 60-74%: "Likely SSR with Hydration"
  - 26-40%: "Likely CSR/SPA"
  - 41-59%: "Hybrid/Mixed Rendering"

### Key Files

- **manifest.json**: Chrome extension configuration (Manifest V3)
- **popup.html/popup.js**: Extension popup interface
- **background.js**: Background service worker for icon clicks
- **analyzer.js**: Core detection algorithm (injected as content script)

## Framework Detection

The extension detects these frameworks and generators:

**SSR Frameworks**: Next.js, Nuxt, Gatsby, Remix, SvelteKit, Astro, Qwik, SolidJS
**Static Site Generators**: Jekyll, Hugo, Eleventy, Hexo
**SPA Frameworks**: React, Vue, Angular, Svelte, Solid

Detection is performed via:
- DOM markers (`#__next`, `data-reactroot`, `[q:container]`, etc.)
- Meta tags
- Script src patterns (`_next/static`, `_nuxt/`, `chunk`, etc.)
- Inline serialized data patterns

## Common Modifications

### Adding New Framework Detection

To detect a new framework, update `analyzer.js`:

1. Add to `frameworkMarkers` object (line 27-36):
   ```javascript
   newframework: document.querySelector('[data-newframework]') !== null
   ```

2. Or add to static site generators (line 129-134):
   ```javascript
   newgenerator: document.querySelector('meta[name="generator"][content*="NewGen"]') !== null
   ```

### Adjusting Scoring Weights

Modify the score increments in `analyzer.js` to change detection sensitivity:
- Higher scores = stronger signal for that rendering type
- Current range: 10-40 points per indicator

### Modifying History Limit

Change the limit in both `background.js:70` and `popup.js:166`:
```javascript
if (history.length > 10) history.pop();  // Change 10 to desired limit
```

## Chrome Extension APIs Used

- `chrome.action`: Extension icon clicks
- `chrome.scripting.executeScript`: Code injection into tabs
- `chrome.storage.local`: Persistent history storage
- `chrome.notifications`: Desktop notifications (background.js only)
- `chrome.tabs.query`: Get active tab information

## Permissions

Declared in manifest.json:
- `activeTab`: Access current tab when extension is clicked
- `scripting`: Inject and execute scripts
- `storage`: Save analysis history
- `notifications`: Show desktop notifications
