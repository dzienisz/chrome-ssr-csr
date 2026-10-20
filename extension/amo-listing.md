# Firefox Add-ons (AMO) Listing

Source of truth for the addons.mozilla.org listing. Update this file first,
then copy into the AMO Developer Hub when submitting/updating the add-on.

Last synced to AMO: 2026-07-16 — v3.10.0 (initial submission, approved).
Pending sync: v4.0.0 copy below (delivery, regions, DevTools panel).
Live listing: https://addons.mozilla.org/firefox/addon/csr-vs-ssr-detector/
(AMO slug: `csr-vs-ssr-detector`.)

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

Real content or an empty shell? Re-fetches a page's server HTML, compares it with the rendered page, and shows SSR, CSR or hybrid, how much of the visible text came from the server, which parts JavaScript built, and the evidence.

## Full description

Real content, or an empty shell?

Many modern web apps answer the first request with an almost empty HTML document, a <div id="root"></div> and a script bundle, and build the page in the browser. You see the finished page. Anything that reads only the server's HTML gets the shell.

CSR vs SSR Detector shows you which one a page sends. It re-fetches the page's server HTML, compares it with what the browser rendered, and tells you how the page is built: Server-Side Rendered, Client-Side Rendered, or a hybrid (islands, partial hydration).

🤖 WHY IT MATTERS
• Search: Googlebot does render JavaScript, but in a later rendering pass after it crawls the HTML. Content that only appears after JavaScript runs can be indexed later, or missed if the scripts fail in the renderer. Google's own JavaScript SEO guide still recommends server-side or pre-rendering, because not all bots can run JavaScript.
• Link previews: many chat and social link unfurlers read the title, description and image from the HTML response and don't run JavaScript.
• AI crawlers: in a 2024 study of crawler traffic by Vercel and MERJ, most of the AI crawlers measured did not execute JavaScript, so they only saw the server HTML.

The extension compares the HTML your server sends to a browser with the rendered page. Some sites serve bots different HTML, so treat the result as a strong hint about what a reader without JavaScript gets, not as a replay of any particular bot.

⚡ WHAT YOU GET
• A verdict (server-rendered, client-rendered or hybrid) with a High, Medium or Low confidence level, a "Why this verdict" walkthrough, and every signal behind it with the points it contributed and what it observed. No black box.
• The share of the visible text that came from the server, and how much JavaScript added
• REGIONS: which parts of the page the server sent and which ones JavaScript filled in, character by character. "#root gained 12,400 characters after the scripts ran" is a very different bug report from "CSR".
• RENDERED WHERE: built in the browser, rendered at build time, served from a CDN cache, or rendered for this request, read from the document's own response headers, along with the CDN, cache state, age and TTFB
• Framework detection: which rendering framework or static-site generator built the page, backed by markers found in the served HTML
• Tech stack: CSS framework, state management, build tool and hosting provider
• Core Web Vitals: LCP, CLS, INP, TTFB measured on the live page
• SEO & accessibility spot-check: meta tags, Open Graph, structured data, alt-text coverage
• SSR/CSR/MIX badge right on the toolbar icon
• A DevTools panel ("Rendering") with the whole report at full width, re-running on every navigation
• History of recent analyses; export to JSON, CSV or Markdown, or copy a one-line summary into a pull request

🔍 WHO IT'S FOR
• SEO specialists: check that the content and meta tags are in the server HTML, not added later by JavaScript
• Developers: confirm your SSR/hydration setup works in production, or look under the hood of any site
• Web architects: gather rendering-strategy evidence across competitors and inspirations

🔬 HOW IT WORKS
The core method is direct evidence, not guesswork: the extension re-fetches the page's server HTML and compares its visible text with the rendered page. If a site blocks that second request, it uses a measurement taken while the page was parsing and lowers the confidence level. Framework hydration markers, serialized state and timing signals refine the verdict: 15+ indicators combined into a weighted score you can inspect yourself. Delivery and region analysis are reported separately and never allowed to vote on the verdict, because how a document travelled is not the same question as where it was rendered.

🔒 PRIVACY
Analysis runs locally in your browser. The extension optionally shares anonymous, aggregate statistics (rendering type, framework — never full URLs or page paths, only the site's origin) to power a public dashboard of rendering trends. One toggle in settings turns this off completely. Response headers and the region breakdown are never shared at all.

📖 Open source (MIT) — read the code, open an issue, or star it: github.com/dzienisz/chrome-ssr-csr

## Data collection disclosure (AMO consent screen)

Declared in the manifest and surfaced to users at install:
- **Required — Website activity**: the origin (domain) of pages you analyze,
  the detected rendering type and framework, sent to the project's dashboard.
  This is the opt-out telemetry (`shareData`, on by default; disable it in the
  extension's settings and nothing is sent).
- **Optional — Technical and interaction data**: aggregate Core Web Vitals and
  tech-stack signals that accompany an analysis when sharing is enabled.

Never collected: full URLs or page paths, page content, personal data,
browsing history, HTTP response headers, or the per-region server/client
breakdown (all of which are computed and shown locally only).
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
full URLs, page paths, page content, or personal data. The optional `websiteContent`
disclosure covers Ask Jev, which is off by default and sends the page URL and
up to 12,000 characters each of server HTML text, body markup and visible text
to TypeSafe only when the user enables the feature and clicks **Ask Jev**.
The user supplies the API key, which is kept in local extension storage.
Privacy policy:
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

- No absolute claims about bots ("exactly what crawlers see", "what Google
  sees"). Googlebot renders JavaScript in a later pass; many link unfurlers and
  AI crawlers don't run it at all (sources: Google Search Central "JavaScript
  SEO basics", Vercel/MERJ "The rise of the AI crawler", 2024). The extension
  fetches with the user's browser, so it shows what a browser gets from the
  server, which can differ from what a bot gets.
- Localized summaries/descriptions already exist in `store-listings.md` (8
  languages). AMO supports per-locale listings too — reuse that copy; just trim
  each Summary to AMO's 250-char limit if needed.
- Never claim "no data collection" — telemetry is opt-out, not absent. The AMO
  reviewer sees the manifest disclosure, so the listing must match it.
- No unverifiable accuracy percentages ("95% accuracy") — describe the method.
