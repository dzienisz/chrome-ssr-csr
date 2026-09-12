# Chrome Web Store Listing

Source of truth for the store listing text. Update this file first, then copy
into the Chrome Web Store Developer Dashboard (Store Listing section).

Related: `store-listings.md` (translations, 8 languages) · `amo-listing.md`
(Firefox/AMO equivalent — keep the privacy wording in sync across both stores).

Last synced to the store: NOT YET — draft of 2026-09-11 (v4.0.0 rewrite).

## Name

CSR vs SSR Detector

## Short summary (max 132 characters)

See how any page renders — SSR, CSR or hybrid — where its HTML was built, and which parts JavaScript filled in.

## Full description

Does Google see your content — or an empty div waiting for JavaScript?

Open the popup and the answer is already there. CSR vs SSR Detector compares the raw HTML your server sends against what the browser actually renders, and tells you how the page is built: Server-Side Rendered, Client-Side Rendered, or a hybrid (islands, partial hydration).

Then it tells you the parts nobody else does.

🔍 WHO IT'S FOR
• SEO specialists — verify that crawlers get real content in the initial HTML, before it costs you rankings
• Developers — confirm your SSR/hydration setup actually works in production, or peek under the hood of any site
• Web architects — gather rendering-strategy evidence across competitors and inspirations

⚡ WHAT YOU GET
• A verdict with a confidence score — and every signal behind it, with the points it contributed and what it observed. No black box.
• RENDERED WHERE: built in the browser, rendered at build time, rendered once and served from a CDN cache, or rendered for this request — read from the document's own response headers, along with the CDN, cache state, age and TTFB
• REGIONS: which parts of the page the server sent and which ones JavaScript filled in, character by character. "#root gained 12,400 characters after the scripts ran" is a very different bug report from "CSR, 88%".
• Framework detection: Next.js, Nuxt, React, Vue, Angular, Gatsby, SvelteKit, Astro, Qwik, Remix, Turbo/Hotwire, Livewire, Phoenix LiveView, WordPress and more
• Tech stack: CSS framework, state management, build tool, hosting (Tailwind, Redux, Vite, Vercel…)
• Core Web Vitals: LCP, CLS, INP, TTFB measured on the live page
• SEO & accessibility spot-check: meta tags, Open Graph, structured data, alt-text coverage
• SSR/CSR/MIX badge right on the toolbar icon
• A DevTools panel ("Rendering") with the whole report at full width, re-running on every navigation
• History of recent analyses; export to JSON, CSV or Markdown, or copy a one-line summary into a pull request

🔬 HOW IT WORKS
The core method is direct evidence, not guesswork: the extension fetches the page's raw HTML and diffs it against the rendered DOM. Framework hydration markers, serialized state and timing signals refine the verdict — 15+ indicators combined into a weighted score you can inspect yourself. Delivery and region analysis are reported separately and never allowed to vote on the verdict, because how a document travelled is not the same question as where it was rendered.

🔒 PRIVACY
Analysis runs locally in your browser. The extension optionally shares anonymous, aggregate statistics (rendering type, framework — never full URLs or page paths, only the site's origin) to power a public dashboard of rendering trends. One toggle in settings turns this off completely. Response headers and the region breakdown are never shared at all.

📖 Open source (MIT) — read the code, open an issue, or star it: github.com/dzienisz/chrome-ssr-csr

## Notes for future edits

- Never claim "no data collection" — telemetry is on by default (opt-out via
  the shareData setting); the privacy section above is worded to match
  privacy-policy.md. Keep them consistent.
- No unverifiable accuracy percentages ("95% accuracy") — the method
  description sells better and can't be contradicted by a review.
- Don't paste changelog/release notes into the description; that's what the
  store's "What's new" field and CHANGELOG.md are for.
