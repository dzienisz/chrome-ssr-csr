# Testing Checklist for v2.2

This document contains a comprehensive testing checklist before publishing to the Chrome Web Store.

## Pre-Testing Setup

### 1. Load Extension in Developer Mode

1. Open Chrome and navigate to `chrome://extensions`
2. Enable "Developer Mode" (toggle in top-right corner)
3. Click "Remove" on any existing version of CSR vs SSR Detector
4. Click "Load unpacked"
5. Select the `/Users/home/Developer/chrome-ssr-csr` directory
6. Verify extension loads without errors
7. Check that version shows "2.2" in the extension list

### 2. Check Console for Errors

1. Right-click the extension and select "Inspect popup"
2. Check console for any errors on popup load
3. Right-click extension icon → "Inspect service worker"
4. Check background service worker console for errors

---

## Core Functionality Tests

### Test 1: Basic Analysis

**Test Sites:**
- ✅ Next.js (SSR): https://nextjs.org
- ✅ React SPA (CSR): https://reactjs.org
- ✅ Static site: https://jekyllrb.com
- ✅ Traditional site: https://example.com

**Steps:**
1. Navigate to each test site
2. Click extension icon
3. Click "Analyze Page" button
4. Verify results display within 2-3 seconds
5. Check that confidence score appears
6. Verify indicators are listed
7. Check that results make sense for the site type

**Expected Results:**
- Next.js: "Server-Side Rendered (SSR)" or "Likely SSR with Hydration"
- React SPA: "Client-Side Rendered (CSR)" or "Likely CSR/SPA"
- Static site: "Server-Side Rendered (SSR)"
- Traditional: "Server-Side Rendered (SSR)"

---

### Test 2: History Feature (Bug Fix Verification)

**Critical Test** - This bug was fixed in v2.2

