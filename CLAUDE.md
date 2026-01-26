# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome Manifest V3 extension that detects whether a webpage uses Server-Side Rendering (SSR) or Client-Side Rendering (CSR). The extension is published on the Chrome Web Store and helps developers and SEO specialists understand page rendering strategies.

The project includes:
- **Chrome Extension** (root directory): The main extension code
- **Analytics Backend** (`/backend`): Next.js app deployed on Vercel with PostgreSQL database for anonymous telemetry

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

### Code Organization

This is a vanilla JavaScript project with no transpilation or package manager. The codebase uses:

**Source Files** (`src/` directory):
- Modular source files organized by functionality
- Separate detector modules for clean separation of concerns
- Centralized configuration in `src/core/config.js`

**Bundle File** (`src/analyzer-bundle.js`):
- All analysis code concatenated into a single file
- This is the file injected into webpages by Chrome
- Manual concatenation: if you modify any file in `src/core/` or `src/detectors/`, you must update the bundle
- Bundle includes duplicate injection prevention via `window.__SSR_CSR_ANALYZER_LOADED__` flag

**Note**: When modifying source files in `src/`, ensure changes are reflected in `src/analyzer-bundle.js` before testing.

## Architecture

### Three-Part Execution Model

The extension uses Chrome's Manifest V3 architecture with three distinct execution contexts:

1. **background.js** (Service Worker)
   - Runs in the background as a service worker
   - Listens for extension icon clicks via `chrome.action.onClicked`
   - Orchestrates script injection into the active tab
   - Handles notifications and saves analysis history to `chrome.storage.local`
   - History limit is configurable through settings (default: 10 entries)

2. **src/analyzer-bundle.js** (Content Script - Injected)
   - Single bundled file containing all analysis logic, injected into target webpage on-demand
   - Exposes `window.pageAnalyzer()` function that orchestrates the core analysis
   - Modular architecture with specialized detectors:
     - **src/core/config.js**: Centralized configuration for scoring weights and thresholds
     - **src/core/analyzer.js**: Main orchestration logic that coordinates all detectors
     - **src/core/scoring.js**: Classification and confidence calculation
     - **src/detectors/content-detector.js**: Analyzes DOM structure and text content
     - **src/detectors/framework-detector.js**: Detects frameworks and hydration markers
     - **src/detectors/meta-detector.js**: Analyzes meta tags and structured data
     - **src/detectors/performance-detector.js**: Evaluates performance timing metrics
     - **src/ui/components/results-renderer.js**: Generates HTML for results display
   - Returns structured analysis results with:
     - `renderType`: Classification (SSR/CSR/Hybrid/etc.)
     - `confidence`: Percentage (30-95%)
     - `indicators`: Array of detection signals
     - `detailedInfo`: Scores, frameworks detected, performance metrics

3. **popup.js** (Popup UI)
   - Runs when user clicks extension icon and popup opens
   - Handles "Analyze Page" button click
   - Injects `src/analyzer-bundle.js` into the active tab
   - Calls `window.pageAnalyzer()` and `window.createResultsHTML()` in the tab context
   - Displays formatted results in the popup
   - Manages history display and toggle functionality
   - Handles export functionality (JSON, CSV, Markdown)

4. **options.js** (Settings Page)
   - Manages user preferences (dark mode, history limit, notifications, data sharing)
   - Handles settings import/export
   - Communicates settings changes to popup via `chrome.runtime.sendMessage`

### Detection Algorithm

The analysis uses a modular weighted scoring system coordinated by `src/core/analyzer.js`:

**Scoring Process:**
1. Each detector module returns `{ssrScore, csrScore, indicators, details}`
2. Scores are aggregated by the main analyzer
3. Final classification calculated by `src/core/scoring.js`

**SSR Indicators** (increase ssrScore):
- Rich initial content: paragraphs, headings, articles (35 points)
- Framework hydration markers: React, Next.js, Nuxt, etc. (30 points)
- Serialized data: `__NEXT_DATA__`, `__INITIAL_STATE__`, etc. (25 points)
- Static site generators detected (40 points)
- Rich meta tags and SSR framework meta (15-20 points)
- Fast performance timing: DOM ready < 30ms (25 points), FCP < 800ms (15 points)
- Structured data: JSON-LD present (15 points)
- Low script-to-content ratio (10 points)

**CSR Indicators** (increase csrScore):
- Minimal initial text content (30 points)
- CSR framework scripts without hydration (25 points)
- Client-side routing elements (20 points)
- Loading states with minimal content (20 points)
- Slow DOM ready time > 500ms (20 points)
- High script-to-content ratio (15 points)

**Final Classification** (calculated in `src/core/scoring.js`):
- `ssrPercentage = (ssrScore / (ssrScore + csrScore)) * 100`
- ≥75%: "Server-Side Rendered (SSR)"
- ≤25%: "Client-Side Rendered (CSR)"
- 60-74%: "Likely SSR with Hydration"
- 26-40%: "Likely CSR/SPA"
- 41-59%: "Hybrid/Mixed Rendering"

