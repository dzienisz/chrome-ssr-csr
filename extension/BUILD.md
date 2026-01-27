# Extension Build System

## Overview

The extension uses a custom build system to bundle all detector modules into a single `analyzer-bundle.js` file that gets injected into web pages.

## Structure

```
extension/
├── src/
│   ├── core/                    # Core modules
│   │   ├── config.js           # Configuration and thresholds
│   │   ├── analyzer.js         # Main analyzer logic
│   │   ├── scoring.js          # Scoring and classification
│   │   └── raw-html-comparator.js
│   ├── detectors/               # Detection modules
│   │   ├── csr-detector.js
│   │   ├── hybrid-detector.js
│   │   ├── content-detector.js
│   │   ├── framework-detector.js
│   │   ├── meta-detector.js
│   │   ├── performance-detector.js
│   │   ├── performance-collector.js  # NEW: Core Web Vitals
│   │   ├── page-type-detector.js     # NEW: Page type detection
│   │   └── device-detector.js        # NEW: Device & connection
│   ├── ui/
│   │   └── components/
│   │       └── results-renderer.js
│   ├── telemetry.js
│   └── analyzer-bundle.js       # Generated bundle (DO NOT EDIT)
├── scripts/
│   └── build-bundle.js          # Build script
└── package.json

```

## Building

### One-time Build
```bash
cd extension
npm install
npm run build
```

### Watch Mode (Auto-rebuild on changes)
```bash
npm run build:watch
```

## How It Works

1. **Source Files**: Individual detector modules in `src/detectors/` and `src/core/`
2. **Build Script**: `scripts/build-bundle.js` concatenates all modules
3. **Output**: Single `src/analyzer-bundle.js` file
4. **Injection**: Bundle is injected into pages via `popup.js` and `background.js`

## Adding New Detectors

1. Create new detector file in `src/detectors/`
2. Add to `sourceFiles` array in `scripts/build-bundle.js`
3. Run `npm run build`
4. Test in Chrome

## Build Order

Files are bundled in dependency order:
1. Config (no dependencies)
2. Utility modules (raw-html-comparator)
3. Detectors (use config)
4. Core analyzer (uses all detectors)
5. UI components
6. Telemetry

## Important Notes

- **Never edit `analyzer-bundle.js` directly** - it's auto-generated
- Always edit source files in `src/`
- Run build after any changes
- Bundle includes injection guard to prevent duplicate loading

## Phase 1 Additions

New detectors added for Phase 1 data collection:
- `performance-collector.js` - Core Web Vitals (LCP, CLS, FID, etc.)
- `page-type-detector.js` - Page type classification
- `device-detector.js` - Device, browser, connection info

## Troubleshooting

### Build fails
- Check all source files exist
- Verify Node.js is installed
- Check file permissions

### Bundle not updating
- Make sure you ran `npm run build`
- Check Chrome extension is reloaded
- Clear browser cache

### Missing detectors
- Verify file is in `sourceFiles` array
- Check file path is correct
- Rebuild bundle
