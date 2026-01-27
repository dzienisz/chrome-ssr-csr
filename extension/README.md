# CSR vs SSR Detector - Chrome Extension

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/fhiopdjeekafnhmfbcfoolhejdgjpkgg)](https://chromewebstore.google.com/detail/csr-vs-ssr-detector/fhiopdjeekafnhmfbcfoolhejdgjpkgg)
[![Version](https://img.shields.io/badge/version-3.2.1-blue.svg)](./CHANGELOG.md)

A Chrome extension that detects whether a webpage uses Server-Side Rendering (SSR) or Client-Side Rendering (CSR).

## Installation

### From Chrome Web Store (Recommended)
1. Visit the [Chrome Web Store](https://chromewebstore.google.com/detail/csr-vs-ssr-detector/fhiopdjeekafnhmfbcfoolhejdgjpkgg)
2. Click "Add to Chrome"
3. The extension icon will appear in your toolbar

### For Development
1. Clone the repository and navigate to extension folder
2. Open Chrome → `chrome://extensions`
3. Enable **Developer Mode** (top-right toggle)
4. Click **Load unpacked** → select this `extension/` directory

## Features

- **🎯 Accurate Detection**: Analyzes 15+ indicators including DOM structure, framework markers, performance metrics
- **🚀 Framework Recognition**: Detects Next.js, Nuxt, Gatsby, Remix, SvelteKit, Astro, React, Vue, Angular
- **🏷️ Badge on Icon**: Shows SSR/CSR/MIX result directly on extension icon (green/red/amber)
- **📊 Detailed Analysis**: Confidence score, performance metrics, detection indicators
- **🌙 Dark Mode**: Beautiful dark theme with system preference detection
- **📤 Export Results**: Download as JSON, CSV, or Markdown
- **📜 History**: Stores recent analyses with configurable limit
- **⚙️ Settings**: Customize notifications, history limit, theme

## Usage

1. Navigate to any website
2. Click the extension icon in Chrome toolbar
3. Click "Analyze Page"
4. View results:
   - Rendering type (SSR/CSR/Hybrid)
   - Confidence score (30-95%)
   - Detected frameworks
   - Performance metrics
   - Detection indicators

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
| Framework hydration markers | +30 | - |
| Serialized data (`__NEXT_DATA__`) | +25 | - |
| Fast DOM + slow FCP pattern | - | +25 |
| SPA root container (#root/#app) | - | +20 |
| Rich initial content | +20 | - |
| Minimal text content | - | +30 |
| CSR framework scripts | - | +25 |
| Noscript JS warning | - | +15 |

**Key Detection Method (v3.2.0+):** The extension fetches the page's raw HTML and compares it to the rendered DOM. If raw HTML is much smaller than rendered content, it's likely CSR (JavaScript loaded the content).

**Classification:**
- ≥75% SSR score → "Server-Side Rendered (SSR)"
- ≤25% SSR score → "Client-Side Rendered (CSR)"
- 60-74% → "Likely SSR with Hydration"
- 26-40% → "Likely CSR/SPA"
- 41-59% → "Hybrid/Mixed Rendering"

## Project Structure

```
extension/
├── manifest.json        # Chrome extension config (Manifest V3)
├── popup.html/js        # Extension popup UI
├── options.html/js      # Settings page
├── background.js        # Service worker
├── src/
│   ├── analyzer-bundle.js   # Bundled analysis code (injected into pages)
│   ├── core/
│   │   ├── config.js        # Scoring weights configuration
│   │   ├── analyzer.js      # Main analysis orchestration
│   │   └── scoring.js       # Classification logic
│   ├── detectors/
│   │   ├── content-detector.js     # DOM/content analysis
│   │   ├── framework-detector.js   # Framework detection
│   │   ├── meta-detector.js        # Meta tags analysis
│   │   ├── performance-detector.js # Timing metrics
│   │   ├── comparison-detector.js  # Raw HTML vs rendered DOM
│   │   └── csr-pattern-detector.js # SPA/CSR patterns
│   └── ui/
│       └── results-renderer.js     # Results HTML generation
├── icon*.png            # Extension icons
├── promo-images/        # Chrome Web Store assets
├── privacy-policy.md    # Privacy policy
└── CHANGELOG.md         # Version history
```

## Development

### Making Changes

1. Edit source files in `src/` directory
2. **Important**: After modifying `src/core/` or `src/detectors/`, update `src/analyzer-bundle.js`
3. Reload extension in `chrome://extensions` (click refresh icon)
4. Test on various websites

### Adding Framework Detection

Edit `src/detectors/framework-detector.js`:

```javascript
// Add to frameworkMarkers object
newframework: document.querySelector('[data-newframework]') !== null

// Or add to staticGenerators object
newgenerator: document.querySelector('meta[name="generator"][content*="NewGen"]') !== null
```

Then update `src/analyzer-bundle.js` to include changes.

### Creating a Release

```bash
zip -r ../csr-ssr-detector-vX.Y.Z.zip \
  manifest.json popup.html popup.js options.html options.js \
  background.js icon*.png src/analyzer-bundle.js
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
- No data is sent unless you enable "Share anonymous data"
- When enabled, only **domain** (not full URL), render type, and frameworks are shared
- See [privacy-policy.md](./privacy-policy.md) for details

## Contributing

1. Fork the repository
2. Make changes in a feature branch
3. Test on various sites (Next.js, React SPAs, static sites)
4. Submit a pull request

### Testing Checklist
- [ ] Next.js sites (nextjs.org, vercel.com)
- [ ] React SPAs (create-react-app apps)
- [ ] Static sites (Jekyll, Hugo)
- [ ] Traditional server-rendered pages
- [ ] Hybrid applications

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history.

## License

MIT License - see [LICENSE](../LICENSE)
