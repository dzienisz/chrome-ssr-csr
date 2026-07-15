#!/bin/bash
# Regenerate Chrome Web Store marketing assets from the HTML sources in src/.
# Requires Google Chrome. Run from anywhere:
#   ./build.sh            → promo tiles + store screenshots
#   ./build.sh icons      → ALSO overwrite ../icon16/48/128.png (the extension icon)
set -euo pipefail

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
DIR="$(cd "$(dirname "$0")" && pwd)"

shoot() { # src-name width height out-name
  "$CHROME" --headless --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=1 \
    --window-size="$2,$3" \
    --screenshot="$DIR/$4" \
    "file://$DIR/src/$1.html" 2>/dev/null
  echo "✓ $4"
}

# Promo tiles (Chrome Web Store)
shoot small-tile 440 280 small-tile-440x280.png
shoot large-promo 920 680 large-promo-920x680.png
shoot marquee 1400 560 marquee-1400x560.png

# Firefox (AMO) promo — "now on Firefox" hero + compact social tile
shoot firefox-hero 1400 560 firefox-hero-1400x560.png
shoot firefox-tile 440 280 firefox-tile-440x280.png

# Store screenshots (compose raw popup captures from raw/ — see README)
for n in screenshot-1-verdict screenshot-2-hybrid screenshot-3-learn; do
  shoot "$n" 1280 800 "$n-1280x800.png"
done

# Extension icon (explicit opt-in: overwrites the shipped icons)
if [ "${1:-}" = "icons" ]; then
  TMP="$(mktemp -d)"
  # Render large, then downscale — headless Chrome misbehaves below ~200px windows
  "$CHROME" --headless --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=1 --default-background-color=00000000 \
    --window-size=512,512 --screenshot="$TMP/icon512.png" \
    "file://$DIR/src/icon.html" 2>/dev/null
  for s in 128 48 16; do
    cp "$TMP/icon512.png" "$DIR/../icon$s.png"
    sips -z $s $s "$DIR/../icon$s.png" >/dev/null
    echo "✓ ../icon$s.png"
  done
  rm -rf "$TMP"
  echo "→ icons replaced; re-run ./build.sh so the tiles pick up the new icon128"
fi
