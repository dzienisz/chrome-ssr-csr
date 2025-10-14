# Roadmap

This document outlines the planned features and improvements for future versions of the CSR vs SSR Detector extension.

## Version 2.2 (Patch Release) - Ready to Release

**Bug Fixes:**
- ✅ Fixed function call argument order in popup.js:60
- ✅ Fixed React detection for modern React 18+ (added additional selectors)
- ✅ Added try-catch error handling in pageAnalyzer()
- ✅ Fixed privacy policy date (2025 → 2024)

**Impact:** Patch release fixing critical bugs and improving stability.

---

## Version 3.0 (Major Release) - Planned Features

### High Priority Features

#### 1. Export Analysis Results
**Priority:** High
**Complexity:** Medium
**Description:** Allow users to export analysis results for documentation and reporting.

Features:
- Export single analysis to JSON/CSV
- Export full history
- Copy to clipboard (markdown format)
- Generate shareable report URL

Use cases:
- Documentation for clients
- Before/after optimization reports
- Team collaboration
- Performance audits

**Implementation notes:**
- Add export buttons to popup UI
- Use Chrome's download API
- Format data appropriately for each export type
- Consider adding timestamps and metadata

---

#### 2. Enhanced Framework Detection
**Priority:** High
**Complexity:** Medium-High
**Description:** Detect framework versions and support emerging frameworks.

New frameworks to detect:
- Fresh (Deno)
- Marko
- Alpine.js
- HTMX
- Svelte 5 with runes
- Ember.js
- Preact

Framework versions:
- Detect React version (16, 17, 18+)
- Detect Next.js version
- Show in results display

Rendering patterns:
- Islands Architecture (Astro)
- Partial Hydration (Qwik)
- Progressive Enhancement
- Streaming SSR

**Implementation notes:**
- Check for version in window globals
- Parse bundle filenames for versions
- Add pattern detection for islands/hydration
- Update scoring algorithm accordingly

---

#### 3. Performance Insights
**Priority:** High
**Complexity:** High
**Description:** Integrate Web Vitals and provide actionable recommendations.

Features:
- Web Vitals display (LCP, CLS, FID/INP, TTFB)
- Bundle size analysis
- Render-blocking resources detection
- Personalized recommendations

Recommendations engine:
- "Consider SSR for better SEO" (for pure CSR sites)
- "High JavaScript bundle detected"
- "Slow initial render - consider code splitting"
- "Excellent performance!" (for well-optimized sites)

**Implementation notes:**
- Use web-vitals library or implement custom metrics
- Analyze Resource Timing API
- Create recommendation logic based on scores
- Add new UI section for insights

---

### Medium Priority Features

#### 4. Comparative Analysis
**Priority:** Medium
**Complexity:** High
**Description:** Compare multiple pages or track changes over time.

Features:
- Side-by-side comparison of 2+ URLs
- Historical tracking (same URL over time)
- Visual diff showing changes
- Trend graphs

**Implementation notes:**
- Extend storage schema for historical data
- Create comparison UI/view
- Implement data visualization
- Consider storage limits

---

#### 5. Dark Mode
**Priority:** Medium
**Complexity:** Low
**Description:** Add dark mode support with system preference detection.

Features:
- Auto-detect system preference
- Manual toggle in popup
- Save preference to storage
- Smooth transitions

**Implementation notes:**
- Add prefers-color-scheme media query
- Create dark mode CSS variables
- Add toggle button to popup
- Store preference in chrome.storage.sync

---

#### 6. Batch Analysis
**Priority:** Medium
**Complexity:** Medium-High
**Description:** Analyze multiple pages at once.

Features:
- Analyze all open tabs
- Analyze all links on current page
- Crawl site (limited depth)
- Generate site-wide report

**Implementation notes:**
- Handle multiple tabs permission
- Queue analysis requests
- Show progress indicator
- Export batch results

---

#### 7. Settings Page
**Priority:** Medium
**Complexity:** Medium
**Description:** Full-featured settings/options page.

Features:
- Configure history limit
- Enable/disable notifications
- Choose visible metrics
- Customize scoring weights (expert mode)
- Export/import settings
- Reset to defaults

**Implementation notes:**
- Create options.html page
- Add to manifest.json
- Implement settings sync via chrome.storage.sync
- Update analyzer.js to use custom weights

---

### Low Priority Features

#### 8. Browser Action Enhancements
**Priority:** Low
**Complexity:** Low
**Description:** Additional ways to trigger analysis.

Features:
- Keyboard shortcut (Ctrl+Shift+S)
- Right-click context menu
- Badge showing last result on icon
- Auto-analyze on page load (optional)

**Implementation notes:**
- Add commands to manifest.json
- Implement context menu via chrome.contextMenus
- Update badge via chrome.action.setBadgeText

---

#### 9. Educational Content
**Priority:** Low
**Complexity:** Low-Medium
**Description:** In-app help and learning resources.

Features:
- Tooltips explaining each indicator
- Link to framework documentation
- Best practices guide
- SEO tips based on rendering type
- Interactive tutorial on first use

**Implementation notes:**
- Add tooltip library or custom implementation
- Create educational content
- Add "Learn more" links to results
- Consider onboarding flow

---

#### 10. Developer API
**Priority:** Low
**Complexity:** High
**Description:** Programmatic access to extension features.

Features:
- window.postMessage API for results
- DevTools integration (panel)
- CLI version
- Node.js package
- GitHub Action for CI/CD

**Implementation notes:**
- Create devtools.html panel
- Extract analyzer logic for Node.js
- Create CLI wrapper
- Publish to npm
- Create GitHub Action

---

## Version 4.0+ (Future Ideas)

### Advanced Features (Brainstorming)

1. **Machine Learning Detection**
   - Train model on known SSR/CSR sites
   - More accurate classification for edge cases
   - Auto-improve over time

2. **Browser Support**
   - Firefox extension
   - Safari extension
   - Edge store listing

3. **Team Features**
   - Shared analysis database
   - Team workspaces
   - Collaborative annotations

4. **Integration Ecosystem**
   - Lighthouse plugin
   - Webpack/Vite plugin
   - VS Code extension
   - Browser DevTools integration

5. **Monetization Options**
   - Free tier (current features)
   - Pro tier (batch analysis, exports, advanced metrics)
   - Enterprise tier (team features, API access)

---

## Community Feedback

We're actively seeking feedback! Please share your thoughts on:

1. Which features are most important to you?
2. What frameworks/tools are we missing?
3. What pain points does the current version have?
4. Any new feature ideas?

Submit feedback via [GitHub Issues](https://github.com/dzienisz/chrome-ssr-csr/issues).

---

## Development Timeline

- **v2.2**: Q4 2024 (bug fixes and minor improvements)
- **v3.0**: Q1 2025 (major feature release)
- **v3.x**: Q2-Q3 2025 (iterative improvements)
- **v4.0**: Q4 2025 (advanced features)

*Timeline is subject to change based on community feedback and development capacity.*
