# Promo posts — ready to fire

Drafts for promoting CSR vs SSR Detector. Post them **spaced out** (one
channel per day or two, not all at once) and always as yourself — these
communities reward authentic dev stories and punish drive-by promo.

The unique angle everywhere: **it doesn't guess from framework markers — it
re-fetches the page's raw HTML and diffs it against the rendered DOM, then
shows you the evidence behind the verdict.**

Links to use:
- Website: https://dzienko.dev/chrome-ssr-csr/
- Chrome: https://chromewebstore.google.com/detail/csr-vs-ssr-detector/fhiopdjeekafnhmfbcfoolhejdgjpkgg
- Firefox: https://addons.mozilla.org/firefox/addon/csr-vs-ssr-detector/
- GitHub: https://github.com/dzienisz/chrome-ssr-csr
- Trends dashboard: https://backend-mauve-beta-88.vercel.app/dashboard

Images to attach (in `extension/promo-images/`):
- `social-landscape-1600x900.png` — default attach for X / LinkedIn / Mastodon
- `social-square-1080x1080.png` — Instagram / LinkedIn square posts
- `social-diff-1600x900.png` — the "raw vs rendered" explainer; best for
  dev/SEO audiences (HN comment, r/webdev, r/TechSEO) where the method matters
- `screenshot-1-verdict-1280x800.png` — real popup screenshot, use when a
  community prefers "show the actual product" over marketing art

---

## 1. Show HN (best single shot — weekday morning US time)

**Title:**

> Show HN: CSR vs SSR Detector – diffs raw HTML against the rendered DOM to show how a page really renders

**First comment (post immediately under your own submission, link = website):**

> I built a browser extension that answers "is this page SSR or CSR?" the
> direct way: it fetches the same URL again — what a crawler gets — and diffs
> the visible text against the rendered DOM. If the server sent 4% of the
> text you're seeing, that's decisive CSR evidence; if it sent all of it,
> that's SSR. 15+ secondary signals (hydration markers, serialized state,
> timing, meta) refine the verdict, but they can't outvote the diff.
>
> Things I learned building it:
>
> - **Framework markers lie.** Next.js App Router ships no identifiable
>   element — I had to match script contents (`__next_f.push` streams) to
>   detect it. A CSR page can also leave SSR-looking meta behind, so markers
>   only count when the raw HTML backs them up.
> - **Prerendered pages break naive timing.** Browsers report impossibly fast
>   loads for speculation-rules prerenders and prefetch navigations; timing
>   has to be rebased on `activationStart` or skipped entirely.
> - **SPAs need re-analysis.** Soft navigations and the Navigation API mean
>   the verdict can change without a reload.
>
> Beyond the verdict you get the stack behind it (framework, CSS, state,
> hosting), Core Web Vitals (LCP/CLS/INP/TTFB), and an SEO spot-check.
> Chrome + Firefox 128+, MIT, no build tooling on the extension side.
>
> There's optional anonymous telemetry (origin only, opt-out) feeding a
> public dashboard of how the web actually renders:
> https://backend-mauve-beta-88.vercel.app/dashboard
>
> Detection is validated against a 22-site ground-truth suite — happy to talk
> about the scoring edge cases.

---

## 2. r/TechSEO (angle: "what does Googlebot actually get")

**Title:**

> I made a free extension that shows whether Google sees your content — or an empty div (raw HTML vs rendered DOM diff)

**Body:**

> The question under every SSR-vs-CSR debate: what does a crawler actually
> receive? This extension answers it directly — it re-fetches the page's raw
> HTML, strips scripts/styles/noscript from both sides, and compares the
> visible text against the rendered DOM.
>
> - Server sent ~all the text → SSR (crawlers are fine)
> - Server sent a shell + bundle → CSR (content depends on JS rendering)
> - In between → hybrid / islands / partial hydration, flagged separately
>
> On top of the verdict: meta/OG/structured-data spot-check, alt-text
> coverage, Core Web Vitals on the live page, and the framework + tech stack.
> Verdict includes a confidence score and the indicator list behind it —
> useful when you need to show a client *why* their "SSR" Next.js page is
> actually shipping an empty shell.
>
> Free, Chrome + Firefox, open source: [website link]
>
> Curious what people find — especially sites that market themselves as SSR
> but aren't.

*(Attach `social-diff-1600x900.png` — the diff visual is the pitch.)*

---

## 3. r/webdev (angle: the detection method)

**Title:**

> Detecting SSR vs CSR is harder than it looks — so my extension just diffs the raw HTML against the rendered DOM

**Body:**

