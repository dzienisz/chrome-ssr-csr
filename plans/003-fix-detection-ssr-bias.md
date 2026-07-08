# 003 — Fix detector SSR bias (executes the plan 002 fix list)

**Date:** 2026-07-08 · **Type:** fix (extension detection core) · **Status:** DONE
**Depends on:** plan 002 (spike findings + validation harness) · **Ships as:** extension v3.7.0

## Goal

Plan 002 measured 0/6 known pure-CSR sites detected as CSR (most classified
SSR at high confidence). Apply its six ordered fixes and pass the acceptance
gate: ≥ 20/22 sites in the acceptable bucket on
`extension/scripts/validate-detection.mjs`, all 12 SSR sites still passing,
≥ 5/6 pure CSR correct.

## What changed

1. **Text extraction** (`src/detectors/comparison-detector.js`): new
   `extractVisibleText()` clones the body, strips
   `script/style/noscript/template`, and normalizes whitespace — applied to
   *both* the fetched raw document and the rendered DOM, so inline bundle text
   no longer counts as server-sent content.
2. **Symmetric guards + decisive-CSR override** (same file + config): the SSR
   branch now also requires > 200 chars of real raw text; a new
   `isDecisiveCSR` fires when the stripped raw/rendered ratio < 0.1
   (`contentComparison.decisiveCsrRatio`) with > 200 rendered chars. In
   `src/core/analyzer.js` that caps total SSR score at
   `scoring.decisiveCsrSsrCap` (10), so post-JS "SSR-looking" signals can't
   outvote a near-conclusive comparison.
3. **Framework markers need raw evidence** (`src/detectors/framework-detector.js`):
   `detectFrameworks(rawDocument)` takes the parsed raw document (exposed by
   the comparison module) and only grants the +30 hydration-marker SSR score
   when the marker exists in the raw HTML. Rendered-only markers are recorded
   for telemetry but score nothing.
4. **Hybrid band from config** (`src/core/scoring.js`): the hybrid branch uses
   `config.thresholds.hybrid` (41–59) instead of the hardcoded 35–65.
5. **Comparison-unavailable handling** (`src/core/analyzer.js` + config): when
   the raw fetch fails, confidence is capped at
   `confidence.maxConfidenceNoComparison` (60) and definitive SSR/CSR verdicts
   downgrade to their "Likely" variants, with an explicit indicator.
6. **Telemetry version** (`src/telemetry.js`): hardcoded `'3.5.0'` replaced by
   `chrome.runtime.getManifest().version` (guarded, since that module runs in
   page context). Note: `popup.js` has its own `sendAnalysisData` that already
   read the manifest version; `src/telemetry.js` appears to be unreferenced
   legacy code — candidate for deletion in a housekeeping pass.
   Manifest/package bumped to **3.7.0** so dashboard data segments into
   pre/post-fix eras.

Bundles rebuilt (`npm run build`); unit tests updated/added
(`src/core/__tests__/analyzer.test.js`,
`src/detectors/__tests__/comparison-detector.test.js`, updates to scoring and
framework-detector tests) — 105 passing.

## Validation (2026-07-08, all 22 sites loaded)

**21/22 acceptable** (was 14/22) — acceptance met.

| Ground truth | Result |
|---|---|
| SSR (12) | 12/12 — 11 ideal, github.com/vercel/next.js → HYBRID (acceptable) |
| Islands (2) | 2/2 acceptable (still verdict "SSR"; islands visibility not in scope) |
| Prerendered shells (2) | 2/2 (SSR, defensible per plan 002 ground-truth note) |
| Pure CSR (6) | **5/6** — excalidraw, diagrams.net, grafana-play, windy, mastodon all "Client-Side Rendered (CSR)" at 10–20% SSR |

Remaining miss: **claude.ai** — its raw-HTML fetch is bot-blocked, so the
comparison is unavailable; the new degraded mode returns "Likely SSR with
Hydration" at capped (≤60) confidence instead of the old 100% SSR. Without
raw HTML there is no honest CSR signal; accepted by the ≥5/6 gate.

## Production-data note

Telemetry rows with `extension_version >= 3.7.0` are post-fix; keep treating
older rows as SSR-inflated (plan 002 "Implications" section still applies to
them). Raw run output: `extension/scripts/validate-detection-results.json`
(git-ignored).
