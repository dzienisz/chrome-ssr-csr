# 002 — DIR-04 spike: validate detection accuracy against known-rendering sites (EXECUTED)

**Date:** 2026-07-08 · **Type:** spike (read-only on production code) · **Status:** DONE

## Question

Production telemetry shows 1.4% CSR vs 10.7% hybrid, which looked implausible.
Hypothesis from the 2026-07-07 audit: the wide 35–65% hybrid band in
`extension/src/core/scoring.js:35` absorbs true CSR sites. Validate against
15–20 sites with publicly known rendering strategies before trusting any
cross-render-type comparison (including the plan 001 CWV card).

## Method

`extension/scripts/validate-detection.mjs` (added by this spike): Playwright
Chromium loads each site, waits 4s after `load`, injects the real
`src/analyzer-bundle.js` (with `bypassCSP`, mirroring the content-script CSP
exemption), runs `window.pageAnalyzer()`, and grades the verdict using the same
bucketing the backend uses (`ILIKE '%SSR%' / '%CSR%' / '%Hybrid%'` in
`backend/lib/db.ts`). 22 sites: 12 SSR (static, classic server HTML, Next/Nuxt/
Remix hydration), 2 islands (Astro, Qwik), 2 prerendered app shells, 6 pure CSR
SPAs. All 22 loaded successfully.

## Result: 14/22 — and the CSR bias is worse than hypothesized

| Ground truth | Correct | Detail |
|---|---|---|
| SSR (12) | 12/12 | All correct, mostly at 100% SSR score |
| Islands (2) | 2/2 acceptable | But both verdicts were "SSR", never "Hybrid" — islands are invisible |
| Pure CSR (6) | **0/6** | excalidraw 82% **SSR**, grafana-play "Likely SSR", windy "Likely SSR", claude.ai 100% **SSR**, diagrams.net 100% **SSR**, mastodon "Hybrid" |
| Prerendered shells (2) | n/a | squoosh.app & photopea.com ship real text in initial HTML; "SSR" verdict defensible (ground-truth nuance, not a bug) |

The production 1.4% CSR figure is explained: **true CSR sites are absorbed
mostly into the SSR buckets** (not just hybrid). The detector has a structural
SSR bias. Consequence: all cross-render-type aggregates collected so far
(including CWV-by-render-type, plan 001) compare "SSR" against a CSR bucket
that is nearly empty and an SSR bucket contaminated with misclassified CSR
sites.

## Root causes (ranked by measured impact)

### 1. Raw-HTML text extraction counts inline `<script>`/`<style>` text

`comparison-detector.js:30` parses the fetched raw HTML with `DOMParser` and
reads `rawDoc.body.innerText`. On a detached document (no layout), `innerText`
falls back to `textContent` semantics — **including the text of inline script
and style tags**. The rendered side (`document.body.innerText` on the live
page, line 33) excludes them. The two sides measure different things.

Measured raw "text" with vs without script/style stripped:

| Site | as measured | real text | Effect |
|---|---|---|---|
| squoosh.app | 47,017 | 407 | ratio 102.66 → "raw matches rendered - SSR" (+30) |
| play.grafana.org | 13,472 | 100 | ratio 2.4 → false SSR match; real ratio 0.018 → CSR |
| excalidraw.com | 964 | **10** | ratio 2.21 → false SSR match; real ratio 0.02 → CSR |
| claude.ai | 972 | **0** | script-only HTML |
| mastodon.social | 136 | 0 | small enough that CSR still fired |

This inverts the project's single highest-priority signal: script-heavy pages
(i.e., exactly CSR apps) get *SSR* credit proportional to their bundle size.

### 2. Rendered-DOM "SSR" signals reward every polished CSR app

