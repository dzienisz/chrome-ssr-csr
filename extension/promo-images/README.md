# Marketing Assets (Chrome Web Store + Firefox / AMO)

All assets are generated from HTML/CSS sources in `src/` — edit the source,
re-run the build, get pixel-exact PNGs. No image editor required.

```bash
cd ..                          # extension/
npm run preview -- --promo     # capture the popup into promo-images/raw/
cd promo-images
./build.sh                     # promo tiles + store screenshots
./build.sh icons               # also regenerate ../icon16/48/128.png
```

Requires Google Chrome (used headless for rendering); set `CHROME=` to point at
another binary, e.g. Playwright's Chromium.

The three store screenshots frame a real popup capture. Those captures used to
be hand-cropped out of a 4K browser screenshot with four pixel offsets per
file, which went stale the moment the popup layout changed. `npm run preview
-- --promo` now renders the shipping popup against a real analysis result, at
exactly the size the frame expects — so the marketing art cannot drift from the
product.

## Generated assets

| File | Size | Store slot |
|------|------|-----------|
| `small-tile-440x280.png` | 440×280 | Small promo tile (required) |
| `large-promo-920x680.png` | 920×680 | Large promo tile |
| `marquee-1400x560.png` | 1400×560 | Marquee (featured placement) |
| `screenshot-1-verdict-1280x800.png` | 1280×800 | Screenshot 1 — verdict and evidence |
| `screenshot-2-hybrid-1280x800.png` | 1280×800 | Screenshot 2 — delivery: where the HTML was produced |
| `screenshot-3-learn-1280x800.png` | 1280×800 | Screenshot 3 — regions: what JavaScript built |
| `firefox-hero-1400x560.png` | 1400×560 | Firefox "now on Firefox" hero (GitHub release / social) |
| `firefox-tile-440x280.png` | 440×280 | Firefox compact social tile |
| `social-landscape-1600x900.png` | 1600×900 | Social card — X/LinkedIn/Mastodon landscape |
| `social-square-1080x1080.png` | 1080×1080 | Social card — feed square (Instagram/LinkedIn) |
| `social-diff-1600x900.png` | 1600×900 | Social card — raw-vs-rendered diff explainer |

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
  is a headline plus a 400×640 window holding one popup capture from `raw/`,
  shown at its natural size. No crop offsets: the capture is already the right
  shape (see below).
- `icon.html` — the extension icon as SVG: split page, rose outline (CSR:
  empty until JS runs) vs emerald solid (SSR: content in the HTML).

## Raw captures (`raw/`)

**Local inputs only — gitignored, not in the repo.** They are reproducible in
one command, so committing them would only add churn; the
`screenshot-*-1280x800.png` outputs are the durable artifacts.

Regenerate them from the shipping popup:

```bash
cd ..                        # extension/
npm run preview -- --promo
```

That renders the real popup against a real analysis of the offline fixtures and
writes exactly the three files the frames expect:

| File | Fixture | Tab |
|------|---------|-----|
| `raw/popup-verdict.png` | `ssr-next-edge` | Overview |
| `raw/popup-delivery.png` | `isr-prerender` | Delivery |
| `raw/popup-regions.png` | `csr-spa` | Regions |

Then re-run `./build.sh`. Nothing needs adjusting when the popup layout
changes: the capture is taken at the frame's own 400×640 size, and the frame
fades the bottom edge where the popup runs past it.

To feature a different fixture or tab, edit `PROMO_SHOTS` in
`../scripts/ui-preview.mjs`.

## Listing text

The store listing copy lives in `../store-listing.md` — keep it in sync with
what's actually uploaded to the Developer Dashboard.
