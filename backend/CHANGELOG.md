# Changelog - Analytics Dashboard

All notable changes to the SSR/CSR Analytics Dashboard will be documented in this file.

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

- **v1.0.0**: Initial release with live dashboard, charts, and API
