import {
  getTotalStats,
  getVerdictsByVersion,
  getTopFrameworks,
  getAnalysesByDate,
  getLatestAnalysisTime,
  getContentComparisonStats,
  getCoreWebVitalsByRenderType,
} from "@/lib/db";
import { getTechStackStats, getSEOStats } from "@/lib/db-phase2";
import { getNavigationByRenderType } from "@/lib/db-phase3";

export const PUBLIC_STATS_TTL_MS = 60_000;

export type PublicAggregates = {
  total: Awaited<ReturnType<typeof getTotalStats>>;
  frameworks: Awaited<ReturnType<typeof getTopFrameworks>>;
  timeline: Awaited<ReturnType<typeof getAnalysesByDate>>;
  latestTime: Awaited<ReturnType<typeof getLatestAnalysisTime>>;
  contentComparison: Awaited<ReturnType<typeof getContentComparisonStats>>;
  techStack: Awaited<ReturnType<typeof getTechStackStats>>;
  seoStats: Awaited<ReturnType<typeof getSEOStats>>;
  coreWebVitals: Awaited<ReturnType<typeof getCoreWebVitalsByRenderType>>;
  navigationByRenderType: Awaited<
    ReturnType<typeof getNavigationByRenderType>
  >;
  versions: Awaited<ReturnType<typeof getVerdictsByVersion>>;
};

let cached:
  | { promise: Promise<PublicAggregates>; expiresAt: number }
  | undefined;

export function getPublicAggregates(
  now = Date.now(),
): Promise<PublicAggregates> {
  if (cached && now < cached.expiresAt) return cached.promise;

  const promise = Promise.all([
    getTotalStats(),
    getTopFrameworks(10),
    getAnalysesByDate(30),
    getLatestAnalysisTime(),
    getContentComparisonStats(),
    getTechStackStats(),
    getSEOStats(),
    getCoreWebVitalsByRenderType(),
    getNavigationByRenderType(),
    getVerdictsByVersion(8),
  ]).then(
    ([
      total,
      frameworks,
      timeline,
      latestTime,
      contentComparison,
      techStack,
      seoStats,
      coreWebVitals,
      navigationByRenderType,
      versions,
    ]) => ({
      total,
      frameworks,
      timeline,
      latestTime,
      contentComparison,
      techStack,
      seoStats,
      coreWebVitals,
      navigationByRenderType,
      versions,
    }),
  );
  const entry = { promise, expiresAt: now + PUBLIC_STATS_TTL_MS };
  cached = entry;
  void promise.catch(() => {
    if (cached === entry) cached = undefined;
  });
  return promise;
}

export function resetPublicAggregatesCache(): void {
  cached = undefined;
}
