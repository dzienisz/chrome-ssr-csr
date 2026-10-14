# Microsoft Edge Add-ons Listing

Source of truth for the Microsoft Edge Add-ons listing. Update this file first,
then copy into Partner Center (Microsoft Edge → the extension → Store listings).

Last synced to Edge Add-ons: NOT YET — no Edge listing exists.
Live listing: none yet. After the first approval, add its URL here and in the
READMEs and on the site.

Edge runs the Chrome MV3 package unchanged, so there is no Edge build: upload
the Chrome zip `csr-ssr-detector-vX.Y.Z.zip` from the GitHub Release.

## First submission (manual, once)

The Edge Add-ons API only updates an existing product, so version one goes
through Partner Center by hand:

1. Register for the Microsoft Edge program in Partner Center (free):
   https://partner.microsoft.com/dashboard/microsoftedge/
2. Microsoft Edge → Overview → **Create new extension**, upload the Chrome zip.
3. Availability: Visibility **Public**, Markets **all markets**.
4. Properties: Category **Developer tools**. Website
   https://dzienko.dev/chrome-ssr-csr/, support
   https://github.com/dzienisz/chrome-ssr-csr/issues. Mature content: no.
5. Privacy and Store listings: use the sections below.
6. Submit. Certification takes up to 7 business days.

After approval, enable automated updates:

1. Partner Center → Microsoft Edge → **Publish API** → enable the new
   experience (v1.1) → **Create API credentials**.
2. Add these repository secrets (Settings → Secrets and variables → Actions):
   - `EDGE_CLIENT_ID` — the Client ID shown on the Publish API page
   - `EDGE_API_KEY` — the API key (shown with an expiry date; renew it there)
   - `EDGE_PRODUCT_ID` — the Product ID from the extension overview (also the
     GUID in the Partner Center URL between `microsoftedge/` and `/packages`)
3. From then on, every `v*` tag uploads the Chrome zip and submits it
   (`.github/workflows/release.yml` → `scripts/publish-edge.mjs`). Without the
   secrets the step is skipped with a warning.

## Name and short description

Both come from the package (`_locales/*/messages.json`: `appName`,
`appDesc`) and are read-only in Partner Center. Re-upload the package to
change them.

## Description (per language; English below)

Reuse the Chrome Web Store full description from `store-listing.md`
verbatim, and the translations from `store-listings.md` for the other
locales the package ships (ja, ko, fr, de, es, pt_BR, pl). Partner Center asks
for a description and a logo for **every** locale in `_locales/`.

## Search terms

SSR, CSR, server-side rendering, client-side rendering, hydration, SEO,
JavaScript SEO, rendering, web developer tools, Core Web Vitals

(Not shown to users. Keep it to capabilities, not a list of framework brand
names — the same rule that got 4.0.0 rejected on the Chrome Web Store.)

## Images (`promo-images/`)

- **Extension logo (required, 300×300):** `edge-logo-300x300.png`
- **Small promotional tile (440×280):** `small-tile-440x280.png`
- **Large promotional tile (1400×560):** `marquee-1400x560.png`
- **Screenshots (1280×800, max 6):** `screenshot-1-verdict-1280x800.png`,
  `screenshot-2-hybrid-1280x800.png`, `screenshot-3-learn-1280x800.png`,
  `screenshot-4-evidence-1280x800.png`

Use "Duplicate for all languages" so every locale gets the same images.

## Privacy page

**Single purpose:**

```
Shows how the current web page is rendered (server-side, client-side or hybrid) by comparing the HTML the server sent with the DOM the browser built, and explains the evidence behind the verdict.
```

**Permission justification:**

- `activeTab` — Grants temporary access to the tab the user is analyzing when they open the popup, use the keyboard shortcut or the context-menu entry; the analyzer is injected only into that tab.
- `scripting` — Injects the analyzer bundle into the active tab to read the rendered DOM and re-fetch the page's own HTML for comparison.
- `storage` — Keeps settings (theme, telemetry toggle, history limit) and the local history of recent analyses.
- `notifications` — Shows the verdict when an analysis is started from the context menu or keyboard shortcut without opening the popup (can be turned off in settings).
- `contextMenus` — Adds the "Analyze page rendering" entry to the page context menu.
- Host access (`<all_urls>` content script `src/probe.js`) — A tiny script that runs at document start in every page to record how much text the HTML parser produced before deferred scripts ran (a length and FNV-1a hashes of the title and URL only, never the text). The analysis uses it when the page refuses a second fetch (bot protection). It sends nothing anywhere.
- Optional host permission `https://api.typesafe.ai/*` — Requested only if the user enables the optional "Ask Jev" second opinion and supplies their own TypeSafe API key.

**Remote code:** No, I am not using remote code. (All scripts are in the
package; the bundles are plain concatenations of the readable sources.)

**Data usage:** tick to match `privacy-policy.md`:
- Website content — yes: Ask Jev (off by default) sends the page URL and bounded text excerpts to TypeSafe after an explicit click.
- Web history — yes: the opt-out telemetry sends the origin (never full URLs or paths) of each analyzed page with a timestamp; local history never leaves the device.
- Location — yes: the backend derives a two-letter country code from request metadata, and telemetry includes the timezone.
- Personally identifiable information, health, financial, authentication, personal communications, user activity — no.
- Tick all three certifications (no selling data, no unrelated use, no creditworthiness use).

**Privacy policy URL:**
https://github.com/dzienisz/chrome-ssr-csr/blob/main/extension/privacy-policy.md

## Certification notes (paste in English)

```
Source code (MIT): https://github.com/dzienisz/chrome-ssr-csr

This is the same package published on the Chrome Web Store (extension id fhiopdjeekafnhmfbcfoolhejdgjpkgg). No build step beyond plain file concatenation: src/analyzer-bundle.js and src/telemetry-bundle.js are non-minified concatenations of the modules under src/, which are also included.

To test: open any website (e.g. https://en.wikipedia.org/wiki/Web_browser), click the toolbar icon or press Ctrl+Shift+Y. The popup analyzes the page and shows SSR/CSR/Hybrid with its evidence. DevTools (F12) has a "Rendering" panel with the same report.

Telemetry is opt-out ("Share anonymous data" in settings) and sends only the site's origin with the rendering result, never full URLs or page content. Ask Jev is off by default and needs the user's own TypeSafe API key.
```

## Notes for future edits

- Keep the privacy wording consistent with `privacy-policy.md`,
  `store-listing.md` and `amo-listing.md`.
- Never claim "no data collection" — telemetry is opt-out, not absent.
- No unverifiable accuracy percentages; describe the method.
