# Release v3.3.1

**Date:** January 27, 2026

## 🐛 Bug Fixes & Improvements

This patch release fixes critical issues found in v3.3.0:

1.  **Critical Telemetry Fix:**
    - Fixed an issue where Phase 1 data (Core Web Vitals, Page Type, Device Info) was being collected but **not sent** to the backend. Database now correctly receives all new data fields.

2.  **Analysis Reliability:**
    - Reduced timeouts for Core Web Vitals collection to prevent "Analysis Failed" errors on slower sites.
    - Added race condition protection to ensure analysis always completes within 1 second.

3.  **UI Fixes:**
    - Fixed a bundling issue where the results renderer was missing, causing analysis to complete but display no results.

## 🚀 Features (from v3.3.0)

All Phase 1 features are now fully functional:
- **Core Web Vitals:** LCP, CLS, FID, TTFB, TTI, TBT
- **Page Type Detection:** E-commerce, Blog, Documentation, App, Homepage
- **Device Information:** Device type, browser details, connection quality
- **Performance Analysis:** Detailed breakdown of rendering metrics

## 📦 Install

**File:** `csr-ssr-detector-v3.3.1.zip`
**Hash:** (SHA256) `[Generated on upload]`

## 👨‍💻 Backend Compatibility

- Requires Backend v1.2.0+ (already deployed)
- Database migration `001_add_phase1_columns.sql` is required (already run on production)
