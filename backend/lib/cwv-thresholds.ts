/**
 * Core Web Vitals thresholds (milliseconds / unitless)
 * Source: https://web.dev/vitals/
 *
 * These are the single source of truth used by both the UI
 * (core-web-vitals-comparison.tsx) and the DB queries (db.ts).
 * NOTE: the identical numbers are embedded in the SQL strings in db.ts —
 * update both places if thresholds ever change.
 */
export const CWV = {
  lcp:  { good: 2500,  poor: 4000  },  // ms
  cls:  { good: 0.1,   poor: 0.25  },  // unitless
  fid:  { good: 100,   poor: 300   },  // ms
  ttfb: { good: 800,   poor: 1800  },  // ms
} as const;

export type CWVMetric = keyof typeof CWV;

export type CWVRating = 'good' | 'needs-improvement' | 'poor';

export function classifyMetric(metric: CWVMetric, value: number): CWVRating {
  const t = CWV[metric];
  if (value < t.good) return 'good';
  if (value < t.poor) return 'needs-improvement';
  return 'poor';
}
