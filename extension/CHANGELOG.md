# Changelog

All notable changes to the CSR vs SSR Detector extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.0.0] - 2026-09-11

The release answers a question the extension could not answer before: not just
*what* kind of rendering a page uses, but *where* its HTML was produced, *which
parts of the page* came from the server, and *why* the verdict came out the way
it did.

### Added

- **Delivery classification** (`src/detectors/delivery-detector.js`). The
  response headers of the document are now read and turned into a plain
  answer: prerendered at build time, served from a CDN cache, rendered by the
  origin, or dynamic and uncacheable. Identifies the CDN (Vercel, Netlify,
  Cloudflare, Fastly, CloudFront, Akamai, GitHub Pages, S3, Fly.io, Firebase,
  Bunny, KeyCDN, Varnish) and the origin runtime, parses `Cache-Control`,
  `Age`, RFC 9211 `Cache-Status` and the vendor cache headers, and reports
  TTFB and Server-Timing. Deliberately contributes **zero** to the SSR/CSR
  score — transport is not rendering.
- **Region attribution** (`src/detectors/dom-diff-detector.js`). The
  pre-JavaScript document is now lined up against the live DOM region by
  region, so the report can say that the header and footer came from the
  server and `#root` gained 12,400 characters after the scripts ran. A
  container the server filled is split into its landmarks; a container
  JavaScript filled is reported whole, because that boundary is the finding.
  Also score-neutral.
- **"Rendered where"** — a one-line verdict combining the rendering
  classification with the delivery evidence: built in the browser, rendered
  ahead of the request, served as a static file, served from a cache, answered
  by the origin, not reusable by caches, or server-rendered with client
  islands. The wording claims only what the headers prove: a cache hit says a
  cache answered *this* visit, not that the HTML was rendered exactly once.
- **Explainable evidence.** Every detector now emits structured signals
  (`{id, label, impact, weight, detail}`) alongside its indicators, so the UI
  shows the arithmetic behind a verdict — which signal contributed how many
  points, and what it actually observed — instead of a bare percentage.
- **DevTools panel** ("Rendering"). The same report at full width, re-running
  on every navigation. Reaches the page through
  `devtools.inspectedWindow.eval`, so it needs no additional permissions.
- **Right-click entry** ("Analyze page rendering") and a keyboard shortcut
  (`Ctrl/Cmd+Shift+Y`) that opens the report.
- **Offline detection harness** (`npm run validate:local`). Eight hand-written
  fixture pages, served with known headers, analyzed by the real bundle in real
  Chromium, graded on verdict, delivery mode and region attribution. Runs in CI
  — unlike the 22-site live harness, which needs the open internet and sites
  that rewrite themselves without warning. `npm run preview` renders every
  surface against a real analysis result and screenshots it.
- **Localized UI.** 50 interface strings across all eight shipped locales (en,
  ja, ko, fr, de, es, pt-BR, pl). Longer explanatory prose stays in English and
  falls back cleanly.

### Changed

- **The popup analyzes the moment it opens.** Asking you to press a button
  first was asking you to confirm the only question the popup exists to answer.
  Settings → Analysis turns it back off.
- **Popup rewritten** around a verdict hero (badge, confidence dial, render
  origin, server/client split bar) and five tabs: Overview, Evidence, Delivery,
  Regions, History. Keyboard-navigable tabs, live regions for the verdict, and
  a shared stylesheet with the panel, the settings page and onboarding.
- **Settings and onboarding** rebuilt on that shared design system, with the
  new auto-analyze toggle and the configured keyboard shortcut.
- Exports carry the new data: Markdown gains delivery, evidence and a region
  table; CSV gains delivery and server-share columns; a one-line "Copy summary"
  is new.
- History rows open the report they describe, and honor the configured limit
  when written from the context menu (they previously used a hardcoded ten).
- Framework coverage extended to SvelteKit 2, Deno Fresh, Vike, TanStack Start,
  Blazor, Phoenix LiveView, Turbo/Hotwire, Livewire, Inertia, Stimulus, Unpoly,
  Marko, Ember and Angular's `ng-server-context`; generator coverage to Astro,
  Gatsby, VitePress, Zola, Sphinx, Middleman, Bridgetown, Nikola, Publii,
  Quarto and Antora. Script `src` and `id` attributes now count as framework
  evidence, which is the only way to see Blazor, Deno Fresh and Vike.

### Fixed

- **The popup no longer renders page-derived strings as HTML.** Results were
  previously formatted into an HTML string inside the inspected page and
  assigned to the popup's `innerHTML`; a page chooses its own element ids and
  header values. Rendering is now DOM construction with text nodes, on the
  extension side.
- `chrome.action.onClicked` in the background worker was unreachable — the
  action has a popup, so that event never fires, and the analysis pipeline
  behind it could never run. Replaced with the context-menu entry.
- The toolbar badge is cleared when a tab navigates, instead of showing the
  previous document's verdict.
