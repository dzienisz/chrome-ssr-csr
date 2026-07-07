# Plan 001: Ship the "Core Web Vitals by Render Type" dashboard insight

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 97ef2cb..HEAD -- backend/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `97ef2cb`, 2026-07-07

## Why this matters

This project's unique asset is crowd-sourced Core Web Vitals data (6,000+ real-world
page analyses) **segmented by rendering strategy** (SSR / CSR / Hybrid). "Is SSR
actually faster in the wild?" is the question the extension's users — developers and
SEO specialists — install it to answer. The aggregation query and API endpoint for
this already exist and work in production, but **no dashboard component consumes
them**: the old display component was deleted as unused in v1.4.0 instead of being
wired up. This plan adds one dashboard card that turns collected-but-invisible data
into the dashboard's headline insight.

## Current state

Relevant files (all paths relative to repo root):

- `backend/lib/db.ts` — `getCoreWebVitalsByRenderType()` at **line 283**: working SQL
  aggregate, returns one row per render category. Not called by the dashboard.
- `backend/app/api/stats/route.ts` — `GET /api/stats`; the `case 'all':` branch
  (**lines 59–87**) is the single payload the dashboard consumes. It does NOT include
  CWV data today.
- `backend/app/dashboard/page.tsx` — server component; `getDashboardData()`
  (**lines 17–49**) mirrors the `case 'all'` list for the initial server-side render.
  Every data source must be added in BOTH places or the card will be blank until the
  first 30-second client refresh (this exact bug was fixed in v1.3.0 — don't reintroduce it).
- `backend/components/dashboard/live-dashboard.tsx` — client component; owns the
  `DashboardData` interface (**lines 75–93**) and the card layout (**lines 245–318**).
- `backend/lib/cwv-thresholds.ts` — single source of truth for good/poor thresholds.
- `backend/components/dashboard/tech-stack-trends.tsx` — the style exemplar to copy.
- `backend/app/api/stats/phase1/route.ts` — separate endpoint that already calls the
  same query. Leave untouched; it is out of scope.

### The query you are wiring up (`backend/lib/db.ts:283`, excerpt)

```ts
export async function getCoreWebVitalsByRenderType() {
  try {
    const result = await sql`
      SELECT
        CASE
          WHEN render_type ILIKE '%SSR%' THEN 'SSR'
          WHEN render_type ILIKE '%CSR%' THEN 'CSR'
          WHEN render_type ILIKE '%Hybrid%' OR render_type ILIKE '%Mixed%' THEN 'Hybrid'
          ELSE 'Other'
        END as render_category,
        COUNT(*) as sample_count,
        ROUND(AVG((core_web_vitals->>'lcp')::numeric)) as avg_lcp,
        COUNT(CASE WHEN (core_web_vitals->>'lcp')::numeric < 2500 THEN 1 END) as lcp_good,
        ROUND(AVG((core_web_vitals->>'cls')::numeric), 3) as avg_cls,
        COUNT(CASE WHEN (core_web_vitals->>'cls')::numeric < 0.1 THEN 1 END) as cls_good,
        ROUND(AVG((core_web_vitals->>'fid')::numeric)) as avg_fid,
        COUNT(CASE WHEN (core_web_vitals->>'fid')::numeric < 100 THEN 1 END) as fid_good,
        ROUND(AVG((core_web_vitals->>'ttfb')::numeric)) as avg_ttfb,
        COUNT(CASE WHEN (core_web_vitals->>'ttfb')::numeric < 800 THEN 1 END) as ttfb_good,
        ROUND(
          (COUNT(CASE WHEN
            (core_web_vitals->>'lcp')::numeric < 2500 AND
            (core_web_vitals->>'cls')::numeric < 0.1
          THEN 1 END)::numeric / NULLIF(COUNT(*), 0)) * 100
        ) as pass_rate
      FROM analyses
      WHERE core_web_vitals IS NOT NULL
      GROUP BY render_category
      ORDER BY sample_count DESC;
    `;
    return result.rows;
  } catch (error) {
    console.error('getCoreWebVitalsByRenderType error:', error);
    return [];
  }
}
```

Do not modify this function. Note two data facts:

1. **Vercel Postgres returns numerics as strings.** The dashboard convention is to
   parse defensively: see `live-dashboard.tsx:209` —
   `const totalAnalyses = parseInt(String(data.total?.total_analyses ?? 0)) || 0;`.
   Do the same for every field of this query's rows.
2. On error the function returns `[]`, and rows can legitimately be empty on a fresh
   database — the component must render a graceful placeholder in that case.

### The `case 'all'` branch you will extend (`backend/app/api/stats/route.ts:59–87`, excerpt)

```ts
      case 'all':
      default:
        const [
          total, topFrameworks, topDomains, timelineData, recentAnalyses,
          latestTime, contentComparison,
          techStack, seoStats,
        ] = await Promise.all([
          getTotalStats(),
          getTopFrameworks(10),
          getTopDomains(10),
          getAnalysesByDate(30),
          getRecentAnalyses(20),
          getLatestAnalysisTime(),
          getContentComparisonStats(),
          getTechStackStats(),
          getSEOStats(),
        ]);

        return NextResponse.json({
          total,
          frameworks: topFrameworks,
          domains: topDomains,
          timeline: timelineData,
          recent: recentAnalyses,
          latestTime,
          contentComparison,
          techStack,
          seoStats,
        }, { headers: cacheHeaders });
```

`backend/app/dashboard/page.tsx:17–49` has the same list; keep them in lockstep.

### Thresholds module (`backend/lib/cwv-thresholds.ts`, current full content)

```ts
export const CWV = {
  lcp:  { good: 2500,  poor: 4000  },  // ms
  cls:  { good: 0.1,   poor: 0.25  },  // unitless
  fid:  { good: 100,   poor: 300   },  // ms
  ttfb: { good: 800,   poor: 1800  },  // ms
} as const;

export type CWVMetric = keyof typeof CWV;
```

### Style conventions (mandatory)

The dashboard is **light-mode only** (dark-mode classes were deliberately stripped in
v1.4.0 — never add `dark:` classes). Cards are plain Tailwind divs, NOT Tremor
components. Copy the card shell, header, badge, and bar patterns from
`backend/components/dashboard/tech-stack-trends.tsx`:

- Card shell: `rounded-lg border bg-white border-gray-100 shadow-sm`
- Header: `<h3 className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-2">`
  with an emoji, plus a phase badge pill on the right
  (`border-blue-200 bg-blue-50 text-blue-600` — use "Phase 1" as the label)
- Bars: `h-2 bg-gray-100 rounded-full overflow-hidden` track with a colored
  `h-full rounded-full` fill div sized via inline `width: %`
- Empty state: card shell + `text-sm text-gray-400 italic` message
  (see `tech-stack-trends.tsx:11–20`)
- Render-category colors used elsewhere in the dashboard: SSR = emerald, CSR = rose,
  Hybrid = amber (see the StatsCard usages in `live-dashboard.tsx:254–271`)

## Commands you will need

Run all from `backend/` unless noted:

| Purpose   | Command         | Expected on success |
|-----------|-----------------|---------------------|
| Install   | `npm install`   | exit 0 |
| Tests     | `npm test`      | all pass (26 existing tests + your new ones) |
| Build     | `npm run build` | exit 0; route table printed |
| Lint      | `npm run lint`  | exit 0 / no errors |

There is no separate typecheck script; `npm run build` performs type checking.

## Scope

**In scope** (the only files you should modify or create):

- `backend/lib/cwv-thresholds.ts` (add one pure helper)
- `backend/lib/__tests__/cwv-thresholds.test.ts` (create)
- `backend/components/dashboard/cwv-insights.tsx` (create)
- `backend/app/api/stats/route.ts` (extend `case 'all'` only)
- `backend/app/dashboard/page.tsx` (extend the parallel fetch)
- `backend/components/dashboard/live-dashboard.tsx` (interface + one layout row)
- `backend/CHANGELOG.md` (add entry under a new `[1.5.0]` heading)
- `plans/README.md` (status row update at the end)

**Out of scope** (do NOT touch, even though they look related):

- `backend/lib/db.ts` — the query works; changing SQL risks the live dashboard.
- `backend/app/api/stats/phase1/route.ts` — existing public endpoint; leave as-is.
- Anything under `extension/` — the FID→INP migration is a separate, deliberately
  deferred effort.
- `backend/package.json` version field — bumped at release time, not per-feature.
- Any Tremor component imports or `dark:` classes.

## Git workflow

- Branch off `main`: `feat/cwv-insights`
- Conventional commits, matching repo style, e.g.
  `feat(dashboard): add Core Web Vitals by render type card`
- **Do NOT push or open a PR unless the operator instructed it** — merging to `main`
  auto-deploys to production via Vercel's GitHub integration.

## Steps

### Step 1: Add a metric-classification helper to `lib/cwv-thresholds.ts`

Append to `backend/lib/cwv-thresholds.ts`:

```ts
export type CWVRating = 'good' | 'needs-improvement' | 'poor';

export function classifyMetric(metric: CWVMetric, value: number): CWVRating {
  const t = CWV[metric];
  if (value < t.good) return 'good';
  if (value < t.poor) return 'needs-improvement';
  return 'poor';
}
```

**Verify**: `npm run build` → exit 0.

### Step 2: Unit-test the helper

Create `backend/lib/__tests__/cwv-thresholds.test.ts`, modeled structurally on
`backend/lib/__tests__/auth.test.ts` (vitest `describe`/`it`/`expect`; no mocks
needed here). Cover, for at least `lcp` and `cls`: a good value, a
needs-improvement value, a poor value, and both exact boundary values
(`value === good` → `needs-improvement`; `value === poor` → `poor`).

**Verify**: `npm test` → all pass, including the new file.

### Step 3: Create the `CWVInsights` component

Create `backend/components/dashboard/cwv-insights.tsx`. It is a presentational
component (no `'use client'` directive needed — it has no hooks; it will be rendered
inside the client `LiveDashboard`). Shape:

```ts
export interface CWVByRenderType {
  render_category: string;   // 'SSR' | 'CSR' | 'Hybrid' | 'Other'
  sample_count: string | number;
  avg_lcp: string | number | null;
  lcp_good: string | number;
  avg_cls: string | number | null;
  cls_good: string | number;
  avg_fid: string | number | null;   // received but NOT displayed — FID is deprecated
  fid_good: string | number;
  avg_ttfb: string | number | null;
  ttfb_good: string | number;
  pass_rate: string | number | null;
}

interface CWVInsightsProps {
  data?: CWVByRenderType[];
}
```

Behavior:

- If `data` is undefined or empty → render the empty-state card
  ("Core Web Vitals data unavailable"), matching `tech-stack-trends.tsx:11–20`.
- Filter out the `'Other'` category and any row whose parsed `sample_count` is 0.
- Card header: `⚡ Core Web Vitals by Render Type`, "Phase 1" badge, and a
  one-line subtitle such as
  `Real-world performance measured by extension users, segmented by rendering strategy`.
- One column (grid `md:grid-cols-3`) per render category in the order SSR, CSR,
  Hybrid (skip missing ones). Each column shows:
  - Category name with its color dot (SSR emerald, CSR rose, Hybrid amber) and
    `n = <sample_count>` in muted text. If `sample_count < 50`, append a
    `low sample` note in `text-xs text-gray-400`.
  - Three metric rows — **LCP** (ms), **CLS** (unitless, 3 decimals), **TTFB** (ms).
    Do NOT render FID (deprecated by Google in favor of INP; the extension does not
    collect INP yet). Each metric row: label, average value, and the value colored by
    `classifyMetric(...)` — good `text-emerald-600`, needs-improvement
    `text-amber-600`, poor `text-rose-600`. Render `—` in `text-gray-400` when the
    average is null.
  - A "CWV pass rate" bar: the `h-2` track/fill pattern from
    `tech-stack-trends.tsx:31–36`, fill width = `pass_rate`%, fill color
    `bg-emerald-500` when ≥ 50, otherwise `bg-amber-500`; the percentage printed
    to the right.
- Parse every numeric defensively:
  `const n = parseInt(String(row.sample_count ?? 0)) || 0;` (use `parseFloat` for
  `avg_cls`).

**Verify**: `npm run build` → exit 0 (component compiles; it is not yet rendered).

### Step 4: Extend the `all` payload — API route AND server page, together

1. In `backend/app/api/stats/route.ts`: import `getCoreWebVitalsByRenderType` from
   `@/lib/db`, add `getCoreWebVitalsByRenderType()` to the `Promise.all` array in
   `case 'all'`, destructure it as `coreWebVitals`, and add `coreWebVitals` to the
   returned JSON object.
2. In `backend/app/dashboard/page.tsx`: make the identical addition to
   `getDashboardData()` — import, `Promise.all` entry, destructured name, returned
   object key. The two lists must stay in lockstep.

**Verify**: `npm test` → all pass. Then `npm run build` → exit 0.

### Step 5: Render the card in the dashboard

In `backend/components/dashboard/live-dashboard.tsx`:

1. Import: `import { CWVInsights, CWVByRenderType } from './cwv-insights';`
2. Add to the `DashboardData` interface (lines 75–93): `coreWebVitals?: CWVByRenderType[];`
3. In the layout, insert a full-width row between the Timeline chart block
   (ends line 289) and the "Phase 2: Tech Stack & SEO" block (starts line 291):

```tsx
        {/* Phase 1: Core Web Vitals by render type */}
        <div className="mb-6">
          <CWVInsights data={data.coreWebVitals} />
        </div>
```

No change to `fetchData` is needed — it already replaces the whole `data` object
from the `?type=all` response, so the new key flows through automatically.

**Verify**: `npm run build` → exit 0. Then `npm run dev`, open
`http://localhost:3000/dashboard`, and confirm: the card renders between the
timeline and Tech Stack Trends; with no database configured it shows the
empty-state placeholder rather than crashing.

### Step 6: Changelog entry

Add to `backend/CHANGELOG.md` above the `[1.4.0]` entry:

```markdown
## [1.5.0] - <today's date>

### Added
- **Core Web Vitals by Render Type**: New dashboard card comparing real-world
  LCP, CLS, TTFB and CWV pass rate across SSR / CSR / Hybrid sites, using the
  previously unconsumed `getCoreWebVitalsByRenderType()` aggregation. FID is
  collected but intentionally not displayed (deprecated in favor of INP).
```

**Verify**: `npm test && npm run build` → both exit 0.

## Test plan

- `backend/lib/__tests__/cwv-thresholds.test.ts` (new, Step 2): `classifyMetric`
  good / needs-improvement / poor / boundary cases for `lcp` and `cls`. Pattern:
  `backend/lib/__tests__/auth.test.ts`.
- Existing suites must stay green — especially
  `backend/app/api/analyze/__tests__/route.test.ts` (12 tests) and
  `backend/lib/__tests__/db.test.ts`.
- There is no component-testing infrastructure (no @testing-library/react); do NOT
  add one for this plan. The component is covered by the build gate, the manual
  dev-server check in Step 5, and the pure-helper unit tests.
- Verification: `npm test` → all pass (26 existing + ≥6 new).

## Done criteria

Machine-checkable. ALL must hold (run from `backend/`):

- [ ] `npm test` exits 0; `cwv-thresholds.test.ts` exists and passes
- [ ] `npm run build` exits 0
- [ ] `npm run lint` exits 0
- [ ] `grep -n "coreWebVitals" app/api/stats/route.ts app/dashboard/page.tsx components/dashboard/live-dashboard.tsx` → at least one match in each file
- [ ] `grep -rn "dark:" components/dashboard/cwv-insights.tsx` → no matches
- [ ] `grep -rn "@tremor" components/dashboard/cwv-insights.tsx` → no matches
- [ ] `grep -n "avg_fid" components/dashboard/cwv-insights.tsx | grep -v "displayed\|deprecated"` → matches only the interface field, no JSX usage
- [ ] `git status` shows no modified files outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" don't match the live code (drift since `97ef2cb`).
- `getCoreWebVitalsByRenderType` no longer exists in `backend/lib/db.ts` or its
  return shape differs from the excerpt.
- `npm test` fails on `main` **before** your changes (broken baseline is not yours
  to fix here).
- Rendering the card requires modifying `backend/lib/db.ts` or the phase1 route.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- **INP migration**: when the extension starts collecting INP (replacing deprecated
  FID), extend the SQL in `getCoreWebVitalsByRenderType`, the `CWVByRenderType`
  interface, and this card together. The thresholds belong in `lib/cwv-thresholds.ts`
  (INP: good < 200 ms, poor ≥ 500 ms).
- **Threshold duplication**: the good/poor numbers are embedded in the SQL strings in
  `db.ts` AND in `cwv-thresholds.ts` (documented in that file's header). If thresholds
  change, update both.
- **Reviewer focus**: the lockstep between `route.ts` `case 'all'` and
  `page.tsx` `getDashboardData()` — a missing key in either causes a blank card
  either on initial load or after the first refresh; and string-vs-number parsing of
  Postgres numerics.
- **Deferred follow-ups**: per-page-type CWV splits (query `getPageTypeDistribution`
  already exists); detection-accuracy investigation of the low CSR share (audit
  finding DIR-04) which affects how the CSR column should be caveated.
