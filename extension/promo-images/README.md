# Marketing Assets (Chrome Web Store + Firefox / AMO)

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
| `firefox-hero-1400x560.png` | 1400×560 | Firefox "now on Firefox" hero (GitHub release / social) |
| `firefox-tile-440x280.png` | 440×280 | Firefox compact social tile |

**AMO note:** addons.mozilla.org has no promo-tile slots — only the icon and
screenshots show in the listing. The three `screenshot-*-1280x800.png` files are
browser-neutral popup crops, so they double as the Firefox screenshots. The
`firefox-*` images are for the GitHub release and social posts, not required by
AMO. Listing copy lives in `../amo-listing.md`.

## Sources (`src/`)

- `tile-shared.css` — design system: dark developer aesthetic, verdict palette
  (SSR emerald / CSR rose / MIX amber), dot-grid texture, mock verdict card.
- `small-tile.html`, `large-promo.html`, `marquee.html` — the three CWS tiles.
- `firefox-hero.html`, `firefox-tile.html` — Firefox promo art (same design
  system, with a Firefox-orange "Now on Firefox 128+" badge).
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