- `popup.html` loaded a script (`analyzer.js`) that has not existed since the
  modular rewrite.
- **Region measurements went stale on a second analysis of the same page.** The
  per-run memo was module state keyed by live DOM elements, which nothing
  evicts, so the popup's re-run button and the panel's re-run-on-navigation
  reported the first run's text lengths — and every number derived from them.
- **A navigation during a DevTools analysis hung the panel** until the 20-second
  timeout: the run in flight held a busy flag, and its poll waited for a
  result from a document that no longer existed.
- **Overlapping analyses could show the older result.** Auto-analyze on open
  and the re-run button can both be in flight; the slower one finishing last
  replaced the newer report, badge, history entry and telemetry.
- **Concurrent analyses could drop a history entry.** The popup and the
  background worker both read-modify-wrote the whole `analysisHistory` array.
  All appends now go through the worker, which serializes them.
- `public, max-age=0, s-maxage=86400` — the canonical ISR header pair — was
  classified as a dynamic, uncacheable response. `s-maxage` is now read before
  the `max-age=0` fallback.
- **Multi-tier cache headers were read from the wrong end.** A request crossing
  a shield and an edge gets one token per tier, origin-first (`X-Cache: MISS,
  HIT`), and keyword-searching the whole string reported the tier the browser
  never talked to. The edge-most token decides now, and every tier that
  reported a state is kept — a site behind Cloudflare *and* Vercel can answer
  HIT at one and MISS at the other, and the Delivery tab shows both.
- The decisive-CSR cap now reports the points it removed, so the evidence list
  adds up to the score the verdict used instead of landing 80 points away
  from it with nothing to explain the gap.
- The toolbar badge is cleared on same-URL reloads, which report `loading`
  with no `url` field.
- Clicking Copy twice inside the reset window left the button permanently
  reading "Copied".
### Security

- **CSV exports no longer carry executable cells.** Page titles, element ids and
  header values flow into the export; a page titled `=HYPERLINK(…)` produced a
  correctly quoted CSV field that Excel, LibreOffice and Sheets all execute on
  open. Values starting with `=`, `+`, `-` or `@` — after any leading
  whitespace or control characters — are now prefixed so the cell stays text.

### Accessibility

- Every control on the settings page has an accessible name. The switches were
  labelled by a neighbouring `<div>`, so a screen reader announced each one as
  an unnamed checkbox.
- Each page sets `documentElement.lang` from the UI locale. The markup ships
  English and is rewritten at runtime, so a Polish or Japanese interface was
  being announced with English pronunciation rules.
- The welcome and settings pages are fully localized: 38 further message keys
  across all eight locales, and a test that fails when markup asks for a key no
  catalog defines.

### Privacy

- Unchanged. The telemetry payload is exactly what it was in 3.12.0: nothing
  added in this release — response headers, region attribution, delivery
  classification — is ever sent anywhere. It is computed on your device, shown
  to you, and discarded.

## [3.12.0] - 2026-09-09

### Privacy

- Return only hydration error count and health score from telemetry collection, with a defensive projection at the collector boundary; raw hydration messages are no longer forwarded.
- Clarify local history versus optional telemetry, public dashboard fields and backend minimization of historical/public records. No historical database cleanup is performed.
- Keep sharing defaults, detection weights, local history/exports and feedback behavior unchanged.

### Fixed

- Exclude the reserved probe bridge from raw/rendered text comparison, body-HTML pattern checks and content element counts without mutating the live page or changing detection weights.
- Keep only 100 recent navigation records and five hydration error samples locally, while separate totals preserve route/error counts and hydration health across trimming. Collectors remain compatible with legacy snapshots and retain privacy-safe telemetry output.
- Add real-module isolation regressions and fresh-realm probe tests; verify unchanged SSR/CSR results across repeated probe writes in a controlled browser fixture.
- Store probe snapshots in a non-rendered attribute so page CSS cannot expose telemetry as page text; keep legacy snapshots readable. Already-open pages may need a reload after updating to receive the new probe.
- Exclude probe metadata from hosting detection so local diagnostic strings cannot create false Vercel or Netlify matches.

### Added

- **Feedback survey** — a "Give feedback · 1 min" link in the popup footer
  opens a short Google Form in a new tab. Sharing feedback is optional; the
  link does not attach the analyzed page URL, analysis results, or a referrer.
  The form does not require Google sign-in or collect email addresses.

## [3.11.1] - 2026-09-07

### Fixed

- Release workflow now submits built extensions to the Chrome Web Store and
  addons.mozilla.org automatically when a version tag is pushed. The previous
  `v3.11.0` tag was created before this workflow change, so it only produced
  GitHub Release assets without store publication.

## [3.11.0] - 2026-09-06

### Fixed

