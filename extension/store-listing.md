# Chrome Web Store Listing

Source of truth for the store listing text. Update this file first, then copy
into the Chrome Web Store Developer Dashboard (Store Listing section).

Related: `store-listings.md` (translations, 8 languages) · `amo-listing.md`
(Firefox/AMO equivalent — keep the privacy wording in sync across both stores).

Last synced to the store: NOT YET — draft of 2026-07-07.

## Name

CSR vs SSR Detector

## Short summary (max 132 characters)

One click shows how any page renders — SSR, CSR or hybrid — plus the framework, tech stack and Core Web Vitals behind it.

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

## Notes for future edits

- Never claim "no data collection" — telemetry is on by default (opt-out via
  the shareData setting); the privacy section above is worded to match
  privacy-policy.md. Keep them consistent.
- No unverifiable accuracy percentages ("95% accuracy") — the method
  description sells better and can't be contradicted by a review.
- Don't paste changelog/release notes into the description; that's what the
  store's "What's new" field and CHANGELOG.md are for.