**Steps:**
1. Open any website (e.g., https://nextjs.org)
2. Click extension icon and analyze
3. Note the page title shown in the browser tab
4. Click "View History" button
5. Verify the history entry shows:
   - ✅ Correct page title (NOT the URL)
   - ✅ Correct timestamp
   - ✅ Correct rendering type
   - ✅ Confidence percentage

**Expected Result:**
- History should display "Next.js by Vercel" or similar page title
- NOT "https://nextjs.org"

**Repeat for multiple sites:**
- Test 3-5 different websites
- Verify all titles appear correctly
- Check history limit (max 10 entries)

---

### Test 3: React 18+ Detection (Enhancement Verification)

**Modern React Sites to Test:**

1. **React 18+ SPA:**
   - Create React App sites (if you have one locally)
   - Check for React detection in results
   - Verify "Detected Frameworks" shows "react"

2. **React with SSR:**
   - https://nextjs.org (uses React 18+)
   - Should detect both Next.js AND React
   - Check "Detected Frameworks" section

**Expected Results:**
- React should be detected even without `[data-reactroot]` attribute
- Both framework markers should appear in results
- Detection should work on modern React 18+ apps

---

### Test 4: Error Handling (New Feature)

**Test on Restricted Pages:**

1. **Chrome internal pages:**
   - Try on `chrome://extensions`
   - Should show graceful error or "Analysis Error"
   - Extension should NOT crash

2. **File URLs:**
   - Open a local HTML file
   - Try to analyze
   - Should handle gracefully

3. **Very simple pages:**
   - Navigate to `about:blank` or blank page
   - Analyze
   - Should not crash, should show some result

**Expected Results:**
- No extension crashes
- Error messages are user-friendly
- Console may show error but extension continues working

---

### Test 5: UI/UX Verification

**Visual Checks:**

1. **Popup Display:**
   - ✅ Logo appears correctly
   - ✅ "Analyze Page" button is styled properly
   - ✅ Version shows "v2.2" in footer
   - ✅ GitHub link works
   - ✅ Width is 350px (not too wide/narrow)

2. **Results Display:**
   - ✅ Render type is color-coded (green for SSR, red for CSR, orange for hybrid)
   - ✅ Confidence bar displays correctly
   - ✅ Indicators are formatted as pills/badges
   - ✅ Framework names appear in uppercase
   - ✅ Performance metrics show (if available)

3. **History Display:**
   - ✅ "View History" button appears after first analysis
   - ✅ Button changes to "Hide History" when clicked
   - ✅ History entries are formatted nicely
   - ✅ Timestamps are readable
   - ✅ "No analysis history yet" message when empty

4. **Loading State:**
   - ✅ Spinner appears while analyzing
   - ✅ "Analyzing page..." text shows
   - ✅ Animation is smooth

5. **Help Section:**
   - ✅ Help text appears at bottom
   - ✅ Explains SSR vs CSR difference
   - ✅ Formatting is clean

---

### Test 6: Framework Detection

Test on sites using various frameworks:

**SSR Frameworks:**
- ✅ Next.js: https://nextjs.org
- ✅ Nuxt: https://nuxt.com
- ✅ Remix: https://remix.run
- ✅ SvelteKit: https://kit.svelte.dev
- ✅ Gatsby: https://www.gatsbyjs.com

**Static Site Generators:**
- ✅ Jekyll: https://jekyllrb.com
- ✅ Hugo: https://gohugo.io
- ✅ 11ty: https://www.11ty.dev

**SPA Frameworks:**
- ✅ React: https://react.dev
- ✅ Vue: https://vuejs.org
- ✅ Angular: https://angular.io

**For Each Site:**
1. Analyze the page
2. Check if framework is detected
3. Verify it appears in "Detected Frameworks" section
4. Ensure classification makes sense

---

### Test 7: Performance Metrics

**Sites with Good Performance:**
- Static sites (should show fast DOM ready times)
- Server-rendered sites (fast FCP)

**Sites with Slower Performance:**
- Heavy React SPAs (slower DOM ready)
- JavaScript-heavy sites

**Verify:**
- ✅ DOM Ready time displays in milliseconds
- ✅ FCP (First Contentful Paint) appears when available
- ✅ Performance section only shows when data is available
- ✅ Fast times contribute to SSR score
- ✅ Slow times contribute to CSR score

---

### Test 8: Notifications

**Background Script Notifications:**

1. Click extension icon (without opening popup)
2. A notification should appear showing:
   - Render type
   - Confidence percentage
   - First 2 indicators

**Verify:**
- ✅ Notification appears
- ✅ Text is readable
- ✅ Icon displays correctly
- ✅ Notification auto-dismisses after a few seconds

---

### Test 9: Storage & Persistence

**Test Data Persistence:**

1. Analyze 3-5 different websites
2. Close Chrome completely
3. Reopen Chrome
4. Open extension popup
5. Click "View History"

**Verify:**
- ✅ History persists after browser restart
- ✅ All entries are still there
- ✅ Data is accurate

**Test History Limit:**

1. Analyze 12+ different websites
2. Check history
3. Verify only last 10 entries are kept
4. Oldest entries should be removed automatically

---

## Edge Cases & Stress Tests

### Test 10: Edge Cases

**Complex Sites:**
- ✅ Sites with both SSR and CSR (hybrid)
- ✅ Sites with lazy-loaded content
- ✅ Sites with iframes
- ✅ Single-page apps with router

**Unusual Sites:**
- ✅ Sites with minimal HTML
- ✅ Sites with no JavaScript
- ✅ Sites with heavy JavaScript
- ✅ Progressive Web Apps (PWAs)

**Expected:**
- Extension should handle all cases gracefully
- Results may vary but should always complete
- No crashes or hangs

---

### Test 11: Rapid-Fire Testing

**Stress Test:**
1. Click "Analyze Page" multiple times rapidly
2. Switch tabs quickly while analyzing
3. Close popup during analysis
4. Reopen and analyze again

**Expected:**
- No crashes
- No duplicate entries in history
- Results display correctly even after interruption

---

## Cross-Browser Compatibility

### Test 12: Chrome Versions

Test on:
- ✅ Latest Chrome stable
- ✅ Chrome Beta (if available)
- ✅ Chromium (if available)

**Note:** This is a Chrome-only extension, but should work on all Chromium-based browsers.

---

## Pre-Publication Checklist

### Test 13: Final Verification

Before publishing to Chrome Web Store:

**Code Quality:**
- ✅ No console errors in normal operation
- ✅ All files are committed to git
- ✅ Version number is 2.2 everywhere:
  - manifest.json
  - popup.html
  - README.md
  - CHANGELOG.md

**Documentation:**
- ✅ README.md is up to date
- ✅ CHANGELOG.md includes v2.2 changes
- ✅ LICENSE file exists
- ✅ privacy-policy.md is accurate

**Assets:**
- ✅ icon.webp displays correctly
- ✅ All referenced files exist
- ✅ No broken links

**Package:**
- ✅ Create ZIP file of extension
- ✅ Test ZIP file by loading it
- ✅ Ensure no unnecessary files in ZIP (no .git, node_modules, etc.)

---

## Test Results Log

Record your test results here:

### Date: ___________

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Basic Analysis | ⬜ Pass / ⬜ Fail | |
| 2 | History Feature | ⬜ Pass / ⬜ Fail | |
| 3 | React 18+ Detection | ⬜ Pass / ⬜ Fail | |
| 4 | Error Handling | ⬜ Pass / ⬜ Fail | |
| 5 | UI/UX | ⬜ Pass / ⬜ Fail | |
| 6 | Framework Detection | ⬜ Pass / ⬜ Fail | |
| 7 | Performance Metrics | ⬜ Pass / ⬜ Fail | |
| 8 | Notifications | ⬜ Pass / ⬜ Fail | |
| 9 | Storage & Persistence | ⬜ Pass / ⬜ Fail | |
| 10 | Edge Cases | ⬜ Pass / ⬜ Fail | |
| 11 | Rapid-Fire Testing | ⬜ Pass / ⬜ Fail | |
| 12 | Chrome Versions | ⬜ Pass / ⬜ Fail | |
| 13 | Final Verification | ⬜ Pass / ⬜ Fail | |

**Overall Result:** ⬜ Ready to Publish / ⬜ Needs Fixes

**Critical Issues Found:**
-

**Minor Issues Found:**
-

**Notes:**
-

---

## Publishing Steps

Once all tests pass:

1. Create a clean ZIP package:
   ```bash
   cd /Users/home/Developer/chrome-ssr-csr
   zip -r chrome-ssr-csr-v2.2.zip . -x "*.git*" "*.DS_Store" "node_modules/*" "2.0.zip" "2.1.zip" "TESTING.md"
   ```

2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)

3. Upload new version

4. Update store listing if needed:
   - Screenshots (if changed)
   - Description (if enhanced)
   - Version notes (from CHANGELOG.md)

5. Submit for review

6. Create GitHub release:
   - Tag: v2.2
   - Title: "Version 2.2 - Bug Fixes & Improvements"
   - Description: Copy from CHANGELOG.md

7. Announce update (optional):
   - GitHub release notes
   - Social media
   - Project README

---

## Need Help?

If you encounter any issues during testing:

1. Check browser console for errors
2. Check the specific test section above for expected behavior
3. Document the issue in the Test Results Log
4. Create a GitHub issue if it's a new bug
5. Fix and re-test before publishing

Good luck with testing! 🚀