- **Next.js App Router was never detected.** The `nextjs` marker was
  `#__next, #__NEXT_DATA__` — both Pages Router only. App Router pages (the
  default since Next 13) emit neither; they stream the RSC payload through
  `self.__next_f`. Verified against nextjs.org and vercel.com: zero
  `__NEXT_DATA__`, zero `#__next`, 46 and 7 hits for `__next_f`. Framework
  detection now also matches script contents, not just CSS selectors
  (`config.frameworkContentPatterns`), with the same rule as before — a marker
  only counts as SSR evidence when it is present in the **raw** HTML.
- Remix/React Router markers were equally stale: `[data-remix-run]` is Remix
  v1. Added `data-remix-managed-head` / `data-remix-stylesheet` and the
  `__reactRouterContext` / `__remixContext` globals (React Router 7).
- Angular SSR hydration (`ngh`), SvelteKit preload attributes and Nuxt's
  `#__NUXT_DATA__` island are now recognized.
- Navigation API entry counting filters on `sameDocument`. `entries()` also
  contains contiguous same-origin entries from real document navigations, so
  an ordinary multi-page visit would otherwise have been reported as an SPA.
- Structural platform signals are matched against markup and `<style>`
  contents, never script bodies — a bundle carrying
  `@view-transition { navigation: auto }` as a string literal is not a page
  using cross-document transitions. Framework script-content markers skip the
  extension's own bundles for the same reason.
- INP follows Google's percentile rule (drop one outlier per 50 interactions)
  and groups events by `interactionId`, rather than reporting the single worst
  event. Note the Event Timing buffer only retains events of 104ms or longer,
  which no `durationThreshold` can retroactively lower.
- **Speculative navigations no longer corrupt the timing signals.** A
  prerendered document's clock starts before the user navigates, so its FCP
  read as impossibly fast; a prefetched one has a TTFB it never paid. FCP is
  now rebased on `PerformanceNavigationTiming.activationStart`, and when the
  navigation was prerendered or `deliveryType === 'navigational-prefetch'`
  the timing heuristics are skipped rather than scored wrong.

### Added

- **Soft Navigations API** (`soft-navigation` + `interaction-contentful-paint`,
  stable in Chrome 151): browser-verified SPA route changes with per-route
  paint timing. Unlike the patched `history.pushState`, these require a real
  interaction, a URL change _and_ a paint — a router that only rewrites the
  URL no longer counts as a route change. Chromium-only; the history patch
  stays as the fallback.
- **Navigation API** support in the probe (`navigate` events) and in the
  collector (`navigation.entries()`), Baseline since Firefox 147. Catches
  routers that never touch `history.*`, and reports client-side routing that
  happened before the extension ran. Records are deduplicated, so engines that
  surface `pushState` through both paths cannot double-count.
- **New `platform-detector.js`** for rendering signals from post-2024 platform
  features, all credited from raw HTML only:
  - `<script type="speculationrules">` — prerendering whole documents only
    makes sense in a multi-page architecture (+15 SSR)
  - `@view-transition { navigation: auto }` — an MPA that animates between
    real navigations, which otherwise _looks_ like an SPA (+15 SSR)
  - declarative partial updates (`<?start>`/`<?end>` + `<template for>`) —
    JS-free out-of-order streaming, a rendering strategy the taxonomy had no
    name for (+20 SSR)
- **INP replaces FID** in telemetry. FID stopped being a Core Web Vital in
  March 2024 and the dashboard already refused to display it. As with FID,
  only interactions the user made before opening the popup are visible, so
  null stays a normal result.
- **Long Animation Frame stats** (count, blocking duration, longest frame).
  Aggregates only — LoAF entries carry script sourceURLs, and the payload is
  anonymized to origin.

### Changed

- Backend: `/api/stats` CWV aggregation returns `avg_inp`/`inp_good`; the
  analysis modal shows INP, falling back to FID for rows written by older
  extensions.

### Privacy

- **Route paths are no longer sent.** `navigation_stats.routes` carried
  `view` pathnames (since v3.5.0), which contradicts the privacy policy's
  "Data NOT collected: Full URLs or page paths". Routes now carry type,
  timing and source only, and soft-navigation entries never included a path.
  Nothing consumed the field — neither the popup nor the dashboard.

## [3.10.0] - 2026-07-15

### Added

- **Firefox support** via the cross-browser WebExtensions API. The Chrome
  `manifest.json` stays canonical; `npm run build:firefox` (or the release
  workflow) generates a Firefox package in `dist/firefox/` with a transformed
  manifest: `background.scripts` event page instead of `service_worker`,
  plus `browser_specific_settings.gecko` (AMO add-on id,
  `strict_min_version: 128` for `world: "MAIN"` content scripts, and the
  data-collection disclosure AMO requires). Validated with `web-ext lint`
  (0 errors). Requires Firefox 128+.
- Release workflow now attaches a `csr-ssr-detector-firefox-vX.Y.Z.zip`
  (for addons.mozilla.org) alongside the Chrome Web Store zip.

### Changed

- `chrome.scripting.executeScript` calls use the standard `func:` key instead
  of Chrome's deprecated `function:` alias (Firefox only accepts `func`).