These indicators read the **post-JS** DOM at click time, where a CSR app looks
identical to an SSR page: `rich initial content structure (+20)`
(content-detector.js:17 — "initial" is a misnomer; it's the hydrated DOM),
`low script-to-content ratio (+10)`, `rich meta tags (+15)`, `structured data
(+15)`, `fast first contentful paint (+15)`. Framework markers found in the
rendered DOM count as "hydration markers (SSR)" (+30, framework-detector.js:39)
even when the raw HTML is empty — windy.com got +30 SSR for Svelte class
markers despite 41 chars of raw text. Stacked, these give any well-built CSR
app 60–90 SSR points, outvoting the 40-point raw-vs-rendered CSR signal even
when it fires correctly (windy: comparison said CSR 0.02, verdict still
"Likely SSR with Hydration" at 69%).

### 3. Asymmetric guards in the comparison verdict

`comparison-detector.js:43-45`: the CSR branch requires
`renderedLength > 200`, but the SSR branch (`ratio > 0.7`) has **no minimum
text requirement** — excalidraw's 10 chars of raw text vs 436 rendered can
qualify as "SSR match". Low-text app UIs (canvas apps) land here. Ratios in
the 0.2–0.7 dead zone (diagrams.net: 0.68) produce no signal at all, leaving
the verdict to the biased signals in (2).

### 4. Hybrid band hardcoded wider than config, and too cheap to enter

`scoring.js:35` hardcodes 35–65% with `hasBothSignals` (≥20 pts each side),
while `config.js:38` (`thresholds.hybrid`) says 41–59. mastodon.social:
comparison correctly fired CSR (ratio 0.02, +40), soft signals added 25 SSR
pts → 38% → forced "Hybrid/Islands Architecture". Under the config band it
would have been "Likely CSR/SPA" (correct bucket). Because of (2), *every* CSR
site accrues ≥20 SSR points, so the `hasBothSignals` gate is nearly always
open.

### 5. Fetch-blocked comparison silently defaults to SSR

When the raw-HTML fetch fails or is bot-challenged (claude.ai), comparison
returns `null` and the verdict falls entirely to the signals in (2) → 100%
SSR at high confidence. No "reduced confidence / comparison unavailable"
handling exists.

### 6. Stale hardcoded telemetry version blocks before/after segmentation

`extension/src/telemetry.js:55` sends `version: '3.5.0'` hardcoded (actual:
3.6.x). `extension_version` is stored per row, so pre/post-fix data *could* be
segmented — but only if the version is read from
`chrome.runtime.getManifest().version` and bumped with the fix.

## Recommended fix plan (next: plan 003)

Ordered, smallest-first; re-run `scripts/validate-detection.mjs` after each:

1. **Fix text extraction** — in `comparison-detector.js`, clone/strip
   `script, style, noscript, template` from the raw body (and use the same
   extraction on a clone of the rendered body) before measuring. Flips
   excalidraw, grafana-play, and claude.ai-class sites to CSR on its own.
2. **Symmetric guards + decisive-CSR override** — require minimum real text
   (~200 chars) for the SSR branch too; when stripped ratio < ~0.1 with
   rendered > 200, treat as near-conclusive CSR (raise weight or cap
   rendered-DOM SSR contributions). Consider an empty-SPA-root check on the
   *raw* document (`<div id="root"></div>` empty raw = CSR) as corroboration.
   Fixes windy.
3. **Framework markers only count as "hydration (SSR)" if present in raw
   HTML** (check `rawDoc`, which step 1 already parses); markers only in the
   rendered DOM are CSR-neutral at best.
4. **Align hybrid band with config** — use `config.thresholds.hybrid` in
   `scoring.js` instead of hardcoded 35–65, and/or require `hybridScore > 0`
   (actual islands evidence) to enter the hybrid branch. Fixes mastodon.
5. **Comparison-unavailable handling** — when fetch fails, cap confidence and
   prefer "Likely" verdicts over 100% SSR.
6. **Telemetry version from manifest** + version bump with the release, so
   dashboard data can be split into pre/post-fix eras.

**Acceptance:** harness ≥ 20/22 with all 12 SSR still passing and ≥ 5/6 pure
CSR correct.

## Implications for existing production data

- Treat all collected `render_type` data to date as SSR-inflated; don't
  publish cross-render-type comparisons (blog posts, "your site vs average")
  until post-fix data accumulates.
- The plan 001 CWV-by-render-type card remains fine to ship UI-wise, but its
  CSR column is effectively "sites so CSR the old detector couldn't miss" —
  a biased sample of ~1.4%.
- Islands/hybrid sites classify as SSR (astro.build, qwik.dev both 100% SSR,
  hybridScore ≤ 25 vs the ≥30 threshold in scoring.js:31) — the 10.7% hybrid
  bucket is *not* islands sites; it's mostly misclassified CSR (mastodon
  pattern) plus genuinely mixed pages.

## Artifacts

- Harness: `extension/scripts/validate-detection.mjs` (ground truth embedded;
  writes `validate-detection-results.json` next to itself, git-ignored-worthy)
- Raw run output: 2026-07-08, 22/22 sites loaded, 14/22 acceptable, 0/6 pure
  CSR detected as CSR
