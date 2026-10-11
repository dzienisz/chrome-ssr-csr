import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import {
  getTotalStats,
  getTopFrameworks,
  getTopDomains,
  getAnalysesByDate,
  getRecentAnalyses,
  getLatestAnalysisTime,
  getContentComparisonStats,
  getCoreWebVitalsByRenderType,
} from "@/lib/db";
import { getTechStackStats, getSEOStats } from "@/lib/db-phase2";
import { getNavigationByRenderType } from "@/lib/db-phase3";

const cacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

interface StatsHandlerOptions {
  admin: boolean;
}

export async function handleStats(
  request: NextRequest,
  { admin }: StatsHandlerOptions,
) {
  noStore();

  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "all";

    if (!admin && (type === "domains" || type === "recent")) {
      return NextResponse.json(
        { success: false, error: "Admin only" },
        { status: 403, headers: cacheHeaders },
      );
    }

    for (const [key, min, max] of [
      ["limit", 1, 100],
      ["offset", 0, 100000],
      ["days", 1, 365],
    ] as const) {
      const value = searchParams.get(key);
      if (
        value !== null &&
        (!/^\d+$/.test(value) ||
          !Number.isSafeInteger(Number(value)) ||
          Number(value) < min ||
          Number(value) > max)
      ) {
        return NextResponse.json(
          { success: false, error: "Invalid query parameters" },
          { status: 400, headers: cacheHeaders },
        );
      }
    }

    switch (type) {
      case "total":
        return NextResponse.json(await getTotalStats(), {
          headers: cacheHeaders,
        });

      case "frameworks": {
        const limit = parseInt(searchParams.get("limit") || "10");
        return NextResponse.json(await getTopFrameworks(limit), {
          headers: cacheHeaders,
        });
      }

      case "domains": {
        const domainLimit = parseInt(searchParams.get("limit") || "20");
        return NextResponse.json(await getTopDomains(domainLimit), {
          headers: cacheHeaders,
        });
      }

      case "timeline": {
        const days = parseInt(searchParams.get("days") || "30");
        return NextResponse.json(await getAnalysesByDate(days), {
          headers: cacheHeaders,
        });
      }

      case "recent": {
        const recentLimit = parseInt(searchParams.get("limit") || "20");
        const offset = parseInt(searchParams.get("offset") || "0");
        return NextResponse.json(
          await getRecentAnalyses(recentLimit, offset),
          { headers: cacheHeaders },
        );
      }

      case "contentComparison":
        return NextResponse.json(await getContentComparisonStats(), {
          headers: cacheHeaders,
        });

      case "all":
      default: {
        const [baseStats, adminStats] = await Promise.all([
          Promise.all([
            getTotalStats(),
            getTopFrameworks(10),
            getAnalysesByDate(30),
            getLatestAnalysisTime(),
            getContentComparisonStats(),
            getTechStackStats(),
            getSEOStats(),
            getCoreWebVitalsByRenderType(),
            getNavigationByRenderType(),
          ]),
          admin
            ? Promise.all([getTopDomains(10), getRecentAnalyses(20)])
            : Promise.resolve(null),
        ]);
        const [
          total,
          topFrameworks,
          timelineData,
          latestTime,
          contentComparison,
          techStack,
          seoStats,
          coreWebVitals,
          navigationByRenderType,
        ] = baseStats;
        const response: Record<string, unknown> = {
          total,
          frameworks: topFrameworks,
          timeline: timelineData,
          latestTime,
          contentComparison,
          techStack,
          seoStats,
          coreWebVitals,
          navigationByRenderType,
        };
        if (adminStats) {
          response.domains = adminStats[0];
          response.recent = adminStats[1];
        }

        return NextResponse.json(response, { headers: cacheHeaders });
      }
    }
  } catch (error) {
    console.error("Stats query error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: cacheHeaders },
    );
  }
}
