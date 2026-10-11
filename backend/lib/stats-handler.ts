import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import {
  getTotalStats,
  getTopFrameworks,
  getTopDomains,
  getAnalysesByDate,
  getRecentAnalyses,
  getContentComparisonStats,
} from "@/lib/db";
import { getPublicAggregates } from "@/lib/public-stats";

const cacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};
const publicAggregateCacheHeaders = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
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
        const baseStatsPromise = getPublicAggregates();
        const headers =
          !admin && type === "all"
            ? publicAggregateCacheHeaders
            : cacheHeaders;
        if (!admin) {
          return NextResponse.json(await baseStatsPromise, { headers });
        }

        const [baseStats, domains, recent] = await Promise.all([
          baseStatsPromise,
          getTopDomains(10),
          getRecentAnalyses(20),
        ]);
        return NextResponse.json(
          { ...baseStats, domains, recent },
          { headers },
        );
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