- `options_page` replaced with `options_ui` (`open_in_tab: true`) — same
  behavior in Chrome, and the only form Firefox supports.
- Popup's restricted-URL guard also recognizes `moz-extension:` and
  `resource:` pages.

## [3.9.0] - 2026-07-14

### Added

- **i18n stage 1 — localized name/description** (`_locales/`): en (default),
  ja, ko, fr, de, es, pt_BR, pl. Manifest uses `__MSG_appName__`/
  `__MSG_appDesc__` with `default_locale: en`. This unlocks per-language
  Chrome Web Store listings (listing languages are derived from the locales
  the package declares). Extension UI itself remains English for now —
  full UI translation is a follow-up stage.

## [3.8.1] - 2026-07-13

### Fixed

- **Stale privacy notice on the settings page**: it still said "Backend coming
  in v3.1 — data is not sent anywhere", contradicting the on-by-default
  telemetry (live since v3.2.0), and claimed full URLs are collected when only
  the domain is sent. Now matches the privacy policy (domain only, country
  enrichment disclosed) and links to it.

## [3.8.0] - 2026-07-10

### Added

- **Onboarding page** (`welcome.html`): opens once on first install. Walks
  through pinning the extension to the toolbar (with a live pinned/not-pinned
  status via `chrome.action.getUserSettings()`), explains the SSR/CSR/MIX
  badge, and surfaces the telemetry opt-out and privacy policy up front.
- **Pin hint in popup**: a dismissible banner shown when the extension isn't
  pinned to the toolbar (`isOnToolbar === false`). Dismissal is remembered in
  `chrome.storage.local` (`pinHintDismissed`). Chrome offers no API to pin
  programmatically, so both features nudge instead.

### Fixed

- **Broken logo on the settings page**: `options.html` referenced `icon.webp`,
  which doesn't exist in the package — now uses `icon48.png` like the popup.
- **Missing `<meta charset="utf-8">` in `popup.html`**: emoji in the popup
  relied on Chrome's extension-page encoding default; now declared explicitly.
- **Privacy policy brought in line with reality**: telemetry is described as
  opt-out (enabled by default) instead of "opt-in", and the server-side
  country-from-IP enrichment (`device_info.country`, IP never stored) is now
  disclosed in the data list.

### Removed

- **Legacy `src/telemetry.js`**: Dead module left over from the pre-bundle
  architecture. It was never loaded — absent from both bundles, `manifest.json`,
  and the HTML pages — and duplicated (and drifted from) the telemetry logic in
  `popup.js`, which owns the actual `sendAnalysisData` implementation. (The
  v3.7.0 "telemetry version" fix below landed in this dead copy; the live
  sender in `popup.js` already read `chrome.runtime.getManifest().version`.)

## [3.7.0] - 2026-07-08

### Fixed - Structural SSR bias in detection 🎯

The DIR-04 spike (`plans/002`) showed 0/6 known pure-CSR sites detected as
CSR — most classified as SSR. Six fixes:

- **Inline script/style text no longer counts as content**: the raw-vs-rendered
  comparison read `innerText` off the detached fetched document, which falls
  back to `textContent` and includes inline `<script>`/`<style>` text — so
  script-heavy (i.e. CSR) pages got SSR credit proportional to their bundle
  size. Both sides now strip `script/style/noscript/template` and are measured
  identically.
- **Symmetric comparison guards**: the SSR branch now also requires ~200 chars
  of real raw text (previously 10 chars of raw text could count as "SSR match").
- **Decisive-CSR override**: when the server sent <10% of the visible text,
  rendered-DOM SSR signals (which describe the post-JS DOM) are capped instead
  of outvoting the comparison.
- **Framework markers require raw-HTML evidence**: React/Vue/Svelte/… markers
  found only in the rendered DOM no longer count as "hydration (SSR)" — that is
  exactly what a booted CSR app looks like.
- **Hybrid band aligned with config**: scoring hardcoded a 35–65% hybrid band
  instead of the configured 41–59, absorbing true CSR sites into "Hybrid".
- **Comparison-unavailable handling**: when the raw-HTML fetch fails, confidence
  is capped and definitive verdicts downgrade to "Likely" ones.
- **Telemetry version**: `src/telemetry.js` sent a hardcoded `3.5.0`; it now
  reads `chrome.runtime.getManifest().version` so dashboard data can be
  segmented into pre/post-fix eras.

Validated against the 22-site ground-truth harness
(`scripts/validate-detection.mjs`).

## [3.6.1] - 2026-07-07

### Fixed - Core Web Vitals telemetry never delivered 🩹

- **CWV data loss**: The telemetry orchestrator raced Core Web Vitals collection
  against a 500ms timeout, but the collector's internal observers waited 1000–2000ms
  (CLS, FID, TBT) — so the timeout won every time and `coreWebVitals` was sent as
  `null` for 100% of analyses since v3.6.0. Buffered `PerformanceObserver` entries
  arrive nearly instantly on an already-loaded page, so the internal waits are now
  300–500ms and the outer race is a 2s safety net that no longer truncates.
