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
│   │   ├── detectors/      # Detection modules (see below)
│   │   ├── ui/             # UI components
│   │   └── telemetry.js    # Telemetry handling
│   ├── icon*.png           # Extension icons
│   ├── promo-images/       # Chrome Web Store images
│   ├── privacy-policy.md   # Privacy policy
│   └── CHANGELOG.md        # Extension version history
│
├── backend/                # Analytics Dashboard (Next.js)
│   ├── app/
│   │   ├── api/            # API routes
│   │   │   ├── analyze/    # POST analysis data
│   │   │   └── stats/      # GET statistics (phase1, phase2, phase3)
│   │   └── dashboard/      # Dashboard page
│   ├── components/         # React components
│   │   └── dashboard/      # Dashboard-specific components
│   ├── lib/                # Database utilities
│   │   ├── db.ts           # Core DB functions
│   │   ├── db-phase2.ts    # Tech stack & SEO queries
│   │   ├── db-phase3.ts    # Hydration & navigation queries
│   │   ├── cors.ts         # CORS utilities
│   │   └── auth.ts         # API key verification
│   └── CHANGELOG.md        # Dashboard version history
│
├── README.md               # Main project readme
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
   - Exposes `window.pageAnalyzer()` async function
   - Modular detectors (see Detector Modules below)
   - Fetches raw HTML to compare with rendered DOM
   - Returns: `{renderType, confidence, indicators, detailedInfo, coreWebVitals, pageType, deviceInfo, techStack, seoAccessibility, hydrationData, navigationData}`

3. **popup.js** (Popup UI)
   - Injects analyzer and displays results
   - Manages history, exports, and telemetry
   - Updates badge on extension icon (SSR/CSR/MIX)

### Detector Modules

Located in `extension/src/detectors/`:

| Module | Purpose |
|--------|---------|
| `content-detector.js` | Analyzes HTML content structure |
| `framework-detector.js` | Detects React, Vue, Angular, etc. |
| `meta-detector.js` | Analyzes meta tags and structured data |
| `performance-detector.js` | Timing-based SSR/CSR signals |
| `comparison-detector.js` | Raw vs rendered HTML comparison |
| `csr-pattern-detector.js` | CSR-specific patterns |
| `hybrid-detector.js` | Islands/partial hydration patterns |
| `performance-collector.js` | Core Web Vitals (LCP, CLS, FID, TTFB) |
| `page-type-detector.js` | Page type classification |
| `device-detector.js` | Device and browser info |
| `tech-stack-detector.js` | CSS frameworks, state management, build tools |
| `seo-detector.js` | SEO & accessibility audits |
| `hydration-detector.js` | Hydration tracking |
| `navigation-detector.js` | SPA navigation detection |

### Detection Algorithm

**Primary Method (v3.2.0+):** Fetches raw HTML and compares to rendered DOM.
- Raw HTML much smaller than rendered = CSR (JS loaded content)
- Raw HTML matches rendered = SSR (content in initial HTML)

Weighted scoring system analyzing:
- **Raw vs Rendered comparison** (40 points for CSR mismatch, 30 for SSR match)
- Framework hydration markers (30 points)
- Serialized data patterns (25 points)
- Fast DOM + slow FCP pattern (25 points CSR)
- SPA root containers with React/Vue markers (20 points CSR)
- HTML content structure (20 points for rich content)
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

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analyze` | POST | Receive telemetry from extension |
| `/api/analyze/[id]` | DELETE | Remove an analysis |
| `/api/stats` | GET | Aggregated statistics (supports type param) |
| `/api/stats/phase2` | GET | Tech stack and SEO statistics |
| `/api/stats/phase3` | GET | Hydration and navigation statistics |

### API Error Response Format

All API errors return consistent format:
```json
{
  "success": false,
  "error": "Error message here"
}
```

### Telemetry Data Model

Extension sends (when user opts in):
- **Core**: domain, render type, confidence, frameworks, indicators
- **Phase 1**: Core Web Vitals (LCP, CLS, FID, TTFB), page type, device info
- **Phase 2**: Tech stack (CSS framework, state management, build tool), SEO metrics
- **Phase 3**: Hydration stats (errors, timing), navigation (SPA/MPA, routes)

Privacy: URLs anonymized to origin only.

## Common Tasks

### Adding Framework Detection

Edit `extension/src/detectors/framework-detector.js`:
```javascript
newframework: document.querySelector('[data-newframework]') !== null
```
Then update `extension/src/analyzer-bundle.js` to include changes.

### Adding a New Detector

1. Create `extension/src/detectors/new-detector.js`
2. Export detection function to `window`
3. Import in `extension/src/analyzer-bundle.js`
4. Add to `pageAnalyzer()` results

### Creating Extension Release

```bash
cd extension
zip -r ../csr-ssr-detector-vX.Y.Z.zip manifest.json popup.html popup.js \
  options.html options.js background.js icon*.png src/
```

### Database Setup

For a fresh database (Vercel Postgres/Neon):

```bash
cd backend
# Set connection string
export POSTGRES_URL="postgres://..."
# Create tables with full schema
node scripts/setup-db.js
```

For migrating an existing database to add Phase 1-3 columns:

```bash
cd backend
export POSTGRES_URL="postgres://..."
node scripts/migrate-db.js
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

## Version History

- **v3.5.0**: Phase 3 - Hydration tracking, navigation detection
- **v3.4.0**: Phase 2 - Tech stack detection, SEO audits
- **v3.3.0**: Phase 1 - Core Web Vitals, page type, device info
- **v3.2.0**: Content comparison (raw vs rendered HTML)
- **v3.0.0**: Initial release with modular architecture