**Confidence Calculation:**
- Base confidence from score differential
- Bonus for each indicator found (3 points each, max 20 bonus)
- Capped at different maxima based on classification type
- Minimum confidence: 30%

### Key Files

- **manifest.json**: Chrome extension configuration (Manifest V3)
- **popup.html/popup.js**: Extension popup interface with export functionality
- **options.html/options.js**: Settings page for user preferences
- **background.js**: Background service worker for icon clicks and notifications
- **src/analyzer-bundle.js**: Bundled analysis code (injected as content script)
  - **src/core/**: Core analysis orchestration and configuration
  - **src/detectors/**: Specialized detector modules (content, framework, meta, performance)
  - **src/ui/components/**: UI rendering components

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

To detect a new framework, update `src/detectors/framework-detector.js`:

1. Add to `frameworkMarkers` object for hydration-based frameworks:
   ```javascript
   newframework: document.querySelector('[data-newframework]') !== null
   ```

2. Or add to `staticGenerators` object for static site generators:
   ```javascript
   newgenerator: document.querySelector('meta[name="generator"][content*="NewGen"]') !== null
   ```

3. After modifying, regenerate the bundle by manually concatenating files or ensure `src/analyzer-bundle.js` includes your changes

### Adjusting Scoring Weights

All scoring weights are centralized in `src/core/config.js`:
- Modify the `CONFIG.scoring` object to adjust individual indicator weights
- Modify the `CONFIG.thresholds` object to change classification boundaries
- Higher scores = stronger signal for that rendering type
- Current range: 10-40 points per indicator

Example:
```javascript
scoring: {
  richContent: 35,  // Increase to give more weight to content analysis
  minimalContent: 30,
  // ... other weights
}
```

### Adding New Detector Module

To add a new detection module:

1. Create new file in `src/detectors/` (e.g., `new-detector.js`)
2. Follow the pattern: export a function that returns `{ssrScore, csrScore, indicators, details}`
3. Add call to your detector in `src/core/analyzer.js` in the `pageAnalyzer()` function
4. Update `src/analyzer-bundle.js` to include the new module

### Modifying Settings

Settings are stored in `chrome.storage.sync` and managed in `options.js`. Default values:
- `darkMode`: 'auto' (options: 'auto', 'light', 'dark')
- `historyLimit`: 10 (configurable: 5 to unlimited)
- `notifications`: true
- `shareData`: false

## Chrome Extension APIs Used

- `chrome.action`: Extension icon clicks
- `chrome.scripting.executeScript`: Code injection into tabs
- `chrome.storage.local`: Persistent history storage
- `chrome.notifications`: Desktop notifications (background.js only)
- `chrome.tabs.query`: Get active tab information

## Export Functionality

The extension supports exporting analysis results in three formats (handled by `popup.js`):

1. **JSON**: Complete structured data including all indicators and detailed info
2. **CSV**: Tabular format with key metrics (URL, render type, confidence, frameworks)
3. **Markdown**: Human-readable format suitable for documentation

Export triggers browser download using blob URLs. Data exported includes:
- URL and page title
- Render type and confidence
- Detected frameworks
- Performance metrics
- Analysis timestamp

## Permissions

Declared in manifest.json:
- `activeTab`: Access current tab when extension is clicked
- `scripting`: Inject and execute scripts
- `storage`: Save analysis history and user settings (uses both `chrome.storage.local` for history and `chrome.storage.sync` for settings)
- `notifications`: Show desktop notifications

## Analytics Backend

The project includes an optional analytics backend in the `/backend` directory.

### Backend Stack
- **Framework**: Next.js 14 (App Router)
- **Database**: Vercel Postgres (Neon)
- **UI Components**: Tremor for charts
- **Hosting**: Vercel

### Backend URLs
- **Dashboard**: https://backend-mauve-beta-88.vercel.app/dashboard
- **API Endpoint**: https://backend-mauve-beta-88.vercel.app/api/analyze

### Backend Structure
```
backend/
├── app/
│   ├── api/
│   │   ├── analyze/route.ts    # Receives telemetry data from extension
│   │   ├── stats/route.ts      # Returns aggregated statistics
│   │   └── setup/route.ts      # Database initialization
│   └── dashboard/page.tsx      # Analytics dashboard UI
├── components/dashboard/
│   ├── charts.tsx              # FrameworkChart, RenderTypeDistribution, TimelineChart
│   ├── recent-analyses.tsx     # Recent analyses table
│   └── top-domains.tsx         # Top analyzed domains list
└── lib/
    ├── db.ts                   # Database queries
    └── auth.ts                 # API authentication (optional)
```

### Telemetry Integration

The extension sends anonymous telemetry when users opt-in via "Share anonymous data" in settings:

1. **popup.js**: `sendDataIfEnabled()` function sends data after each analysis
2. **Data sent**: Domain (not full URL), render type, confidence, frameworks, performance metrics
3. **Privacy**: URLs are anonymized to origin only, no personal data collected

### Backend Development

```bash
cd backend
npm install
npm run dev    # Local development at http://localhost:3000
npx vercel --prod  # Deploy to production
```

### Environment Variables (Vercel)
- `POSTGRES_URL`: Database connection string (auto-configured by Vercel Postgres)
