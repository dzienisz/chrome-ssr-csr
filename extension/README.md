# CSR vs SSR Detector - Browser Extension

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/fhiopdjeekafnhmfbcfoolhejdgjpkgg)](https://chromewebstore.google.com/detail/csr-vs-ssr-detector/fhiopdjeekafnhmfbcfoolhejdgjpkgg)
[![Mozilla Add-on](https://img.shields.io/amo/v/csr-vs-ssr-detector)](https://addons.mozilla.org/firefox/addon/csr-vs-ssr-detector/)
[![Changelog](https://img.shields.io/badge/changelog-CHANGELOG.md-blue.svg)](./CHANGELOG.md)

A browser extension (Chrome and Firefox 128+) that detects whether a webpage uses Server-Side Rendering (SSR) or Client-Side Rendering (CSR).

## Installation

### From a store
- **Chrome / Edge / Brave** — install from the [Chrome Web Store](https://chromewebstore.google.com/detail/csr-vs-ssr-detector/fhiopdjeekafnhmfbcfoolhejdgjpkgg) → "Add to Chrome".
- **Firefox (128+)** — install from [addons.mozilla.org](https://addons.mozilla.org/firefox/addon/csr-vs-ssr-detector/) → "Add to Firefox".

### Developer install — Chrome
1. Clone the repository and `cd extension`
2. Open Chrome → `chrome://extensions`
3. Enable **Developer Mode** (top-right toggle)
4. Click **Load unpacked** → select this `extension/` directory

### Developer install — Firefox (128+)
1. Run `npm run build:firefox` (generates the Gecko variant in `dist/firefox/`)
2. Open `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on…** → select `dist/firefox/manifest.json`

Firefox loads the copy in `dist/firefox/`, not your live `src/` edits — re-run `npm run build:firefox` and reload the add-on after each change. Firefox 128 is the floor because the analyzer relies on a `world: "MAIN"` content script.

## Features

### What you get (v4.0.0)
- **A verdict, and the reasoning behind it** — every signal that moved the
  score, with the points it contributed and what it actually observed
- **Rendered where** — built in the browser, rendered at build time, rendered
  once and served from cache, rendered per request, or server-rendered with
  client islands
- **Delivery** — CDN, cache state, age, `Cache-Control`, TTFB and
  Server-Timing, read from the document's own response headers
- **Regions** — which parts of the page the server sent and which ones
  JavaScript filled in, with character counts per region
- **DevTools panel** ("Rendering") — the same report at full width, re-running
  on every navigation

### Core Detection
- **🎯 Accurate Detection**: Analyzes 15+ indicators including DOM structure, framework markers, performance metrics
- **🚀 Framework Recognition**: Detects Next.js, Nuxt, Gatsby, Remix, SvelteKit, Astro, React, Vue, Angular
- **🏷️ Badge on Icon**: Shows SSR/CSR/MIX result directly on extension icon (green/red/amber)
- **📊 Detailed Analysis**: Confidence score, performance metrics, detection indicators

### Performance Insights (v3.3.0+)
- **📈 Core Web Vitals**: LCP, CLS, INP, TTFB measurements (plus Long Animation Frame stats)
- **📱 Device Context**: Device type, screen size, connection quality
- **📄 Page Classification**: Auto-detect page type (blog, ecommerce, docs, app, etc.)

### Tech Stack Analysis (v3.4.0+)
- **🎨 CSS Framework Detection**: Tailwind, Bootstrap, MUI, Chakra UI
- **⚡ State Management**: Redux, MobX, Recoil, Apollo
- **🔧 Build Tools**: Webpack, Vite, Parcel
- **🌐 Hosting Detection**: Vercel, Netlify, GitHub Pages, Cloudflare

### SEO & Quality Audits (v3.4.0+)
- **🔍 SEO Analysis**: Meta tags, Open Graph, heading structure
- **♿ Accessibility Score**: Alt text coverage, ARIA landmarks

### Advanced Analytics (v3.5.0+)
- **💧 Hydration Tracking**: Hydration errors and timing
- **🧭 Navigation Analysis**: SPA vs MPA detection, route tracking

### User Experience
- **🌙 Dark Mode**: Beautiful dark theme with system preference detection
- **📤 Export Results**: Download as JSON, CSV, or Markdown
- **📜 History**: Stores recent analyses with configurable limit
- **⚙️ Settings**: Customize notifications, history limit, theme

## Usage

1. Navigate to any website
2. Click the extension icon in the browser toolbar (or press `Ctrl/Cmd+Shift+Y`,
   or right-click the page → **Analyze page rendering**)
3. The analysis starts immediately — the verdict, its confidence and where the
   HTML was produced appear at the top
4. Dig in through the tabs:
   - **Overview** — scores, text in the HTML vs on screen, TTFB, paint timings,
     detected stack
   - **Evidence** — every signal, scored ones first, with its weight
   - **Delivery** — CDN, cache state, age, `Cache-Control`, Server-Timing
   - **Regions** — server-sent vs JavaScript-built parts of the page
   - **History** — recent analyses; click one to re-open its report

For a full-width view that re-runs on every navigation, open DevTools and
switch to the **Rendering** panel.

The extension badge shows the result at a glance:
- 🟢 **SSR** - Server-Side Rendered
- 🔴 **CSR** - Client-Side Rendered
- 🟡 **MIX** - Hybrid/Mixed Rendering

## How It Works

The extension uses a weighted scoring system analyzing:

| Indicator | SSR Points | CSR Points |
|-----------|------------|------------|
| **Raw HTML vs Rendered mismatch** | - | +40 |
| Raw HTML matches rendered | +30 | - |
| Framework hydration markers (raw-HTML evidence required since v3.7.0) | +30 | - |
| Serialized data (`__NEXT_DATA__`) | +25 | - |
| Fast DOM + slow FCP pattern | - | +25 |
| SPA root container (#root/#app) | - | +20 |
| Rich initial content | +20 | - |
| Minimal text content | - | +30 |
| CSR framework scripts | - | +25 |
| Noscript JS warning | - | +15 |

**Key Detection Method (v3.2.0+):** The extension fetches the page's raw HTML and compares it to the rendered DOM. If raw HTML is much smaller than rendered content, it's likely CSR (JavaScript loaded the content).

**Accuracy hardening (v3.7.0):** both sides of the comparison strip `script`/`style` text before measuring; framework hydration markers only count toward SSR when found in the raw HTML; when the server sent almost none of the visible text, post-JS "SSR-looking" signals are capped; and when the raw fetch is blocked, confidence is capped instead of guessing confidently. Detection changes are validated against a 22-site ground-truth suite: `node scripts/validate-detection.mjs` (requires playwright).

**Explaining the verdict (v4.0.0):** two modules run alongside the scoring ones
and deliberately contribute **nothing** to it. `delivery-detector.js` reads the
document's response headers and classifies how it travelled (prerendered,
edge-cached, origin-rendered, dynamic) — transport is not rendering, and mixing
the two is how detectors start lying. `dom-diff-detector.js` lines the pre-JS
document up against the live DOM region by region; the overall ratio is already
scored once in `comparison-detector.js`, and scoring it twice would double-count
the single strongest input to the verdict.

**Classification:**
- ≥75% SSR score → "Server-Side Rendered (SSR)"
- ≤25% SSR score → "Client-Side Rendered (CSR)"
- 60-74% → "Likely SSR with Hydration"
- 26-40% → "Likely CSR/SPA"
- 41-59% → "Hybrid/Mixed Rendering"

## Project Structure

```
extension/
├── manifest.json        # Extension config (Manifest V3) — Chrome canonical; Firefox variant generated
├── popup.html/js/css    # Extension popup UI
├── options.html/js/css  # Settings page
├── welcome.html/js/css  # First-install onboarding page
├── background.js        # Service worker (Chrome) / event page (Firefox)
├── devtools/            # DevTools "Rendering" panel
│   ├── devtools.html/js     # Panel registration
│   └── panel.html/js/css    # Full-width report
├── scripts/
│   ├── build-bundle.js      # Builds the src/ bundles (npm run build)
│   ├── build-firefox.js     # Generates the Firefox/Gecko package in dist/firefox/ (npm run build:firefox)
│   ├── validate-detection.mjs  # 22-site live ground-truth harness (npm run validate:live)
│   ├── validate-local.mjs      # Offline fixture harness, runs in CI (npm run validate:local)
│   ├── fixtures/pages.mjs      # Hand-written ground-truth pages + expected headers
│   └── ui-preview.mjs          # Screenshots every surface from a real result (npm run preview)
├── src/
│   ├── analyzer-bundle.js   # Bundled detection code (injected into pages)
│   ├── telemetry-bundle.js  # Bundled collectors (injected only when Share Data is on)
│   ├── core/
│   │   ├── config.js        # Scoring weights configuration
│   │   ├── analyzer.js      # Main analysis orchestration
│   │   └── scoring.js       # Classification logic
│   ├── detectors/           # SSR/CSR detection signals
│   │   ├── content-detector.js       # DOM/content analysis
│   │   ├── framework-detector.js     # Framework detection
│   │   ├── meta-detector.js          # Meta tags analysis
│   │   ├── performance-detector.js   # Timing metrics
│   │   ├── comparison-detector.js    # Raw HTML vs rendered DOM
│   │   ├── csr-pattern-detector.js   # SPA/CSR patterns
│   │   ├── hybrid-detector.js        # Islands/partial hydration
│   │   ├── platform-detector.js      # Speculation rules, view transitions (v3.11.0+)
│   │   ├── delivery-detector.js      # CDN/cache headers → delivery mode (v4.0.0, score-neutral)
│   │   └── dom-diff-detector.js      # Per-region server vs client attribution (v4.0.0, score-neutral)
│   ├── collectors/          # Telemetry only (v3.6.0 split) — never affect the verdict
│   │   ├── performance-collector.js  # Core Web Vitals (v3.3.0+)
│   │   ├── page-type-detector.js     # Page classification (v3.3.0+)
│   │   ├── device-detector.js        # Device info (v3.3.0+)
│   │   ├── tech-stack-detector.js    # CSS/state/build tools (v3.4.0+)
│   │   ├── seo-detector.js           # SEO & accessibility (v3.4.0+)
│   │   ├── hydration-detector.js     # Hydration tracking (v3.5.0+)
│   │   └── navigation-detector.js    # SPA navigation (v3.5.0+)
│   └── ui/                  # Shared by the popup, the panel, settings and onboarding
│       ├── theme.css           # Design tokens and components
│       ├── report.js           # Renders a result as DOM (never as HTML strings)
│       ├── export.js           # JSON / CSV / Markdown / one-line summary
│       └── i18n.js             # data-i18n with English fallbacks
├── _locales/            # i18n name, description and UI strings (en, ja, ko, fr, de, es, pt_BR, pl)
├── icon*.png            # Extension icons
├── promo-images/        # Store marketing assets (Chrome tiles + Firefox promo; HTML→PNG)
├── store-listing.md     # Chrome Web Store listing copy (+ store-listings.md translations)
├── amo-listing.md       # Firefox/AMO listing copy + submission-form answers
├── privacy-policy.md    # Privacy policy
└── CHANGELOG.md         # Version history
```

## Development

### Making Changes

1. Edit source files in `src/` directory
2. Rebuild the bundles: `npm run build` (or `npm run build:watch` while developing)
3. Run the unit tests: `npm run test:run`
4. Reload the extension:
   - **Chrome** — `chrome://extensions` → click the refresh icon
   - **Firefox** — re-run `npm run build:firefox`, then reload the add-on in `about:debugging`
5. For detection changes, run the harnesses:
   - `npm run validate:local` — offline fixtures in real Chromium; deterministic,
     runs in CI, and the one that has to stay green
   - `npm run validate:live` — the 22-site live suite; needs the open internet
6. For UI changes, `npm run preview` renders every surface against a real
   analysis result and writes screenshots to `scripts/preview-out/`

Both harnesses need Playwright's Chromium (`npx playwright install chromium`).

### Adding Framework Detection

Detection lives in `src/core/config.js`, not in the detector:

```javascript
// frameworks: a CSS selector for a marker the framework leaves in the DOM
newframework: '[data-newframework]',

// frameworkContentPatterns: for frameworks that leave no element — matched
// against inline script text and against script src/id attributes
newframework: ['__NEWFRAMEWORK_STATE'],

// staticGenerators: build-time tools that announce themselves
newgenerator: 'meta[name="generator"][content*="NewGen"]',
```

A marker only counts as SSR evidence when it is present in the **raw** HTML —
markers that appear only after scripts run are what a client-rendered app looks
like. Rebuild the bundles (`npm run build`), add a case to
`src/detectors/__tests__/framework-detector.test.js`, and if the selector uses
a colon in the attribute name (`wire:id`, `q:container`) cover it in
`scripts/fixtures/pages.mjs` instead — jsdom's selector engine never matches
those.

### Creating a Release

Releases are tag-driven (`.github/workflows/release.yml`). Bump `manifest.json`
+ `CHANGELOG.md`, merge to `main`, then `git tag vX.Y.Z && git push origin vX.Y.Z`.
One tag builds **both** store packages — Chrome (`csr-ssr-detector-vX.Y.Z.zip`)
and Firefox (`csr-ssr-detector-firefox-vX.Y.Z.zip`) — and attaches them to a
GitHub Release. Upload the Chrome zip to the Web Store dashboard and the Firefox
zip to AMO (see `amo-listing.md` for the reviewer build notes). Full flow and
gotchas: the root [`CLAUDE.md`](../CLAUDE.md) "Creating Extension Release".

Manual fallback (build the zips locally):

```bash
# Chrome
zip -r ../csr-ssr-detector-vX.Y.Z.zip \
  manifest.json popup.html popup.js popup.css \
  options.html options.js options.css \
  background.js welcome.html welcome.js welcome.css \
  devtools/ icon*.png src/ _locales/ \
  -x "*/__tests__/*" "*/fixtures/*"
# Firefox → dist/csr-ssr-detector-firefox-vX.Y.Z.zip
npm run build:firefox -- --zip
```

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Theme | Auto | Light/Dark/System preference |
| History Limit | 10 | Number of analyses to store (5-unlimited) |
| Notifications | On | Desktop notifications after analysis |
| Share Data | On | Anonymous telemetry (opt-out) |

## Privacy

- All analysis happens **locally** in your browser
- No data is sent unless "Share Data" is enabled (on by default, opt-out in settings); when disabled, the telemetry collectors are never even injected (v3.6.0+)
- When enabled, only the **domain** (never the full URL) is shared, along with the render verdict, confidence, detected frameworks, and technical metrics (Core Web Vitals, device/browser type, tech stack, SEO/accessibility flags, hydration and navigation stats)
- See [privacy-policy.md](./privacy-policy.md) for details

## Contributing

1. Fork the repository
2. Make changes in a feature branch
3. Test on various sites (Next.js, React SPAs, static sites)
4. Submit a pull request

### Testing Checklist
- [ ] `npm run test:run` passes (105+ unit tests)
- [ ] `node scripts/validate-detection.mjs` — 22-site ground-truth suite (aim: ≥20/22)
- [ ] Manual spot-check: a Next.js site, a pure CSR SPA, a static site, a hybrid/islands site

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history.

## License

MIT License - see [LICENSE](../LICENSE)