- **CLS = 0 dropped**: A perfect layout-shift score of `0` was treated as missing
  data due to a truthiness check; `0` is now reported as a valid measurement
  (same fix for FID).

## [3.6.0] - 2026-02-18

### Changed - Detection/Telemetry Split ⚡

- **Faster results**: Detection now runs independently of telemetry collection — the SSR/CSR verdict and results UI appear immediately without waiting for Core Web Vitals, device info, SEO audits, etc.
- **Conditional telemetry loading**: `telemetry-bundle.js` is only injected into the page when `shareData` is enabled (opt-in). Users who have opted out no longer run any telemetry code at all.
- **New `src/collectors/` directory**: Moved 7 telemetry modules out of `src/detectors/` to make the separation of concerns explicit (`performance-collector.js`, `page-type-detector.js`, `device-detector.js`, `tech-stack-detector.js`, `seo-detector.js`, `hydration-detector.js`, `navigation-detector.js`)
- **New `src/telemetry-bundle.js`**: Dedicated bundle for telemetry collectors, built alongside `analyzer-bundle.js`
- **Smaller `analyzer-bundle.js`**: Reduced from ~70 KB to 37 KB by removing telemetry code

## [3.5.0] - 2026-01-27

### Added - Phase 3: User Journey & Hydration Analytics 💎

- **Hydration Tracking**: New `hydration-detector.js` module
  - Tracks framework-specific hydration state (React, Vue, Alpine.js)
  - Identifies "Island Architecture" and partial hydration patterns
- **Navigation Analytics**: New `navigation-detector.js` module
  - Analyzes navigation performance (BFCache, SPA transitions)
  - Measures Interaction to Next Paint (INP) precursors
- **Dashboard Improvements**:
  - **Infinite Scroll**: Seamlessly browse historical analyses
  - **Standardized UI**: Full migration to customized Tremor design system
  - **Record Management**: Added ability to delete stale or unwanted analysis records
- **Bug Fixes**:
  - Fixed broken icon references in notifications and popup
  - Corrected redundant analyzer script loading in popup

## [3.4.0] - 2026-01-27

### Added - Phase 2: Tech Stack & SEO Intelligence 🧠

- **Tech Stack Detection**: New `tech-stack-detector.js` module
  - **CSS Frameworks**: Detects Tailwind, Bootstrap (v4/v5), Material UI, Chakra UI, Bulma, Ant Design, Foundation
  - **State Management**: Detects Redux, MobX, Recoil, XState, Apollo Client
  - **Build Tools**: Detects Vite, Webpack, Next.js, Parcel
  - **Hosting & Cloud**: Detects Vercel, Netlify, AWS Amplify, Cloudflare, Heroku, GitHub Pages
  - **Legacy Libs**: Detects jQuery, AngularJS, Backbone, Zepto

- **SEO & Accessibility Audit**: New `seo-detector.js` module
  - **SEO Health Checks**:
    - Meta tags presence (description, robots, viewport)
    - Social tags (Open Graph, Twitter Cards)
    - Canonical URL verification
    - Structured Data (JSON-LD) detection
  - **Accessibility (A11y) Checks**:
    - Image Alt Text coverage percentage
    - ARIA label usage detection
    - Semantic HTML landmarks (nav, main, footer)
    - "Skip to content" link detection
    - Empty button detection

- **Backend Intelligence**:
  - New `tech_stack` and `seo_accessibility` JSONB columns in database
  - Dashboard updated with "Tech Stack Trends" and "SEO Insights" components
  - Performance optimized for rich telemetry data

### Changed

- **Dashboard**: Added visual charts for most popular CSS frameworks and build tools
- **Telemetry**: Extended payload to include deep technical architecture data
- **Database**: optimized indexing for JSONB queries on tech stack fields

## [3.3.1] - 2026-01-27

- Fix: Critical telemetry bug where Phase 1 data (Core Web Vitals, Page Type) was collected but not sent to backend
- Fix: Analysis timeout issues by optimizing collection thresholds
- Fix: Results display issue by ensuring UI renderers are bundled correctly

## [3.3.0] - 2026-01-27

### Added - Phase 1: Enhanced Data Collection 🚀

- **Core Web Vitals Collection**: New `performance-collector.js` module
  - Collects LCP (Largest Contentful Paint)
  - Collects CLS (Cumulative Layout Shift)
  - Collects FID (First Input Delay)
  - Collects TTFB (Time to First Byte)
  - Collects TTI (Time to Interactive)
  - Collects TBT (Total Blocking Time)
  - Resource metrics and cache hit rate
  - Evaluates if site passes Core Web Vitals thresholds

