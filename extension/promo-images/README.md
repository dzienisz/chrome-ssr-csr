# Promotional Images for Chrome Web Store

This folder contains promotional images for the Chrome Web Store listing.

## Files

### Required Images

1. **small-tile-440x280.png** (21KB)
   - Size: 440x280px
   - Usage: Small promotional tile in Chrome Web Store
   - Required: Yes

2. **large-promo-920x680.png** (70KB)
   - Size: 920x680px
   - Usage: Large promotional tile in Chrome Web Store
   - Required: Recommended

3. **marquee-1400x560.png** (80KB)
   - Size: 1400x560px
   - Usage: Marquee banner (featured placement)
   - Required: No (optional, for featured listings)

## Screenshots Needed

Chrome Web Store also requires **screenshots** of your extension in action. You should capture:

### Screenshot 1: Main Analysis View (Required)
- Navigate to a website (e.g., nextjs.org)
- Open the extension popup
- Click "Analyze Page"
- Capture the results showing:
  - Render type
  - Confidence score
  - Indicators
  - Framework detection (if available)
  - Performance metrics

**Recommended size:** 1280x800px or 640x400px

### Screenshot 2: History Feature (Recommended)
- Click "View History" button
- Show 3-5 history entries
- Demonstrates the history tracking feature

**Recommended size:** 1280x800px or 640x400px

### Screenshot 3: Framework Detection (Optional)
- Show analysis with multiple frameworks detected
- Example: react.dev showing Next.js + React detection

**Recommended size:** 1280x800px or 640x400px

## How to Take Screenshots

### Mac:
```bash
# Full screen
Cmd + Shift + 3

# Selected area
Cmd + Shift + 4

# Window
Cmd + Shift + 4, then press Space, then click window
```

### Chrome DevTools Method:
1. Open extension popup
2. Right-click → Inspect
3. Toggle device toolbar (Cmd+Shift+M)
4. Set dimensions to 1280x800
5. Click "..." → Capture screenshot

## Design Notes

All promotional images use:
- **Primary Blue**: #2563eb (blue-600)
- **Light Blue**: #93c5fd (blue-300)
- **White Text**: #ffffff
- **Rounded Corners**: 15-20px
- **Font**: Arial/Arial-Bold

## Upload Instructions

When uploading to Chrome Web Store Developer Dashboard:

1. Go to "Store Listing" section
2. Scroll to "Promotional Images"
3. Upload images:
   - Small tile (required)
   - Large promotional tile (recommended)
   - Marquee (optional)
4. Scroll to "Screenshots" section
5. Upload 1-5 screenshots showing extension functionality

## Tips for Best Results

- ✅ Use high-quality screenshots (1280x800 or larger)
- ✅ Show actual extension functionality
- ✅ Highlight key features in different screenshots
- ✅ Keep UI clean and uncluttered
- ✅ Use real examples from popular websites
- ✅ Ensure text is readable at smaller sizes

## Need to Regenerate?

To regenerate these images, run:

```bash
# Small tile
magick -size 440x280 xc:none \
  -fill "#2563eb" -draw "roundrectangle 20,20 420,260 15,15" \
  -fill white -pointsize 48 -font "Arial-Bold" -gravity center -annotate +0-40 "CSR vs SSR" \
  -fill white -pointsize 32 -font "Arial" -annotate +0+20 "Detector" \
  -fill "#93c5fd" -pointsize 18 -annotate +0+60 "Instant Rendering Analysis" \
  small-tile-440x280.png

# Large promo
magick -size 920x680 xc:none \
  -fill "#2563eb" -draw "roundrectangle 40,40 880,640 20,20" \
  -fill white -pointsize 72 -font "Arial-Bold" -gravity center -annotate +0-120 "CSR vs SSR Detector" \
  -fill "#93c5fd" -pointsize 32 -font "Arial" -annotate +0-40 "Identify rendering strategies instantly" \
  -fill white -pointsize 24 -annotate -200+40 "✓ Next.js, React, Nuxt" \
  -fill white -pointsize 24 -annotate -200+80 "✓ Performance Metrics" \
  -fill white -pointsize 24 -annotate -200+120 "✓ 95% Accuracy" \
  -fill white -pointsize 24 -annotate +200+40 "✓ Privacy-First" \
  -fill white -pointsize 24 -annotate +200+80 "✓ History Tracking" \
  -fill white -pointsize 24 -annotate +200+120 "✓ Open Source" \
  large-promo-920x680.png

# Marquee
magick -size 1400x560 xc:none \
  -fill "#2563eb" -draw "roundrectangle 40,40 1360,520 20,20" \
  -fill white -pointsize 96 -font "Arial-Bold" -gravity west -annotate +120+0 "CSR vs SSR Detector" \
  -fill "#93c5fd" -pointsize 36 -font "Arial" -gravity east -annotate +120-50 "Instant Rendering Analysis" \
  -fill "#93c5fd" -pointsize 28 -annotate +120+0 "Framework Detection • Performance Metrics" \
  -fill "#93c5fd" -pointsize 28 -annotate +120+50 "Privacy-First • Open Source" \
  marquee-1400x560.png
```
