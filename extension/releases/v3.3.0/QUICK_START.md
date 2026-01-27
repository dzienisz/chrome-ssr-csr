# Quick Start - Release v3.3.0

## 📦 Package Contents

```
releases/v3.3.0/
├── csr-ssr-detector-v3.3.0.zip    (44 KB) - Extension package
├── RELEASE_NOTES.md                        - What's new
├── STORE_LISTING.md                        - Chrome Web Store content
├── RELEASE_CHECKLIST.md                    - Submission checklist
└── QUICK_START.md                          - This file
```

---

## 🚀 For Users

### Install from Chrome Web Store (Recommended)
1. Visit Chrome Web Store
2. Search "CSR vs SSR Detector"
3. Click "Add to Chrome"
4. Done!

### Install Manually (Developers)
1. Download `csr-ssr-detector-v3.3.0.zip`
2. Unzip the file
3. Open Chrome and go to `chrome://extensions`
4. Enable "Developer mode" (top right)
5. Click "Load unpacked"
6. Select the unzipped folder
7. Done!

---

## 🧪 Testing the Extension

### Quick Test
1. Visit https://nextjs.org (SSR site)
2. Click extension icon
3. Click "Analyze"
4. Should show: "Server-Side Rendered (SSR)"

### Test Core Web Vitals
1. Visit any website
2. Click "Analyze"
3. Open DevTools Console
4. Look for: `[Performance] Core Web Vitals collected:`
5. Should see LCP, CLS, FID values

### Test Page Type Detection
1. Visit Amazon.com
2. Click "Analyze"
3. Check console: `[PageType] Detected: ecommerce`

### Test Device Detection
1. Click "Analyze" on any site
2. Check console: `[Device] Device info collected:`
3. Should see device type, browser, connection

---

## 📤 Submitting to Chrome Web Store

### Prerequisites
- [ ] Google Developer account ($5 one-time fee)
- [ ] Extension tested thoroughly
- [ ] Screenshots prepared (5 required)
- [ ] Promotional images created

### Step-by-Step

1. **Go to Developer Dashboard**
   - Visit: https://chrome.google.com/webstore/devconsole
   - Sign in with Google account

2. **Create New Item**
   - Click "New Item"
   - Upload `csr-ssr-detector-v3.3.0.zip`
   - Click "Upload"

3. **Fill Store Listing**
   - Copy content from `STORE_LISTING.md`
   - Paste into appropriate fields
   - Category: Developer Tools
   - Language: English

4. **Upload Screenshots**
   - Minimum 1, recommended 5
   - Size: 1280x800 or 640x400
   - Show actual functionality

5. **Upload Promotional Images**
   - Small tile: 440x280
   - Large tile: 920x680  
   - Marquee: 1400x560 (optional)

6. **Set URLs**
   - Homepage: https://github.com/dzienisz/chrome-ssr-csr
   - Support: https://github.com/dzienisz/chrome-ssr-csr/issues
   - Privacy: https://github.com/dzienisz/chrome-ssr-csr/blob/main/PRIVACY.md

7. **Justify Permissions**
   - activeTab: Analyze current page
   - scripting: Inject analysis code
   - storage: Save preferences
   - notifications: Alert on completion

8. **Submit for Review**
   - Click "Submit for review"
   - Wait 1-3 days for approval

---

## 📸 Screenshots Needed

### 1. Main Analysis View
- Show SSR detection result
- Display confidence score
- Show detected frameworks
- Include performance metrics

### 2. Performance Metrics
- Core Web Vitals display
- LCP, CLS, FID values
- Pass/fail indicators

### 3. Framework Detection
- Multiple frameworks detected
- Framework list
- Hybrid detection

### 4. Export Options
- JSON/CSV/Markdown buttons
- Export menu visible

### 5. Settings Page
- Dark mode toggle
- Data sharing option
- History limit setting

---

## 🎨 Creating Promotional Images

### Tools
- Figma (recommended)
- Canva
- Photoshop
- GIMP (free)

### Small Tile (440x280)
```
┌─────────────────────────┐
│   [Extension Icon]      │
│                         │
│  CSR vs SSR Detector    │
│  Analyze Website        │
│  Rendering              │
└─────────────────────────┘
```

### Large Tile (920x680)
```
┌───────────────────────────────────┐
│  [Screenshot of Analysis]         │
│                                   │
│  ✓ Rendering Detection            │
│  ✓ Performance Insights           │
│  ✓ Framework Detection            │
│                                   │
│  Free & Open Source               │
└───────────────────────────────────┘
```

### Marquee (1400x560)
```
┌─────────────────────────────────────────────────┐
│  Understand How Websites Are Built              │
│                                                 │
│  [Full Interface Screenshot]                    │
│                                                 │
│  SSR • CSR • Hybrid • Performance • Frameworks  │
└─────────────────────────────────────────────────┘
```

---

## ✅ Pre-Submission Checklist

### Testing
- [ ] Tested on 10+ websites
- [ ] All features working
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Privacy compliant

### Documentation
- [ ] Release notes complete
- [ ] Store listing ready
- [ ] Screenshots prepared
- [ ] Privacy policy accessible

### Package
- [ ] ZIP file created
- [ ] Correct version number
- [ ] All required files included
- [ ] No unnecessary files

---

## 🐛 Common Issues

### Extension Not Loading
- Check manifest.json syntax
- Verify all files present
- Check file permissions

### Analysis Fails
- Check browser console for errors
- Verify bundle is up to date
- Test on different websites

### Telemetry Not Sending
- Check network tab
- Verify backend URL
- Check CORS settings

---

## 📞 Support

**Issues:** https://github.com/dzienisz/chrome-ssr-csr/issues  
**Discussions:** https://github.com/dzienisz/chrome-ssr-csr/discussions  
**Email:** (Add if available)

---

## 🎉 After Approval

1. **Announce Release**
   - GitHub release
   - Social media
   - Developer communities

2. **Monitor**
   - Chrome Web Store reviews
   - GitHub issues
   - Telemetry data

3. **Gather Feedback**
   - User reviews
   - Feature requests
   - Bug reports

4. **Plan Next Version**
   - Backend Phase 1 completion
   - Additional features
   - Performance improvements

---

**Good luck with your release!** 🚀
