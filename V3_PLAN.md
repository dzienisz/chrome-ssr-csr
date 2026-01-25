# Version 3.0 Development Plan

## Goals
1. **Learn**: Advanced Chrome extension patterns and architecture
2. **Refactor**: Clean, modular, maintainable codebase
3. **Enhance**: New features that provide real value
4. **Foundation**: Build patterns reusable for future plugins

---

## Timeline (Flexible)

**Phase 1: Refactor (2-3 weeks)**
- Modularize code
- Add configuration system
- Improve error handling
- Set up testing (optional)

**Phase 2: UI Revamp (1-2 weeks)**
- Settings page
- Dark mode
- Better popup design

**Phase 3: Features (3-4 weeks)**
- Export functionality
- Framework versions
- Performance insights
- Comparison mode

**Total: 6-9 weeks** (working after hours, ~5-10 hours/week)

---

## Phase 1: Code Refactor

### 1.1 Project Structure Reorganization

**New structure:**
```
chrome-ssr-csr/
├── src/
│   ├── core/
│   │   ├── analyzer.js (main analysis orchestrator)
│   │   ├── config.js (configuration)
│   │   └── scoring.js (scoring algorithms)
│   ├── detectors/
│   │   ├── framework-detector.js
│   │   ├── performance-detector.js
│   │   ├── content-detector.js
│   │   └── meta-detector.js
│   ├── utils/
│   │   ├── dom-utils.js
│   │   ├── error-handler.js
│   │   └── storage-utils.js
│   ├── ui/
│   │   ├── popup/
│   │   │   ├── popup.html
│   │   │   ├── popup.js
│   │   │   └── popup.css
│   │   ├── options/
│   │   │   ├── options.html
│   │   │   ├── options.js
│   │   │   └── options.css
│   │   └── components/
│   │       ├── results-renderer.js
│   │       ├── history-view.js
│   │       └── chart-renderer.js
│   └── background.js
├── assets/
│   ├── icons/
│   └── images/
├── tests/ (optional)
│   ├── unit/
│   └── integration/
├── manifest.json
└── README.md
```

### 1.2 Modularization Tasks

**Priority: High**

- [ ] Split analyzer.js into modules
  - [ ] Extract framework detection logic
  - [ ] Extract performance analysis
  - [ ] Extract content analysis
  - [ ] Extract scoring algorithm

- [ ] Create configuration system
  - [ ] Scoring weights
  - [ ] Classification thresholds
  - [ ] Feature flags

- [ ] Improve error handling
  - [ ] Custom error classes
  - [ ] Error logging
  - [ ] User-friendly messages

### 1.3 Build Process (Optional)

Consider adding:
- Webpack or Rollup for bundling
- Source maps for debugging
- Minification for production
- Auto-reload during development

**Learn:** Module bundling for Chrome extensions

---

## Phase 2: UI/UX Revamp

### 2.1 Settings/Options Page

**New file:** `src/ui/options/options.html`

**Features:**
- [ ] History limit selector (5, 10, 25, 50, unlimited)
- [ ] Notification preferences
- [ ] Dark mode toggle
- [ ] Advanced mode toggle
- [ ] Custom scoring weights (advanced)
- [ ] Export/import settings
- [ ] Reset to defaults button

**Learn:** Chrome options page API, chrome.storage.sync

### 2.2 Dark Mode

**Implementation:**
- [ ] Detect system preference (prefers-color-scheme)
- [ ] Manual toggle in settings
- [ ] Persist preference
- [ ] CSS variables for theming
- [ ] Smooth transitions

**Learn:** CSS custom properties, media queries

### 2.3 Popup Redesign

**Improvements:**
- [ ] Tab navigation (Analysis | History | About)
- [ ] Better loading states
- [ ] Animation/transitions
- [ ] Responsive layout
- [ ] Accessibility improvements (ARIA labels)

**Consider:** Use a lightweight framework like Alpine.js or stay vanilla

---

## Phase 3: New Features

### 3.1 Export Analysis Results ⭐

**Priority: High** (Most requested)

**Formats:**
- [ ] JSON export (for developers)
- [ ] CSV export (for spreadsheets)
- [ ] Markdown export (for documentation)
- [ ] Copy to clipboard

**Implementation:**
```javascript
// src/utils/export-utils.js
export function exportToJSON(analysisData) { }
export function exportToCSV(analysisData) { }
export function exportToMarkdown(analysisData) { }
export function copyToClipboard(text) { }
```

**UI:**
- Export button in popup
- Format selector dropdown
- Success notification

**Learn:** Blob API, download API, clipboard API

### 3.2 Framework Version Detection

**Priority: High**

**Detect versions for:**
- [ ] React (check React.__version)
- [ ] Next.js (check window.__NEXT_DATA__)
- [ ] Vue (check Vue.version)
- [ ] Angular (check ng.version)
- [ ] Nuxt (check window.__NUXT__)

**Implementation:**
```javascript
// src/detectors/framework-detector.js
export function detectFrameworkVersions() {
  return {
    react: detectReactVersion(),
    nextjs: detectNextVersion(),
    vue: detectVueVersion(),
    // ...
  };
}
```

**UI:**
Show in "Detected Frameworks" section:
- React 18.2.0
- Next.js 14.1.0

**Learn:** Accessing framework globals, version detection patterns