> Most "is it SSR?" checks sniff for hydration markers or framework divs.
> That breaks constantly: Next.js App Router has no identifiable element,
> CSR apps leave SSR-ish meta behind, and prerendered pages report absurd
> timing.
>
> So I made the primary signal the obvious one: fetch the URL again (what a
> crawler gets), count visible text on both sides identically, compare. A
> decisive mismatch caps everything else; markers and timing only adjust
> within the evidence.
>
> Also handles: soft navigations / Navigation API re-analysis, speculation-
> rules prerender timing (rebased on `activationStart`), islands/partial
> hydration as its own verdict, and framework detection that reads script
> *contents* when there's no DOM marker.
>
> Free, MIT, Chrome + Firefox 128+: [website link]
> Code: [GitHub link]
>
> Happy to share the scoring details — it's a weighted system over 15+
> indicators, validated against a 22-site ground-truth harness.

---

## 4. r/SideProject (angle: the product)

**Title:**

> I built a free extension that tells you how any webpage actually renders — SSR, CSR or hybrid — in one click

**Body:**

> Click the icon on any site and you get a verdict with a confidence score
> and the evidence behind it: it literally fetches the raw HTML the server
> sends and compares it with what the browser ended up rendering.
>
> On top: framework + tech stack detection, Core Web Vitals, SEO/accessibility
> spot-check, analysis history with JSON/CSV/Markdown export. Works on SPA
> navigations too.
>
> Made for SEO people checking whether crawlers get real content, and devs
> verifying their hydration setup actually works in prod.
>
> [website link] — free, open source (MIT), Chrome + Firefox.
>
> Would love feedback — especially sites where the verdict surprises you.

---

## 5. Dev.to / personal blog post (long-form; repost link to HN/r/webdev)

**Working title:**

> SSR or CSR? Framework markers lie — here's how to actually tell

**Outline:**

1. The naive approaches and where each fails (hydration divs, bundle
   heuristics, timing — including the Next.js App Router case with zero DOM
   markers).
2. The ground truth: fetch raw HTML, strip script/style/noscript on both
   sides, count real text. Why both sides must be measured identically.
3. Guardrails the diff needs: decisive-CSR override, raw-evidence requirement
   for markers, confidence caps when the fetch fails ("definitive" →
   "likely").
4. The modern web's curveballs: speculation-rules prerender and
   `deliveryType: navigational-prefetch` → rebase timing on `activationStart`
   or skip; soft navigations → re-analyze without reload.
5. Beyond the verdict: how tech-stack, CWV (INP/LoAF) and SEO signals were
   kept as *telemetry collectors* that can never influence the score.
6. Validating detection: the 22-site ground-truth harness with Playwright.
7. Closing: links + the public rendering-trends dashboard.

---

## 6. Short social (X / Bluesky / LinkedIn / Threads)

**EN:**

> Is that page SSR or CSR? Stop guessing from the markup.
>
> My free extension fetches the raw HTML the server sent and diffs it against
> the rendered DOM — then shows the verdict *and* the evidence.
>
> Framework, tech stack & Core Web Vitals included. Chrome + Firefox, open
> source.
>
> dzienko.dev/chrome-ssr-csr

*(Attach `social-landscape-1600x900.png`.)*

**EN — diff-card variant (pairs with `social-diff-1600x900.png`):**

> What the server sent: `<div id="root"></div>` + 1.9 MB of JS.
> What the browser built: 31,540 chars of content.
>
> That 4% is the whole verdict. CSR vs SSR Detector — one click, evidence
> included. Free for Chrome + Firefox.
>
> dzienko.dev/chrome-ssr-csr

**PL (LinkedIn):**

> Czy Google widzi treść Twojej strony — czy pusty `<div id="root">`?
>
> Zbudowałem darmowe rozszerzenie, które jednym kliknięciem porównuje
> surowy HTML od serwera z wyrenderowanym DOM-em i pokazuje werdykt
> (SSR / CSR / hybryda) wraz z dowodami: framework, tech stack, Core Web
> Vitals, szybki audyt SEO.
>
> Chrome + Firefox, open source (MIT).
>
> dzienko.dev/chrome-ssr-csr

---

## 7. Reuse channels

- **Firefox Add-ons description / CWS "What's new"**: pull bullets straight
  from `extension/store-listing.md` — it's the source of truth.
- **GitHub Release body**: the social cards also work as release assets;
  `firefox-hero-1400x560.png` was made for exactly that.
- **Product Hunt** (later): needs gallery images — reuse the three store
  screenshots plus `social-landscape`. Tagline candidate: "See how any page
  really renders — SSR, CSR or hybrid, with the evidence." Don't burn the
  launch before you can actively answer comments for a full day.

## Channel notes

- **Don't cross-post the same text** — each community gets its own angle
  (HN: method + edge cases, r/TechSEO: crawler content, r/webdev: detection
  engineering, r/SideProject: the product).
- **Timing**: HN and Reddit reward Tue–Thu mornings (US). One channel at a
  time; if HN flops it can be reposted once after a week or two.
- Regenerate the images after any icon/branding change:
  `cd extension/promo-images && ./build.sh` (sources in `src/social-*.html`).
