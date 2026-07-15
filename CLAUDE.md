# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a monorepo containing:
- **Browser Extension** (`/extension`): Detects whether a webpage uses SSR or CSR (Chrome + Firefox since v3.10.0)
- **Analytics Backend** (`/backend`): Next.js dashboard for anonymous telemetry

The extension is published on the Chrome Web Store and helps developers and SEO specialists understand page rendering strategies.

## Repository Structure

```
/
├── extension/              # Chrome Extension (Manifest V3)
│   ├── manifest.json       # Extension configuration
│   ├── _locales/           # i18n: name/description per locale (en, ja, ko, fr, de, es, pt_BR, pl)
│   ├── popup.html/js       # Extension popup UI
│   ├── options.html/js     # Settings page
│   ├── welcome.html/js     # Onboarding page (opened once on first install)
│   ├── background.js       # Service worker
│   ├── src/                # Source modules
│   │   ├── analyzer-bundle.js   # Bundled detection code (injected)
│   │   ├── telemetry-bundle.js  # Bundled telemetry collectors (injected only when shareData is on)
│   │   ├── core/           # Core analysis logic (analyzer, scoring, config)
│   │   ├── detectors/      # SSR/CSR detection modules (see below)
│   │   ├── collectors/     # Telemetry collectors (see below)
│   │   └── ui/             # UI components
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

#### Firefox (128+)

The Chrome `manifest.json` is canonical; Firefox uses a generated variant:

```bash
cd extension
npm run build:firefox        # writes dist/firefox/ (add --zip for the AMO zip)
```

1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on…" and select `extension/dist/firefox/manifest.json`
3. Re-run `npm run build:firefox` + reload after changes (edits under `extension/` are not picked up automatically — Firefox loads the copy in `dist/firefox/`)

Manifest differences (applied by `scripts/build-firefox.js`): `background.scripts`
event page instead of `service_worker`, and `browser_specific_settings.gecko`
(AMO id, `strict_min_version: 128` for `world: "MAIN"` content scripts,
data-collection disclosure). Validate with `npx web-ext lint --source-dir dist/firefox`.

Cross-browser code rules: use `func:` (not the Chrome-only `function:` alias)
in `chrome.scripting.executeScript`; use `options_ui` (not `options_page`);
guard Chrome-only APIs (e.g. `chrome.action.getUserSettings`) — Firefox
supports the `chrome.*` namespace with callbacks, so no polyfill is needed.

### Backend Development

```bash
cd backend
npm install
npm run dev    # Local development at http://localhost:3000
```

Deployment is automatic: merges to `main` deploy via the Vercel GitHub
integration (no manual `vercel --prod` step).

### URLs
- **Dashboard**: https://backend-mauve-beta-88.vercel.app/dashboard
- **API**: https://backend-mauve-beta-88.vercel.app/api/analyze

## Extension Architecture

### Execution Model

1. **background.js** (Service Worker)
   - Opens `welcome.html` on first install (pin walkthrough + telemetry opt-out)
   - Listens for extension icon clicks
   - Handles notifications and history storage

2. **src/analyzer-bundle.js** (Injected Content Script)
   - Exposes `window.pageAnalyzer()` async function
   - Modular detectors (see Detector Modules below)
   - Fetches raw HTML to compare with rendered DOM
   - Returns: `{renderType, confidence, indicators, detailedInfo}` — detection only (since v3.6.0)

3. **src/telemetry-bundle.js** (Injected only when `shareData` is enabled)
   - Runs the telemetry collectors (see Collector Modules below)
   - Returns: `{coreWebVitals, pageType, deviceInfo, techStack, seoAccessibility, hydrationData, navigationData}`

4. **popup.js** (Popup UI)
   - Injects analyzer and displays results
   - Manages history, exports, and telemetry
   - Updates badge on extension icon (SSR/CSR/MIX)
   - Shows a dismissible pin-to-toolbar hint when `isOnToolbar` is false

### Detector Modules

Located in `extension/src/detectors/` — SSR/CSR detection signals:

| Module | Purpose |
|--------|---------|
| `content-detector.js` | Analyzes HTML content structure |
| `framework-detector.js` | Detects React, Vue, Angular, etc. |
| `meta-detector.js` | Analyzes meta tags and structured data |
| `performance-detector.js` | Timing-based SSR/CSR signals |
| `comparison-detector.js` | Raw vs rendered HTML comparison |
| `csr-pattern-detector.js` | CSR-specific patterns |
| `hybrid-detector.js` | Islands/partial hydration patterns |

### Collector Modules

Located in `extension/src/collectors/` — telemetry only, moved out of
`detectors/` in v3.6.0; they never influence the SSR/CSR verdict:

| Module | Purpose |
|--------|---------|
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

Since v3.7.0 both sides are measured identically with `script/style/noscript/
template` text stripped; both the CSR and SSR branches require ~200 chars of
real text. When the server sent <10% of the visible text (decisive CSR), the
rendered-DOM SSR signals are capped rather than allowed to outvote the
comparison; when the raw fetch fails, confidence is capped and definitive
verdicts downgrade to "Likely". Validate detection changes against the 22-site
ground-truth harness: `node extension/scripts/validate-detection.mjs`
(requires playwright).

Weighted scoring system analyzing:
- **Raw vs Rendered comparison** (40 points for CSR mismatch, 30 for SSR match)
- Framework hydration markers (30 points; since v3.7.0 they require raw-HTML evidence)
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
| `/api/stats?type=all` | GET | All aggregated statistics (Phase 1-3) — preferred |
| `/api/stats?type=recent` | GET | Paginated recent analyses (supports `offset` param) |
| `/api/stats?type=frameworks\|domains\|timeline\|…` | GET | Individual stat slices |

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
- **Phase 2**: Tech stack (CSS framework, state management, build tool), SEO metrics (incl. page title)
- **Phase 3**: Hydration stats (errors, timing), navigation (SPA/MPA, routes)

Server-side enrichment (added by `/api/analyze` before DB insert):
- **Country**: 2-letter ISO code from Vercel geo (`request.geo.country`), stored in `device_info.country`

Privacy: URLs anonymized to origin only.

## Common Tasks

### Adding Framework Detection

Edit `extension/src/detectors/framework-detector.js`:
```javascript
newframework: document.querySelector('[data-newframework]') !== null
```
Then rebuild the bundles: `cd extension && npm run build`.

### Adding a New Detector

1. Create `extension/src/detectors/new-detector.js` (or `src/collectors/` for telemetry-only modules)
2. Export detection function to `window`
3. Add it to the module list in `extension/scripts/build-bundle.js` and run `npm run build`
4. Add to `pageAnalyzer()` results (detectors) or the telemetry payload (collectors)

### Creating Extension Release

Releases are tag-driven (`.github/workflows/release.yml`):

1. Bump `extension/manifest.json` version and update `extension/CHANGELOG.md`
2. Merge to `main`
3. Tag and push: `git tag vX.Y.Z && git push origin vX.Y.Z`

The workflow verifies the tag matches `manifest.json`, builds the Chrome Web
Store zip, and attaches it to a GitHub Release. Download the zip from the
release page and upload it to the Chrome Web Store developer dashboard
(store listing and privacy disclosures are updated manually there).

Manual fallback:

```bash
cd extension
zip -r ../csr-ssr-detector-vX.Y.Z.zip manifest.json popup.html popup.js \
  options.html options.js background.js welcome.html welcome.js icon*.png \
  src/ _locales/
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

