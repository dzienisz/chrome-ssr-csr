# CSR vs SSR Detector - Release v3.3.0

**Release Date:** January 27, 2026  
**Type:** Major Feature Release  
**Status:** Ready for Chrome Web Store

---

## 🎉 What's New

### Phase 1: Enhanced Data Collection

This release introduces comprehensive data collection to provide deeper insights into web performance, page types, and user environments.

#### **Core Web Vitals Collection** ⚡
- **LCP (Largest Contentful Paint)**: Measures loading performance
- **CLS (Cumulative Layout Shift)**: Measures visual stability
- **FID (First Input Delay)**: Measures interactivity
- **TTFB (Time to First Byte)**: Measures server response time
- **TTI (Time to Interactive)**: Measures time until page is fully interactive
- **TBT (Total Blocking Time)**: Measures main thread blocking

**Why it matters:** Compare real-world performance between SSR and CSR sites. See which rendering strategy delivers better user experience.

#### **Page Type Detection** 📄
Automatically detects:
- E-commerce sites
- Authentication pages
- Blog/article pages
- Documentation sites
- Web applications
- Homepages

**Why it matters:** Understand which page types benefit most from SSR vs CSR.

#### **Device & Connection Insights** 📱
Collects:
- Device type (mobile, tablet, desktop)
- Browser and engine information
- Connection type (WiFi, 4G, 3G, slow-2G)
- Network quality metrics
- User preferences (dark mode, reduced motion)

**Why it matters:** See how performance varies across devices and connection speeds.

---

## 🔧 Technical Improvements

### Professional Build System
- Automated bundling with `npm run build`
- Modular architecture (13 independent detector modules)
- Proper dependency management
- Build documentation

### Enhanced Architecture
- Async data collection for accuracy
- Privacy-first design (no PII collected)
- Backward compatible (works even if new features fail)
- Comprehensive error handling

---

## 📊 Privacy & Data

### What We Collect:
✅ Performance metrics (anonymous)  
✅ Page type classification  
✅ Device type and browser  
✅ Connection type  
✅ Framework detection  

### What We DON'T Collect:
❌ Full URLs (only domains)  
❌ Personal information  
❌ User input or form data  
❌ Cookies or local storage  
❌ IP addresses  

**All data is anonymized and aggregated for analytics.**

---

## 🆕 New Features Summary

| Feature | Description | Benefit |
|---------|-------------|---------|
| Core Web Vitals | LCP, CLS, FID, TTFB, TTI, TBT | Compare SSR vs CSR performance |
| Page Type Detection | Classify pages automatically | Understand usage patterns |
| Device Detection | Mobile, tablet, desktop | See device-specific performance |
| Connection Info | WiFi, 4G, 3G detection | Understand network impact |
| Analytics Detection | GA, GTM, Mixpanel, etc. | See what tools sites use |
| PWA Detection | Service worker + manifest | Track PWA adoption |
| Build System | Automated bundling | Easier development |

---

## 📈 Version History

### v3.3.0 (Current)
- Phase 1: Enhanced data collection
- Core Web Vitals
- Page type detection
- Device & connection info
- Build system

### v3.2.1
- 15+ new framework detectors
- Hybrid/islands architecture detection
- Visual content comparison
- Hybrid score display

### v3.2.0
- Raw HTML comparison for accurate CSR detection
- CSR pattern detection
- Improved classification algorithm

---

## 🚀 Installation

### For Users:
1. Visit Chrome Web Store
2. Search "CSR vs SSR Detector"
3. Click "Add to Chrome"

### For Developers:
```bash
git clone https://github.com/dzienisz/chrome-ssr-csr.git
cd chrome-ssr-csr/extension
npm install
npm run build
```

Then load unpacked extension in Chrome.

---

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for complete version history.

---

## 🔗 Links

- **GitHub Repository**: https://github.com/dzienisz/chrome-ssr-csr
- **Dashboard**: https://backend-mauve-beta-88.vercel.app
- **Issues**: https://github.com/dzienisz/chrome-ssr-csr/issues

---

## 👨‍💻 Developer Notes

### Building from Source
```bash
npm install
npm run build
```

### File Structure
```
extension/
├── src/
│   ├── core/           # Core analyzer logic
│   ├── detectors/      # Detection modules
│   └── analyzer-bundle.js  # Generated bundle
├── scripts/
│   └── build-bundle.js # Build script
├── manifest.json       # Extension manifest
└── package.json        # Dependencies
```

### Contributing
See [BUILD.md](BUILD.md) for development guidelines.

---

## ⚠️ Known Issues

None at this time.

---

## 🙏 Credits

**Author:** Kamil Dzieniszewski  
**License:** MIT

---

## 📞 Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Check the documentation
- Review the changelog

---

**Thank you for using CSR vs SSR Detector!** 🎉
