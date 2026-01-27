# Release Checklist - v3.3.0

## Pre-Release

### Code Quality
- [x] All new features implemented
- [x] Build system working (`npm run build`)
- [x] No console errors in production
- [x] All detectors functioning correctly
- [x] Telemetry sending data properly
- [ ] Manual testing on 10+ websites
- [ ] Test on different browsers (Chrome, Edge)

### Documentation
- [x] CHANGELOG.md updated
- [x] BUILD.md created
- [x] Release notes written
- [x] Store listing prepared
- [ ] Privacy policy updated
- [ ] README.md updated with v3.3.0 features

### Version Numbers
- [x] manifest.json: 3.3.0
- [x] package.json: 3.3.0
- [x] CHANGELOG.md: 3.3.0 entry
- [x] Telemetry version: 3.3.0

### Build
- [x] Run `npm run build`
- [x] Verify bundle size (50.54 KB)
- [x] Check bundle includes all detectors
- [ ] Test with fresh install
- [ ] Verify no dev dependencies in bundle

---

## Testing

### Functional Testing
- [ ] **SSR Sites**: Test on Next.js, Nuxt, etc.
  - [ ] Correct detection
  - [ ] Core Web Vitals collected
  - [ ] Page type detected
  
- [ ] **CSR Sites**: Test on React SPAs, Vue apps
  - [ ] Correct detection
  - [ ] Performance metrics accurate
  - [ ] Device info collected

- [ ] **Hybrid Sites**: Test on Astro, islands architecture
  - [ ] Hybrid detection working
  - [ ] Hybrid score calculated

### Page Types
- [ ] E-commerce (Shopify, WooCommerce)
- [ ] Blog (WordPress, Medium)
- [ ] Documentation (Docusaurus, GitBook)
- [ ] Web apps (Gmail, Notion)
- [ ] Homepages

### Devices & Connections
- [ ] Desktop Chrome
- [ ] Mobile Chrome (DevTools simulation)
- [ ] Different connection speeds (throttling)

### Edge Cases
- [ ] Restricted pages (chrome://, edge://)
- [ ] CORS errors handled gracefully
- [ ] Slow loading pages
- [ ] Pages with errors
- [ ] Very large pages

---

## Package Preparation

### Files to Include
- [x] manifest.json
- [x] popup.html
- [x] popup.js
- [x] popup.css
- [x] options.html
- [x] options.js
- [x] options.css
- [x] background.js
- [x] src/analyzer-bundle.js
- [x] icon16.png
- [x] icon48.png
- [x] icon128.png
- [ ] README.md (user-facing)
- [ ] LICENSE

### Files to Exclude
- [x] node_modules/
- [x] .git/
- [x] .gitignore
- [x] package.json (not needed in release)
- [x] package-lock.json
- [x] scripts/ (build scripts)
- [x] src/core/ (source files)
- [x] src/detectors/ (source files)
- [x] src/ui/ (source files)
- [x] src/utils/ (source files)
- [x] src/telemetry.js (bundled)
- [x] BUILD.md (dev docs)
- [x] releases/

### Create ZIP
```bash
# From extension directory
zip -r releases/v3.3.0/csr-ssr-detector-v3.3.0.zip \
  manifest.json \
  popup.html popup.js popup.css \
  options.html options.js options.css \
  background.js \
  src/analyzer-bundle.js \
  icon*.png \
  README.md \
  LICENSE \
  -x "*.DS_Store" "*node_modules/*" "*.git/*"
```

---

## Chrome Web Store Submission

### Required Materials
- [ ] Extension ZIP file
- [ ] Store listing description
- [ ] Screenshots (5 required)
  - [ ] Main analysis view
  - [ ] Performance metrics
  - [ ] Framework detection
  - [ ] Export options
  - [ ] Settings page
- [ ] Promotional images
  - [ ] Small tile (440x280)
  - [ ] Large tile (920x680)
  - [ ] Marquee (1400x560)
- [ ] Privacy policy URL
- [ ] Category: Developer Tools
- [ ] Single purpose description

### Submission Steps
1. [ ] Go to Chrome Web Store Developer Dashboard
2. [ ] Create new item or update existing
3. [ ] Upload ZIP file
4. [ ] Fill in store listing
5. [ ] Upload screenshots
6. [ ] Upload promotional images
7. [ ] Set privacy policy URL
8. [ ] Justify permissions
9. [ ] Submit for review

### Review Checklist
- [ ] Single purpose clearly stated
- [ ] Permissions justified
- [ ] Privacy policy accessible
- [ ] No misleading claims
- [ ] Screenshots show actual functionality
- [ ] Description accurate

---

## Post-Submission

### GitHub
- [ ] Create GitHub release v3.3.0
- [ ] Upload ZIP to release
- [ ] Copy release notes to GitHub
- [ ] Tag commit: `git tag v3.3.0`
- [ ] Push tags: `git push --tags`

### Documentation
- [ ] Update main README with v3.3.0 features
- [ ] Add migration guide if needed
- [ ] Update screenshots in README

### Communication
- [ ] Announce on GitHub Discussions
- [ ] Update dashboard with new version info
- [ ] Social media announcement (optional)

### Monitoring
- [ ] Monitor Chrome Web Store reviews
- [ ] Watch for bug reports
- [ ] Check telemetry data flow
- [ ] Verify backend receiving new data

---

## Rollback Plan

If critical issues found:

1. **Immediate:**
   - [ ] Unpublish from Chrome Web Store
   - [ ] Post issue on GitHub

2. **Fix:**
   - [ ] Identify and fix bug
   - [ ] Test thoroughly
   - [ ] Create v3.3.1 patch

3. **Redeploy:**
   - [ ] Follow release checklist again
   - [ ] Submit v3.3.1

---

## Success Metrics

After 1 week, check:
- [ ] Install count increased
- [ ] No critical bugs reported
- [ ] Positive reviews (>4 stars average)
- [ ] Telemetry data flowing correctly
- [ ] Backend receiving Phase 1 data

After 1 month, analyze:
- [ ] User retention
- [ ] Feature usage (Core Web Vitals, page types)
- [ ] Performance impact
- [ ] User feedback themes

---

## Notes

**Version:** 3.3.0  
**Release Date:** January 27, 2026  
**Type:** Major Feature Release  
**Breaking Changes:** None  
**Migration Required:** No  

**Key Features:**
- Core Web Vitals collection
- Page type detection
- Device & connection insights
- Build system

**Known Issues:** None

**Next Version:** 3.4.0 (Backend Phase 1 completion)
