# Firefox Add-ons (AMO) Listing

Source of truth for the addons.mozilla.org listing. Update this file first,
then copy into the AMO Developer Hub when submitting/updating the add-on.

Last synced to AMO: NOT YET — draft of 2026-07-15 (first Firefox submission, v3.10.0).

AMO fields differ from the Chrome Web Store, so this is kept separate from
`store-listing.md`:
- **Summary** is capped at **250 characters** (Chrome's short summary is 132).
- AMO has **no promo tiles** (no small-tile / marquee / large-promo slots) —
  only the icon and screenshots appear in the listing.
- AMO requires an explicit **data-collection disclosure**; it's declared in the
  generated manifest (`browser_specific_settings.gecko.data_collection_permissions`,
  see `scripts/build-firefox.js`) and restated in the Privacy section below.

## Name

CSR vs SSR Detector

## Summary (max 250 characters)

One click shows how any page renders — SSR, CSR or hybrid — plus the framework, tech stack and Core Web Vitals behind it. Compares the raw HTML your server sends against the rendered DOM, so you see exactly what crawlers get.

## Full description

Does Google see your content — or an empty div waiting for JavaScript?

Click the icon and find out in seconds. CSR vs SSR Detector compares the raw HTML your server sends against what the browser actually renders, then tells you how the page is built: Server-Side Rendered, Client-Side Rendered, or a hybrid (islands, partial hydration).

🔍 WHO IT'S FOR
• SEO specialists — verify that crawlers get real content in the initial HTML, before it costs you rankings
• Developers — confirm your SSR/hydration setup actually works in production, or peek under the hood of any site
• Web architects — gather rendering-strategy evidence across competitors and inspirations

⚡ WHAT YOU GET IN ONE CLICK
• Rendering verdict with a confidence score and the indicators behind it — no black box
• Framework detection: Next.js, Nuxt, React, Vue, Angular, Gatsby, SvelteKit, Astro, WordPress and more
• Tech stack: CSS framework, state management, build tool, hosting (Tailwind, Redux, Vite, Vercel…)
• Core Web Vitals: LCP, CLS, TTFB measured on the live page
• SEO & accessibility spot-check: meta tags, Open Graph, structured data, alt-text coverage
• SSR/CSR/MIX badge right on the toolbar icon
• History of your recent analyses, exportable to JSON, CSV or Markdown

🔬 HOW IT WORKS
The core method is direct evidence, not guesswork: the extension fetches the page's raw HTML and diffs it against the rendered DOM. Framework hydration markers, serialized state and timing signals refine the verdict — 15+ indicators combined into a weighted score you can inspect yourself.

🔒 PRIVACY
Analysis runs locally in your browser. The extension optionally shares anonymous, aggregate statistics (rendering type, framework — never full URLs, only the site's origin) to power a public dashboard of rendering trends. One toggle in settings turns this off completely.

📖 Open source (MIT) — read the code, open an issue, or star it: github.com/dzienisz/chrome-ssr-csr

## Data collection disclosure (AMO consent screen)

Declared in the manifest and surfaced to users at install:
- **Required — Website activity**: the origin (domain) of pages you analyze,
  the detected rendering type and framework, sent to the project's dashboard.
  This is the opt-out telemetry (`shareData`, on by default; disable it in the
  extension's settings and nothing is sent).
- **Optional — Technical and interaction data**: aggregate Core Web Vitals and
  tech-stack signals that accompany an analysis when sharing is enabled.

Never collected: full URLs, page content, personal data, or browsing history.
Matches `privacy-policy.md` — keep the two consistent.

## Submission form answers (AMO Developer Hub)

Fill-in-ready values for the "Describe Add-on" step of the submission flow.

- **Categories (max 3):** Web Developer Tools — *only this one*. Nothing else on
  the list fits (Search Tools = search-engine add-ons, not SEO auditing); don't
  pad with loosely-related categories.
- **Support email:** kamil.dzieniszewski@gmail.com
- **Support website:** https://github.com/dzienisz/chrome-ssr-csr/issues
- **License:** MIT (matches `LICENSE` and `package.json`).
- **Has its own privacy policy:** Yes — required, the add-on collects opt-out
  telemetry. Use the URL, or paste the full text of `privacy-policy.md`:
  https://github.com/dzienisz/chrome-ssr-csr/blob/main/extension/privacy-policy.md

### Notes for reviewers (paste in English)

```
Source code (MIT): https://github.com/dzienisz/chrome-ssr-csr

This package is built from source. Two kinds of files are generated:

1. manifest.json — generated for Firefox from the canonical Chrome
   manifest by scripts/build-firefox.js (adds
   browser_specific_settings.gecko and converts
   background.service_worker → background.scripts).

2. src/analyzer-bundle.js and src/telemetry-bundle.js — NON-minified
   concatenations of the readable modules under src/core, src/detectors
   and src/collectors, produced by scripts/build-bundle.js. Every source
   module is ALSO included in this package, so the bundles can be compared
   line-for-line against their sources.

Build steps (Node.js 24; no network access needed beyond `npm install`,
no build-time secrets or environment variables):

  git clone https://github.com/dzienisz/chrome-ssr-csr
  cd chrome-ssr-csr/extension
  npm install
  npm run build            # regenerates src/analyzer-bundle.js + telemetry-bundle.js
  npm run build:firefox    # writes dist/firefox/ — the exact reviewed package

No minifiers or transpilers are used; the "build" is plain file
concatenation plus a JSON manifest transform, both dependency-free Node
scripts. Validated with: npx web-ext lint --source-dir dist/firefox (0 errors).

Telemetry is opt-out (shareData, on by default; a single settings toggle
disables it) and disclosed via data_collection_permissions in the manifest.
Only the site's origin + detected rendering type/framework are sent — never
full URLs, page content, or personal data. Privacy policy:
https://github.com/dzienisz/chrome-ssr-csr/blob/main/extension/privacy-policy.md
```

**Before packaging:** the committed `src/*-bundle.js` must equal `npm run build`
output — run `npm run build` after editing any `src/` module, or the reviewer
sees source/bundle drift.

## Add-on compatibility

- Firefox for Desktop **128.0+** (the `world: "MAIN"` content script the probe
  relies on landed in Firefox 128).
- Also runs on Firefox for Android 128+, though the popup UI is tuned for desktop.

## Screenshots

Reuse the browser-neutral popup screenshots from `promo-images/` (they crop the
extension popup, not the browser frame, so they're valid for Firefox):
- `screenshot-1-verdict-1280x800.png` — SSR verdict with evidence
- `screenshot-2-hybrid-1280x800.png` — Hybrid/MIX verdict
- `screenshot-3-learn-1280x800.png` — built-in SSR/CSR explainer

Firefox-specific promo art (for the GitHub release / social, not required by AMO):
- `firefox-hero-1400x560.png` — "Now on Firefox" hero
- `firefox-tile-440x280.png` — compact social tile

## Notes for future edits

- Localized summaries/descriptions already exist in `store-listings.md` (8
  languages). AMO supports per-locale listings too — reuse that copy; just trim
  each Summary to AMO's 250-char limit if needed.
- Never claim "no data collection" — telemetry is opt-out, not absent. The AMO
  reviewer sees the manifest disclosure, so the listing must match it.
- No unverifiable accuracy percentages ("95% accuracy") — describe the method.
