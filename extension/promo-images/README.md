# Chrome Web Store Marketing Assets

All assets are generated from HTML/CSS sources in `src/` — edit the source,
re-run the build, get pixel-exact PNGs. No image editor required.

```bash
./build.sh          # promo tiles + store screenshots
./build.sh icons    # also regenerate ../icon16/48/128.png from src/icon.html
```

Requires Google Chrome (used headless for rendering).

## Generated assets

| File | Size | Store slot |
|------|------|-----------|
| `small-tile-440x280.png` | 440×280 | Small promo tile (required) |
| `large-promo-920x680.png` | 920×680 | Large promo tile |
| `marquee-1400x560.png` | 1400×560 | Marquee (featured placement) |
| `screenshot-1-verdict-1280x800.png` | 1280×800 | Screenshot 1 — SSR verdict on nextjs.org |
| `screenshot-2-hybrid-1280x800.png` | 1280×800 | Screenshot 2 — Hybrid/MIX verdict on google.com |
| `screenshot-3-learn-1280x800.png` | 1280×800 | Screenshot 3 — built-in SSR/CSR explainer |

## Sources (`src/`)

- `tile-shared.css` — design system: dark developer aesthetic, verdict palette
  (SSR emerald / CSR rose / MIX amber), dot-grid texture, mock verdict card.
- `small-tile.html`, `large-promo.html`, `marquee.html` — the three tiles.
- `screenshot-frame.css` + `screenshot-*.html` — store screenshots. Each frame
  crops the popup out of a full-browser capture in `raw/` via CSS variables
  (`--x1/--y1/--x2/--y2` = popup bounding box in the 4K capture, `--s` = scale).
- `icon.html` — the extension icon as SVG: split page, rose outline (CSR:
  empty until JS runs) vs emerald solid (SSR: content in the HTML).

## Raw captures (`raw/`)

**Local inputs only — gitignored, not in the repo** (throwaway 4K binaries that
get replaced after every popup UI change would bloat git history permanently).
The committed `screenshot-*-1280x800.png` outputs are the durable artifacts.

To (re)generate screenshots: take full-browser 4K screenshots (3840×2160,
retina 1920×1080) with the popup open, anchored top-right, and save them as:

- `raw/nextjs-ssr.png` — nextjs.org with a confident SSR verdict
- `raw/google-mix.png` — google.com with the Hybrid/MIX verdict
- `raw/nextjs-preanalysis.png` — popup before analysis (built-in explainer visible)

Then re-run `./build.sh`. If the popup moved, adjust the `--x1/--y1/--x2/--y2`
variables in the matching `src/screenshot-*.html`.

## Listing text

The store listing copy lives in `../store-listing.md` — keep it in sync with
what's actually uploaded to the Developer Dashboard.
