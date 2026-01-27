# Recent Changes Summary - v3.2.1 & Backend v1.1.0

**Date:** January 27, 2026  
**Last Commit:** `3a471ba` - feat: Add framework detectors, hybrid detection, UI improvements, and backend metrics

---

## 📊 Backend Dashboard Updates (v1.1.0)

### ✅ What Was Added

#### 1. **Content Comparison Analytics Section**
- New dashboard card displaying v3.2.0+ metrics
- Shows visual analytics for content ratio analysis
- Includes 4 key metrics:
  - **Average Content Ratio**: Raw HTML / Rendered content percentage
  - **High Ratio Count**: SSR indicator (>70% content in HTML)
  - **Low Ratio Count**: CSR indicator (<20% content in HTML)
  - **Hybrid Detected Count**: Islands/partial hydration detection

#### 2. **New Database Function**
- `getContentComparisonStats()` in `/backend/lib/db.ts`
- Queries new metrics: `contentRatio`, `hybridScore`, `rawHtmlLength`, `renderedLength`
- Returns aggregated statistics for content comparison analysis

#### 3. **Extended API Endpoint**
- New endpoint: `GET /api/stats?type=contentComparison`
- Updated `?type=all` to include `contentComparison` data
- Maintains backward compatibility

#### 4. **Enhanced Data Model**
- Extended `AnalysisRecord` interface with new performance metrics:
  ```typescript
  performance_metrics: {
    domReady?: number;
    fcp?: number;
    contentRatio?: number;      // NEW
    rawHtmlLength?: number;     // NEW
    renderedLength?: number;    // NEW
    hybridScore?: number;       // NEW
  }
  ```

### 📝 Files Modified (Backend)
- ✅ `backend/CHANGELOG.md` - Added v1.1.0 entry
- ✅ `backend/app/api/analyze/route.ts` - Store new metrics
- ✅ `backend/app/api/stats/route.ts` - Added contentComparison endpoint
- ✅ `backend/app/dashboard/page.tsx` - Fetch contentComparison data
- ✅ `backend/components/dashboard/live-dashboard.tsx` - Display new analytics section
- ✅ `backend/lib/db.ts` - Added getContentComparisonStats function

---

## 🔧 Extension Updates (v3.2.1)

### ✅ What Was Added

#### 1. **15+ New Framework/Platform Detectors**
- Angular, Vue, Shopify, WordPress, and more
- Better framework detection accuracy

#### 2. **Hybrid/Islands Architecture Detection**
- Astro, React Server Components (RSC), Qwik
- Partial hydration detection
- Hybrid score calculation

#### 3. **Visual Content Comparison Indicator**
- Raw vs rendered content ratio bar
- Visual representation in extension UI
- Helps users understand SSR/CSR balance

#### 4. **Enhanced Classification**
- "Hybrid/Islands Architecture" classification
- More accurate detection algorithm
- Better confidence scoring

### 📝 Files Modified (Extension)
- ✅ `extension/CHANGELOG.md` - Added v3.2.1 entry
- ✅ `extension/manifest.json` - Version bump to 3.2.1
- ✅ `extension/src/analyzer-bundle.js` - Framework detectors
- ✅ `extension/src/core/analyzer.js` - Enhanced analysis
- ✅ `extension/src/core/config.js` - New framework configs
- ✅ `extension/src/core/scoring.js` - Improved scoring
- ✅ `extension/src/detectors/hybrid-detector.js` - NEW FILE
- ✅ `extension/src/telemetry.js` - Send new metrics
- ✅ `extension/ui/components/results-renderer.js` - Display ratio bar

---

## 🔄 Today's Update (January 27, 2026 - 16:43)

### ✅ Version Number Fix
**File:** `backend/components/dashboard/live-dashboard.tsx`

**Change:** Updated dashboard version display from `v1.0.0` to `v1.1.0`

**Reason:** The footer was showing outdated version number. Updated to match CHANGELOG which documents the v1.1.0 release with content comparison analytics features.

**Line Changed:** Line 251
```diff
- Dashboard v1.0.0 •
+ Dashboard v1.1.0 •
```

---

## 📈 Impact Summary

### Backend Dashboard
- ✅ Now displays comprehensive content comparison analytics
- ✅ Shows hybrid/islands architecture detection stats
- ✅ Provides insights into SSR vs CSR distribution
- ✅ Version number correctly reflects current feature set

### Extension
- ✅ Better framework detection (15+ new detectors)
- ✅ Hybrid architecture support
- ✅ Visual content ratio indicator
- ✅ More accurate classification

### Data Flow
```
Extension (v3.2.1)
    ↓ (sends telemetry with new metrics)
Backend API (/api/analyze)
    ↓ (stores in database)
Dashboard (v1.1.0)
    ↓ (displays analytics)
Content Comparison Section
```

---

## 🚀 Next Steps (Recommendations)

1. **Test the Dashboard**
   - Verify content comparison section displays correctly
   - Ensure data is being collected from v3.2.1 extension users
   - Check that version number displays as v1.1.0

2. **Monitor Metrics**
   - Watch for incoming data with new metrics
   - Verify hybrid detection is working
   - Check content ratio calculations

3. **Documentation**
   - Consider adding screenshots to README
   - Document the new metrics in EXTENSION_INTEGRATION.md
   - Update deployment docs if needed

4. **Potential Enhancements**
   - Add filtering by framework in dashboard
   - Create trends over time for content ratio
   - Add export functionality for analytics data

---

## 📦 Commit Suggestion

```bash
git add backend/components/dashboard/live-dashboard.tsx
git commit -m "fix(dashboard): Update version display to v1.1.0

- Updated footer version from v1.0.0 to v1.1.0
- Reflects current feature set with content comparison analytics
- Aligns with CHANGELOG.md v1.1.0 release"
```

---

## ✅ Status: Ready for Deployment

All changes are backward compatible and ready to deploy. The dashboard will gracefully handle both old data (without new metrics) and new data (with content comparison metrics).
