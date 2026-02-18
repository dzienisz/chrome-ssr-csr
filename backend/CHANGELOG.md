# Changelog - Analytics Dashboard

All notable changes to the SSR/CSR Analytics Dashboard will be documented in this file.

## [1.3.0] - 2026-02-18

### Fixed
- **Initial load completeness**: Phase 1 (Core Web Vitals, page types, device) and Phase 3
  (hydration, navigation) now fetched server-side on initial render — previously blank until
  the first 30-second client-side refresh
- **Single refresh fetch**: Dashboard now makes one request to `/api/stats?type=all` every 30s
  instead of three separate requests (`/api/stats`, `/api/stats/phase2`, `/api/stats/phase3`)
- **Stale refresh interval**: Removed `data.latestTime` from `fetchData` `useCallback` dependency
  — it caused the countdown interval to be torn down and recreated on every data refresh
- **Fake hybrid patterns**: Removed hardcoded "Astro Islands / RSC / Qwik / Streaming SSR"
  pattern list and hardcoded "Growing adoption" trend from Hybrid Insights card
- **Blank cards on error**: `TechStackTrends` and `SEOInsights` now render a placeholder
  instead of returning `null` when data is unavailable
- **Delete UX**: Replaced `confirm()` / `alert()` dialogs with inline "Delete? Yes / No"
  row UI and an inline failure badge in Recent Analyses
- **Modal stale state**: Detail modal now closes automatically when its record is deleted
- **Type safety**: Exported `DashboardData` interface; replaced `data as any` with explicit cast

### Changed
- **`/api/stats?type=all`**: Now returns Phase 2 (tech stack, SEO) and Phase 3 (hydration,
  navigation) data alongside Phase 1 — single endpoint covers everything the dashboard needs
- **CWV thresholds**: Extracted to `lib/cwv-thresholds.ts` as single source of truth;
  `core-web-vitals-comparison.tsx` now imports constants instead of hardcoding numbers
- **Footer version**: Bumped to v1.3.0

## [1.2.0] - 2026-01-28

### Added - Phase 2 & 3 Analytics
- **Core Web Vitals**: LCP, CLS, FID, TTFB, TTI tracking and analytics
- **Page Type Detection**: E-commerce, blog, docs, app, homepage classification
- **Device Analytics**: Mobile/tablet/desktop and browser tracking
- **Tech Stack Detection**: CSS frameworks, state management, build tools, hosting
- **SEO & Accessibility**: Meta tags, social tags, alt text coverage, ARIA labels
- **Hydration Analytics**: Framework-specific hydration state tracking
- **Navigation Analytics**: BFCache, SPA transitions, INP precursors

### Changed
- **Infinite Scroll**: Seamlessly browse historical analyses
- **Standardized UI**: Full migration to customized Tremor design system
- **Record Management**: Added ability to delete stale or unwanted analysis records
- Extended database schema with Phase 1-3 fields

## [1.1.0] - 2026-01-27

### Added
- **Content Comparison Analytics**: New dashboard section showing v3.2.0+ metrics
  - Average content ratio (raw HTML / rendered)
  - High ratio count (SSR indicator)
  - Low ratio count (CSR indicator)
  - Hybrid detection count

- **New API Endpoint**: `GET /api/stats?type=contentComparison`
- **Extended Metrics Storage**: Now stores contentRatio, hybridScore, rawHtmlLength, renderedLength

### Changed
- Dashboard interface updated with content comparison card
- API now returns contentComparison stats in `?type=all` response

## [1.0.0] - 2026-01-26

### Added
- **Live Dashboard**: Real-time analytics with auto-refresh
  - Live countdown timer showing seconds until next refresh
  - "Refreshing..." indicator during data fetch
  - Error state display
- **Stats Cards**: Total analyses, SSR/CSR/Hybrid counts, avg confidence
- **Charts**:
  - Render Type Distribution (SSR/CSR/Hybrid percentages)
  - Top Frameworks Detected (bar chart)
  - Analyses Over Time (area chart)
- **Top Domains**: Most analyzed domains with render type badges
- **Recent Analyses**: Table with time, domain, type, confidence, frameworks
- **Last Analysis**: Shows time since last analysis received (e.g., "5m 30s ago")
- **API Endpoints**:
  - `POST /api/analyze` - Receive telemetry from extension
  - `GET /api/stats` - Aggregated statistics
- **Vercel Analytics**: Visitor tracking integration

### Technical
- Next.js 14 with App Router
- Vercel Postgres (Neon) database
- Tremor UI components for charts
- No-cache headers for fresh data
- CORS support for extension requests

---

## Version History

- **v1.2.0**: Phase 2 & 3 analytics (Core Web Vitals, Tech Stack, SEO, Hydration)
- **v1.1.0**: Content comparison analytics
- **v1.0.0**: Initial release with live dashboard, charts, and API