- **Page Type Detection**: New `page-type-detector.js` module
  - Detects: e-commerce, auth, blog, docs, app, homepage
  - Identifies analytics tools (GA, GTM, Mixpanel, Hotjar, Segment, Amplitude)
  - Checks for PWA support (service worker + manifest)
  - Additional page characteristics (video, images, forms)

- **Device & Connection Info**: New `device-detector.js` module
  - Device type detection (mobile/tablet/desktop)
  - Browser and engine detection (Chrome, Firefox, Safari, etc.)
  - Connection type (WiFi, 4G, 3G, slow-2G)
  - Network quality metrics (downlink, RTT)
  - User preferences (dark mode, reduced motion)
  - Hardware info (CPU cores, memory)

- **Build System**: Professional build tooling
  - New `scripts/build-bundle.js` for automated bundling
  - `npm run build` command to generate analyzer bundle
  - Proper dependency ordering
  - Build documentation in `BUILD.md`

### Changed

- **Telemetry**: Updated payload to include Phase 1 data
  - `coreWebVitals` object with all metrics
  - `pageType` field for page classification
  - `deviceInfo` object with device/connection data
- **Analyzer**: Now collects Phase 1 data during analysis
  - Async collection of Core Web Vitals
  - Sync detection of page type and device info
- **Version**: Bumped to 3.3.0 across all files

### Technical

- Modular detector architecture in `src/detectors/`
- Build script concatenates 13 modules into single bundle
- Bundle size: 50.54 KB (from 49.93 KB)
- Total lines: 1,788 (from 1,767)
- Privacy-first: No PII collected, all data anonymized

## [3.2.1] - 2026-01-27

### Added

- **More Framework Detection**: Added support for 15+ new frameworks and platforms:
  - Frameworks: Angular, Vue (standalone), Svelte, Preact, Lit, HTMX, Alpine.js
  - CMS: WordPress, Shopify, Webflow, Wix, Squarespace
  - Static Generators: Docusaurus, VuePress, MkDocs, GitBook, Pelican

- **Hybrid/Islands Detection**: New `detectHybridPatterns()` function
  - Detects Astro islands architecture
  - Detects partial hydration patterns
  - Detects React Server Components
  - Detects Qwik resumability
  - Detects streaming SSR with Suspense boundaries

- **Visual Content Comparison**: New UI showing raw vs rendered content ratio
  - Visual bar chart showing the ratio percentage
  - Clear indicator (✓ SSR / ✗ CSR / ~ Hybrid)
  - Displays raw HTML and rendered character counts

- **Hybrid Score Display**: Shows hybrid detection score when detected

### Changed

- **Improved Classification**: Now detects "Hybrid/Islands Architecture" for strong hybrid signals
- **Backend Dashboard**: Added Content Comparison Analysis section with new metrics
- **Telemetry**: Now sends contentRatio, hybridScore to backend for analytics

## [3.2.0] - 2026-01-27

### Fixed

- **CSR Detection Algorithm**: Major fix for accurate CSR detection
  - Previously, analyzer ran on live DOM after JavaScript executed, making CSR apps look like SSR
  - Now fetches raw HTML and compares to rendered DOM for accurate detection
  - Raw HTML much smaller than rendered DOM = CSR indicator (+40 points)
  - Raw HTML matches rendered content = SSR indicator (+30 points)

### Added

- **Raw HTML Comparison**: New `compareInitialVsRendered()` async function
  - Fetches page's raw HTML before JS execution
  - Compares text content ratio between raw and rendered DOM
  - Most reliable signal for CSR vs SSR detection