Merges to `main` deploy automatically via the Vercel GitHub integration
(project root is configured as `backend/`). No manual deploy step is needed;
`npx vercel --prod` from the repo root exists only as a fallback.

## Settings

Extension settings (stored in `chrome.storage.sync`):
- `darkMode`: 'auto' | 'light' | 'dark'
- `historyLimit`: number (default: 10)
- `notifications`: boolean (default: true)
- `shareData`: boolean (default: true, opt-out)

One-off flags in `chrome.storage.local`: `pinHintDismissed` (popup pin banner),
`analysisHistory` (history entries). Clear these when testing onboarding.

## Version History

- **v3.10.0**: Firefox support — generated Gecko manifest (`npm run build:firefox`), `func:`/`options_ui` cross-browser fixes, Firefox zip in releases
- **v3.9.0**: i18n stage 1 — localized name/description via `_locales` (8 languages), enabling per-language store listings
- **v3.8.1**: Settings-page privacy notice fixed (stale "backend coming in v3.1" text)
- **v3.8.0**: Onboarding — welcome page on install, pin-to-toolbar hint in popup, options logo fix
- **v3.7.0**: Detection SSR-bias fix — script-stripped comparison, decisive-CSR override, raw-evidence hydration markers (plan 003)
- **v3.6.1**: CWV telemetry race fix (500ms timeout it could never win)
- **v3.6.0**: Detection/telemetry split — faster results, conditional telemetry loading
- **v3.5.0**: Phase 3 - Hydration tracking, navigation detection
- **v3.4.0**: Phase 2 - Tech stack detection, SEO audits
- **v3.3.0**: Phase 1 - Core Web Vitals, page type, device info
- **v3.2.0**: Content comparison (raw vs rendered HTML)
- **v3.0.0**: Initial release with modular architecture
