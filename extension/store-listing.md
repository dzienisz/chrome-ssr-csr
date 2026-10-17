# Chrome Web Store Listing

Source of truth for the store listing text. Update this file first, then copy
into the Chrome Web Store Developer Dashboard (Store Listing section).

Related: `store-listings.md` (translations, 8 languages) · `amo-listing.md`
(Firefox/AMO equivalent — keep the privacy wording in sync across both stores).

Last synced to the store: NOT YET — draft of 2026-09-11 (v4.0.0 rewrite).

## Name

CSR vs SSR Detector

## Short summary (max 132 characters)

Real content or an empty shell? Compares a page's server HTML with what you see: SSR, CSR or hybrid, and which parts JS built.

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
• RENDERED WHERE: built in the browser, rendered at build time, rendered once and served from a CDN cache, or rendered for this request, read from the document's own response headers, along with the CDN, cache state, age and TTFB
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

## Notes for future edits

- No absolute claims about bots ("exactly what crawlers see", "what Google
  sees"). Googlebot renders JavaScript in a later pass; many link unfurlers and
  AI crawlers don't run it at all (sources: Google Search Central "JavaScript
  SEO basics", Vercel/MERJ "The rise of the AI crawler", 2024). The extension
  fetches with the user's browser, so it shows what a browser gets from the
  server, which can differ from what a bot gets.
- Never claim "no data collection" — telemetry is on by default (opt-out via
  the shareData setting); the privacy section above is worded to match
  privacy-policy.md. Keep them consistent.
- No unverifiable accuracy percentages ("95% accuracy") — the method
  description sells better and can't be contradicted by a review.
- No lists of framework/library names — CWS rejected 4.0.0 for "keyword
  spam" over exactly such a list ("Next.js, Nuxt, React, Vue, … and more").
  Describe the capability, not the brand names.
- Don't paste changelog/release notes into the description; that's what the
  store's "What's new" field and CHANGELOG.md are for.