### 3.3 Performance Insights with Web Vitals

**Priority: High**

**Metrics:**
- [ ] LCP (Largest Contentful Paint)
- [ ] FID/INP (First Input Delay / Interaction to Next Paint)
- [ ] CLS (Cumulative Layout Shift)
- [ ] TTFB (Time to First Byte)
- [ ] FCP (First Contentful Paint) - already have

**Implementation:**
```javascript
// src/detectors/performance-detector.js
export async function getWebVitals() {
  const vitals = {
    lcp: await getLCP(),
    fid: await getFID(),
    cls: await getCLS(),
    ttfb: getTTFB(),
  };
  return vitals;
}
```

**Recommendations engine:**
```javascript
// src/core/recommendations.js
export function generateRecommendations(analysis, vitals) {
  const recommendations = [];

  if (vitals.lcp > 2500) {
    recommendations.push({
      type: 'warning',
      metric: 'LCP',
      message: 'Slow Largest Contentful Paint',
      suggestion: 'Consider using SSR or image optimization'
    });
  }

  // ... more rules

  return recommendations;
}
```

**UI:**
- Performance score visualization
- Color-coded metrics (green/yellow/red)
- Actionable recommendations

**Learn:** Performance APIs, Web Vitals library, recommendation algorithms

### 3.4 Comparison Mode

**Priority: Medium**

**Feature:**
Compare 2 URLs side-by-side

**Implementation:**
- [ ] "Compare" button in popup
- [ ] Input for second URL
- [ ] Analyze both URLs
- [ ] Show side-by-side results
- [ ] Highlight differences

**UI:**
```
┌─────────────────┬─────────────────┐
│   nextjs.org    │   react.dev     │
├─────────────────┼─────────────────┤
│ SSR: 100%       │ CSR: 75%        │
│ Next.js detected│ Next.js detected│
│ React 18        │ React 18        │
│ Fast FCP        │ Slower FCP      │
└─────────────────┴─────────────────┘
```

**Learn:** Multiple tab analysis, data comparison logic

### 3.5 Enhanced History

**Priority: Medium**

**Features:**
- [ ] Search history by URL/title
- [ ] Filter by render type (SSR/CSR/Hybrid)
- [ ] Sort by date/confidence/score
- [ ] Export full history to CSV
- [ ] Group by domain
- [ ] Delete individual entries
- [ ] Clear all history

**Implementation:**
```javascript
// src/utils/history-utils.js
export function searchHistory(query) { }
export function filterHistory(type) { }
export function exportHistory() { }
export function groupByDomain() { }
```

**UI:**
- Search input
- Filter dropdown
- Sort controls
- Export button

**Learn:** Data filtering, sorting algorithms, grouping logic

---

## Bonus Features (If Time Permits)

### Keyboard Shortcuts
```json
// manifest.json commands
{
  "commands": {
    "analyze-page": {
      "suggested_key": {
        "default": "Ctrl+Shift+A"
      },
      "description": "Analyze current page"
    }
  }
}
```

### Context Menu
Right-click on page → "Analyze with CSR/SSR Detector"

### Badge Indicator
Show last result on extension icon badge

### Batch Analysis
Analyze multiple URLs from a list

---

## Learning Outcomes

By the end of v3.0, you'll have learned:

**Architecture:**
- ✓ Modular code organization
- ✓ Configuration management
- ✓ Error handling patterns
- ✓ Testing strategies

**Chrome APIs:**
- ✓ chrome.storage.sync (synced settings)
- ✓ chrome.commands (keyboard shortcuts)
- ✓ chrome.contextMenus (right-click menu)
- ✓ chrome.downloads (file exports)
- ✓ clipboard API

**Advanced JavaScript:**
- ✓ Async/await patterns
- ✓ Module imports/exports
- ✓ Error handling
- ✓ Data structures (filtering, sorting)

**UI/UX:**
- ✓ Dark mode implementation
- ✓ Responsive design
- ✓ Data visualization
- ✓ Accessibility

**Web Performance:**
- ✓ Web Vitals API
- ✓ Performance monitoring
- ✓ Recommendations engine

---

## Reusable Patterns for Future Plugins

These patterns will help you build your plugin suite faster:

1. **Module structure** - Copy for all plugins
2. **Settings page** - Reusable template
3. **Dark mode** - Same CSS variables
4. **Export functionality** - Reuse export utils
5. **Error handling** - Same error classes
6. **Storage patterns** - Same storage utils

---

## Success Metrics

v3.0 is successful if:

- [ ] Codebase is 50%+ more maintainable
- [ ] 3+ new major features implemented
- [ ] You've learned 5+ new Chrome APIs
- [ ] Pattern library exists for future plugins
- [ ] Users report value from new features
- [ ] No new critical bugs introduced

---

## Next Steps

1. **Create GitHub issues** for each major task
2. **Set up project board** (To Do, In Progress, Done)
3. **Start with Phase 1.1** (project restructure)
4. **Work in branches** (feature/refactor-analyzer, feature/dark-mode, etc.)
5. **Test incrementally** as you build

---

## Questions?

- Should we add TypeScript? (Great for learning, adds complexity)
- Should we add a build process? (Webpack/Rollup)
- Should we add testing? (Jest for unit tests)
- Should we use a UI framework? (Alpine.js, Lit, or vanilla)

Discuss and decide before starting!