- **CSR Pattern Detection**: New `detectCSRPatterns()` function
  - Detects SPA root containers (#root, #app) with React/Vue markers
  - Checks for "JavaScript required" noscript messages
  - Detects dynamic body classes (js-loaded, app-loaded, hydrated)

### Changed

- **Performance Timing Logic**: Fixed backwards logic
  - Before: Fast DOMContentLoaded = SSR (incorrect!)
  - After: Fast DOMContentLoaded + slow FCP = CSR (content loaded via JS)
  - Fast FCP only counts as SSR when DOM timing is reasonable

- **Scoring Weights**: Rebalanced for accuracy
  - Reduced `richContent` weight from 35 to 20 (rendered DOM is misleading)
  - Added new CSR-specific weights for pattern detection
  - Added `slowFCP` threshold (1000ms) for CSR detection

- **Async Analysis**: `pageAnalyzer()` is now async to support raw HTML fetch

## [3.1.2] - 2026-01-26

### Added

- **Badge on icon**: Shows SSR/CSR/MIX directly on extension icon after analysis
  - Green badge for SSR
  - Red badge for CSR
  - Amber badge for Hybrid/Mixed
  - No need to open popup to see result

## [3.1.1] - 2026-01-26

### Changed

- **Telemetry opt-out**: Changed from opt-in to opt-out (enabled by default)
  - Users can disable anytime in Settings → "Share anonymous data"

## [3.1.0] - 2026-01-26

### Added

- **Analytics Backend**: New Next.js backend for anonymous telemetry
  - Dashboard at https://backend-mauve-beta-88.vercel.app/dashboard
  - Tracks render type distribution, top frameworks, analyzed domains
  - Timeline charts showing usage over time
  - Recent analyses table with detailed info
  - Top Domains component showing most analyzed sites

### Changed

- **Telemetry Integration**: Extension sends anonymous data (opt-out)
  - Enabled by default, can be disabled in settings
  - Data sent: domain (not full URL), render type, confidence, frameworks
  - Controlled via "Share anonymous data" setting
  - Privacy-first: URLs anonymized to origin only
- **Removed host_permissions**: Extension no longer requires host permissions
  - Fetch requests work via CORS headers from backend
  - Cleaner permission model for Chrome Web Store

### Security

- **Removed hardcoded API keys**: API authentication made optional
  - Backend relies on CORS headers for protection
  - No sensitive data in extension source code

## [3.0.5] - 2025-10-21

### Fixed

- **Critical Hotfix**: Fixed missing `src/analyzer-bundle.js` in production build
  - v3.0.4 was missing the analyzer bundle file due to incorrect zip exclusion pattern
  - Extension would show "Cannot access this page" error when analyzing
  - Updated build script to include bundle while excluding source modules
  - No code changes, only packaging fix

## [3.0.4] - 2025-10-20

### Fixed

- **Complete Dropdown Styling Fix**: All dropdown elements now properly styled in both themes
  - Fixed select element text color in dark mode (white text instead of dark)
  - Fixed dropdown options with explicit colors for both light and dark modes
  - Light mode: white background with dark text
  - Dark mode: dark background with white text
  - Both closed and open dropdowns are now readable in all themes
  - Applies to theme selector and history limit dropdowns
  - Note: CSS variables don't work reliably for native browser dropdown controls

## [3.0.3] - 2025-10-20

### Fixed

- **Initial Dropdown Styling**: First attempt at fixing dropdown visibility
  - Added basic styling for dropdown options
  - Discovered CSS variable limitations with native controls

## [3.0.2] - 2025-10-20

### Added

- **System Dark Mode Detection**: Theme now syncs with system preferences
  - New "Auto (System)" option in settings (default)
  - Automatically detects `prefers-color-scheme` media query
  - Three theme options: Auto, Light, Dark
  - Real-time switching between themes
  - Works seamlessly across popup and settings pages

### Changed

- **Dynamic Version Display**: Version now read from manifest.json
  - Removed hardcoded version strings from all HTML/JS files
  - Uses `chrome.runtime.getManifest().version` for consistency
  - Single source of truth for version number
  - Auto-updates in popup footer and settings footer

### Fixed

- **CSP Compliance**: Removed inline scripts from HTML files
  - Fixed Content Security Policy violations
  - Moved version injection code to JavaScript files
  - Follows Chrome extension best practices
- **Theme Dropdown Default**: "Auto (System)" now properly selected by default

### Technical

- Modified `options.js` and `popup.js` for system theme detection
- Updated `options.html` to use select dropdown instead of toggle
- Added `window.matchMedia('(prefers-color-scheme: dark)')` detection
- Version injection moved to DOMContentLoaded event listeners
- Bumped version to 3.0.2 in manifest.json

## [3.0.1] - 2025-10-20

### Fixed

- **Dark Mode Styling**: Fixed indicator badge styling in dark mode
  - Badges now show proper contrast (gray background with white text)
  - Fixed confidence bar background color for dark theme
  - All accent colors and borders properly adapt to theme
- **Script Injection Guard**: Added protection against duplicate analyzer injection
  - Prevents "Identifier already declared" errors on repeated analysis
  - Wrapped analyzer-bundle.js with injection guard
- **Restricted URL Handling**: Better error handling for Chrome internal pages
  - Shows friendly message when trying to analyze chrome://, edge://, about:, etc.
  - No more console errors for restricted pages
  - Added chrome.runtime.lastError checks throughout popup.js
  - Beautiful error screen with clear instructions

### Technical

- Updated `src/ui/components/results-renderer.js` with theme detection
- Rebuilt `src/analyzer-bundle.js` with injection guard wrapper
- Added URL validation and error handling in popup.js

## [3.0] - 2025-10-20

### Added

- **⚙️ Settings Page**: Full-featured options page (`options.html`)
  - Dark mode toggle with smooth theme transitions
  - Configurable history limit (5, 10, 25, 50, 100, or unlimited)
  - Desktop notifications toggle
  - Anonymous data sharing opt-in (UI ready for v3.1 backend)
  - Export settings as JSON
  - Reset to defaults functionality
- **🌙 Dark Mode**: Beautiful dark theme throughout the extension
  - CSS variable-based theming system
  - Syncs between popup and settings page
  - Smooth transitions and animations
  - Persists user preference across sessions
- **📤 Export Functionality**: Download analysis results in multiple formats
  - **JSON export**: Structured data for developers
  - **CSV export**: Spreadsheet-friendly format
  - **Markdown export**: Documentation-ready reports
  - Includes URL, timestamp, all metrics, and indicators
- **🔒 Data Sharing Opt-in**: Privacy-first anonymous data collection (v3.1)
  - Clear explanation of what data is shared
  - Fully GDPR-compliant UI
  - Currently logs to console (backend coming in v3.1)
- **🎨 UI Improvements**:
  - Settings gear icon in popup header
  - Export buttons appear after analysis
  - Better visual hierarchy
  - Improved dark mode compatibility

### Changed

- Updated popup UI with settings access
- History limit now respects user preference from settings
- All UI elements support both light and dark themes
- Improved loading state animations with theme awareness

### Technical

- Added `options_page` to manifest.json
- Created `options.html` and `options.js` for settings management
- Completely rewrote `popup.js` with dark mode, export, and settings integration
- Updated `popup.html` with new header layout and export buttons
- Uses `chrome.storage.sync` for settings persistence
- Bumped version to 3.0 in manifest.json

## [2.3] - 2025-10-20

### Changed

- **Internal code refactoring**: Split monolithic `analyzer.js` (350+ lines) into modular architecture
  - Created `src/core/` folder with config, analyzer, and scoring modules
  - Created `src/detectors/` folder with 4 specialized detector modules
  - Created `src/ui/components/` folder for results rendering
  - All modules bundled into `src/analyzer-bundle.js` for deployment
- Improved code maintainability and scalability for future v3.0 development
- Fixed script injection guard to prevent redeclaration errors

### Technical Notes

- No user-facing changes - functionality remains identical to v2.2
- Better organized codebase makes future feature development easier
- Foundation for v3.0 features (settings page, dark mode, export functionality)

## [2.2] - 2024-10-14

### Added

- Try-catch error handling in `pageAnalyzer()` function for better stability
- Additional React detection selectors for modern React 18+ applications
- Better error reporting with fallback analysis results
- MIT License file
- Comprehensive documentation (CHANGELOG.md, ROADMAP.md, enhanced README.md)

### Fixed

- Function call argument order in `popup.js:60` (history saving bug)
- React detection for applications without legacy `[data-reactroot]` attribute
- Privacy policy date correction (2025 → 2024)
- Improved error handling for DOM operations on restricted pages

### Changed

- Enhanced README.md with better structure, badges, and detailed sections
- Updated documentation with clear installation, usage, and contributing guidelines

## [2.1] - 2024-07-03

### Added

- Privacy policy documentation
- Sequence diagram illustrating detection flow
- Improved UI with modern design system

### Changed

- Enhanced detection algorithm with weighted scoring
- Better confidence calculation based on indicator count
- Improved visual feedback with confidence bars

### Fixed

- Performance timing analysis edge cases
- History display formatting

## [2.0] - 2024-05-26

### Added

- Complete UI/UX redesign with modern interface
- Enhanced analysis engine with more accurate detection
- History tracking feature (stores last 10 analyses)
- Performance metrics display (DOM ready time, FCP)
- Framework-specific detection for:
  - Next.js, Nuxt, Gatsby, Remix, SvelteKit
  - Astro, Qwik, SolidJS
  - Jekyll, Hugo, Eleventy, Hexo
- Detailed indicator display showing detection signals
- Visual confidence bars for analysis results
- Desktop notifications for analysis completion
- Help section explaining SSR vs CSR differences

### Changed

- Migrated to Chrome Manifest V3
- Improved scoring algorithm with multiple weighted indicators:
  - HTML content analysis
  - Framework hydration markers
  - Serialized data detection
  - Meta tags and SEO analysis
  - Script analysis and code splitting patterns
  - Performance timing metrics
  - Client-side routing detection
  - Structured data presence
- Better classification with 5 render type categories:
  - Server-Side Rendered (SSR)
  - Client-Side Rendered (CSR)
  - Likely SSR with Hydration
  - Likely CSR/SPA
  - Hybrid/Mixed Rendering
- Enhanced UI with color-coded results
- Improved extension popup design

### Fixed

- Validation rules for SSR and CSR detection
- Script injection reliability
- Performance on complex web applications

## [1.0] - Initial Release

### Added

- Basic SSR vs CSR detection functionality
- Simple popup interface
- Chrome extension with basic analysis
- Detection based on:
  - Initial HTML content
  - JavaScript framework presence
  - Basic meta tag analysis

---

## Version History Summary

- **v3.1.2**: Badge on icon showing SSR/CSR/MIX result
- **v3.1.1**: Telemetry changed to opt-out (enabled by default)
- **v3.1.0**: Analytics backend with dashboard, telemetry integration
- **v3.0.5**: Critical hotfix for missing bundle file
- **v3.0**: Settings page, dark mode, export functionality
- **v2.1**: UI polish, privacy policy, documentation improvements
- **v2.0**: Major redesign with advanced detection, history, and modern UI
- **v1.0**: Initial release with basic detection capabilities
