# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a monorepo containing:
- **Chrome Extension** (`/extension`): Detects whether a webpage uses SSR or CSR
- **Analytics Backend** (`/backend`): Next.js dashboard for anonymous telemetry

The extension is published on the Chrome Web Store and helps developers and SEO specialists understand page rendering strategies.

## Repository Structure

```
/
├── extension/              # Chrome Extension (Manifest V3)
│   ├── manifest.json       # Extension configuration
│   ├── popup.html/js       # Extension popup UI
│   ├── options.html/js     # Settings page
│   ├── background.js       # Service worker
│   ├── src/                # Source modules
│   │   ├── analyzer-bundle.js  # Bundled analysis code (injected)
│   │   ├── core/           # Core analysis logic
│   │   ├── detectors/      # Detection modules
│   │   └── ui/             # UI components
│   ├── icon*.png           # Extension icons
│   ├── promo-images/       # Chrome Web Store images
│   └── privacy-policy.md   # Privacy policy
│
├── backend/                # Analytics Dashboard (Next.js)
│   ├── app/
│   │   ├── api/            # API routes
│   │   └── dashboard/      # Dashboard page
│   ├── components/         # React components
│   └── lib/                # Database utilities
│
├── README.md               # Main project readme
├── CHANGELOG.md            # Version history
├── CLAUDE.md               # This file
└── LICENSE                 # MIT License
```

## Development Setup

### Extension Development

1. Open Chrome and navigate to `chrome://extensions`
2. Enable "Developer Mode" (toggle in top-right)
3. Click "Load unpacked" and select the `extension/` directory
4. The extension icon will appear in the Chrome toolbar

After making code changes:
1. Go to `chrome://extensions`
2. Click the refresh icon on the CSR vs SSR Detector card
3. Test on various websites

### Backend Development

```bash
cd backend
npm install
npm run dev    # Local development at http://localhost:3000
npx vercel --prod  # Deploy to production
```

### URLs
- **Dashboard**: https://backend-mauve-beta-88.vercel.app/dashboard
- **API**: https://backend-mauve-beta-88.vercel.app/api/analyze

## Extension Architecture

### Three-Part Execution Model

1. **background.js** (Service Worker)
   - Listens for extension icon clicks
   - Handles notifications and history storage

2. **src/analyzer-bundle.js** (Injected Content Script)
   - Exposes `window.pageAnalyzer()` function
   - Modular detectors: content, framework, meta, performance
   - Returns: `{renderType, confidence, indicators, detailedInfo}`

3. **popup.js** (Popup UI)
   - Injects analyzer and displays results
   - Manages history, exports, and telemetry
   - Updates badge on extension icon (SSR/CSR/MIX)

### Detection Algorithm

Weighted scoring system analyzing:
- HTML content structure (35 points for rich content)
- Framework hydration markers (30 points)
- Serialized data patterns (25 points)
- Meta tags and structured data (15-20 points)
- Performance timing metrics (15-25 points)

Classification thresholds:
- ≥75% SSR score: "Server-Side Rendered (SSR)"
- ≤25% SSR score: "Client-Side Rendered (CSR)"
- 41-59%: "Hybrid/Mixed Rendering"

## Backend Architecture

### Tech Stack
- Next.js 14 (App Router)
- Vercel Postgres (Neon)
- Tremor UI for charts

### API Endpoints
- `POST /api/analyze` - Receive telemetry from extension
- `GET /api/stats` - Aggregated statistics for dashboard

### Telemetry
- Opt-out by default (enabled unless user disables)
- Data: domain, render type, confidence, frameworks
- Privacy: URLs anonymized to origin only

## Common Tasks

### Adding Framework Detection

Edit `extension/src/detectors/framework-detector.js`:
```javascript
newframework: document.querySelector('[data-newframework]') !== null
```
Then update `extension/src/analyzer-bundle.js` to include changes.

### Creating Extension Release

```bash
cd extension
zip -r ../csr-ssr-detector-vX.Y.Z.zip manifest.json popup.html popup.js \
  options.html options.js background.js icon*.png src/analyzer-bundle.js
```

### Deploying Backend

```bash
cd backend
npx vercel --prod
```

## Settings

Extension settings (stored in `chrome.storage.sync`):
- `darkMode`: 'auto' | 'light' | 'dark'
- `historyLimit`: number (default: 10)
- `notifications`: boolean (default: true)
- `shareData`: boolean (default: true, opt-out)
