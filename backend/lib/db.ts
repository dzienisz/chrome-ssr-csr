import { sql } from "@vercel/postgres";
import {
  toPublicAnalysis,
  aggregateNumber,
  normalizeHostname,
  normalizeFramework,
  publicRenderType,
  PAGE_TYPES,
  DEVICE_TYPES,
  EFFECTIVE_TYPES,
  type TelemetryRecord,
} from "./telemetry-schema";

export interface CoreWebVitals {
  lcp?: number | null;
  cls?: number | null;
  inp?: number | null;
  fid?: number | null; // legacy rows only (pre-v3.11.0 extensions)
  ttfb?: number | null;
  tti?: number | null;
  tbt?: number | null;
  pageLoadTime?: number | null;
  resourceCount?: number | null;
  totalTransferSize?: number | null;
  cachedResources?: number | null;
  cacheHitRate?: number | null;
}

export interface DeviceInfo {
  deviceType?: string;
  screenWidth?: number;
  screenHeight?: number;
  devicePixelRatio?: number;
  isTouchDevice?: boolean;
  browserName?: string;
  browserVersion?: string;
  engineName?: string;
  connectionType?: string;
  effectiveType?: string;
  downlink?: number | null;
  rtt?: number | null;
  saveData?: boolean;
  timezone?: string;
  language?: string;
  prefersReducedMotion?: boolean;
  prefersDarkMode?: boolean;
  cpuCores?: number | null;
  connection?: {
    effectiveType?: string;
  };
}

export interface TechStack {
  cssFramework?: string | null;
  stateManagement?: string[];
  buildTool?: string | null;
  hosting?: string | null;
  cdn?: string | null;
  globalVariables?: string[];
}

export interface SEOAccessibility {
  title?: string | null;
  metaDescription?: boolean;
  hasCanonical?: boolean;
  hasOG?: boolean;
  headingStructure?: {
    h1Count?: number;
    hasProperHierarchy?: boolean;
  };
  imageAltCoverage?: number;
  hasAriaLandmarks?: boolean;
  score?: number;
}

export interface HydrationStats {
  score?: number;
  errorCount?: number;
  hydrationTime?: number | null;
  hasHydrationErrors?: boolean;
}

export interface NavigationStats {
  isSPA?: boolean;
  clientRoutes?: number;
  // Timing only — page paths are excluded from telemetry by the privacy policy
  routes?: Array<{ type?: string; time?: number; source?: string }>;
  // Soft Navigations API (Chrome 151+): browser-verified route changes with
  // per-route paint timing. Absent on engines that do not implement it.
  softNavigations?: {
    supported: boolean;
    count: number;
    entries?: Array<{
      startTime: number;
      paintTime: number | null;
      interactionContentfulPaint: number | null;
    }>;
  };
  // Navigation API (Baseline since Firefox 147)
  navigationApi?: {
    supported: boolean;
    clientEntries: number;
  };
}

export interface AnalysisRecord {
  id?: number;
  timestamp?: Date;
  url: string;
  domain: string;
  render_type: string;
  confidence: number;
  frameworks: string[];
  performance_metrics: {
    domReady?: number;
    fcp?: number;
    contentRatio?: number;
    rawHtmlLength?: number;
    renderedLength?: number;
    hybridScore?: number;
  };
  indicators: string[];
  extension_version: string;
  user_agent?: string;
  core_web_vitals?: CoreWebVitals | null;
  page_type?: string;
  device_info?: DeviceInfo | null;
  tech_stack?: TechStack | null;
  seo_accessibility?: SEOAccessibility | null;
  hydration_stats?: HydrationStats | null;
  navigation_stats?: NavigationStats | null;
}

export async function insertAnalysis(data: AnalysisRecord | TelemetryRecord) {
  try {
    const result = await sql`
      INSERT INTO analyses (
        url, domain, render_type, confidence, frameworks,
        performance_metrics, indicators, extension_version, user_agent,
        core_web_vitals, page_type, device_info, tech_stack, seo_accessibility,
        hydration_stats, navigation_stats
      ) VALUES (
        ${data.url},
        ${data.domain},
        ${data.render_type},
        ${data.confidence},
        ${JSON.stringify(data.frameworks)},
        ${JSON.stringify(data.performance_metrics)},
        ${JSON.stringify(data.indicators)},
        ${data.extension_version},
        ${("user_agent" in data ? data.user_agent : null) || null},
        ${data.core_web_vitals ? JSON.stringify(data.core_web_vitals) : null},
        ${data.page_type || null},
        ${data.device_info ? JSON.stringify(data.device_info) : null},
        ${data.tech_stack ? JSON.stringify(data.tech_stack) : null},
        ${data.seo_accessibility ? JSON.stringify(data.seo_accessibility) : null},
        ${data.hydration_stats ? JSON.stringify(data.hydration_stats) : null},
        ${data.navigation_stats ? JSON.stringify(data.navigation_stats) : null}
      )
      RETURNING id;
    `;

    return result.rows[0];
  } catch (error) {
    console.error("Database insertion error:", error);
    throw error;
  }
}

export async function getRecentAnalyses(
  limit: number = 20,
  offset: number = 0,
) {
  try {
    const result = await sql`
      SELECT id, domain, render_type, confidence, timestamp, frameworks,
        core_web_vitals, tech_stack, hydration_stats, navigation_stats, device_info
      FROM analyses
      ORDER BY timestamp DESC
      LIMIT ${limit} OFFSET ${offset};
    `;
    return result.rows.map(toPublicAnalysis);
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

export async function getTotalStats() {
  try {
    const result = await sql`
      SELECT
        COUNT(*) as total_analyses,
        COUNT(CASE WHEN render_type ILIKE '%SSR%' THEN 1 END) as ssr_count,
        COUNT(CASE WHEN render_type ILIKE '%CSR%' THEN 1 END) as csr_count,
        COUNT(CASE WHEN render_type ILIKE '%Hybrid%' OR render_type ILIKE '%Mixed%' THEN 1 END) as hybrid_count,
        COALESCE(AVG(confidence), 0) as avg_confidence
      FROM analyses;
    `;
    return result.rows[0];
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

export async function getTopFrameworks(limit: number = 10) {
  try {
    const result = await sql`
      SELECT
        framework,
        COUNT(*) as count
      FROM analyses,
      LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(frameworks::jsonb) = 'array' THEN frameworks::jsonb ELSE '[]'::jsonb END) as framework
      WHERE frameworks::jsonb != '[]'::jsonb
      GROUP BY framework;
    `;
    const counts = new Map<string, number>();
    for (const row of result.rows) {
      const framework = normalizeFramework(row.framework);
      if (framework) counts.set(framework, (counts.get(framework) ?? 0) + aggregateNumber(row.count));
    }
    return Array.from(counts, ([framework, count]) => ({ framework, count }))
      .sort((a, b) => b.count - a.count || a.framework.localeCompare(b.framework))
      .slice(0, limit);
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

export async function getTopDomains(limit: number = 20) {
  try {
    const result = await sql`
      SELECT domain, render_type, COUNT(*) as count,
        SUM(confidence) as confidence_sum, COUNT(confidence) as confidence_count
      FROM analyses
      GROUP BY domain, render_type;
    `;
    const groups = new Map<string, {
      count: number;
      confidenceSum: number;
      confidenceCount: number;
      renderCounts: Map<string, number>;
    }>();
    for (const row of result.rows) {
      const domain = normalizeHostname(row.domain);
      if (!domain) continue;
      const group = groups.get(domain) ?? { count: 0, confidenceSum: 0, confidenceCount: 0, renderCounts: new Map<string, number>() };
      const count = aggregateNumber(row.count);
      const renderType = publicRenderType(row.render_type);
      group.count += count;
      group.confidenceSum += aggregateNumber(row.confidence_sum);
      group.confidenceCount += aggregateNumber(row.confidence_count);
      group.renderCounts.set(renderType, (group.renderCounts.get(renderType) ?? 0) + count);
      groups.set(domain, group);
    }
    return Array.from(groups, ([domain, group]) => ({
      domain,
      count: group.count,
      avg_confidence: group.confidenceCount ? group.confidenceSum / group.confidenceCount : 0,
      most_common_type: Array.from(group.renderCounts)
        .sort(([a, aCount], [b, bCount]) => bCount - aCount || a.localeCompare(b))[0]?.[0] ?? 'Other',
    }))
      .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain))
      .slice(0, limit);
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

export async function getLatestAnalysisTime() {
  try {
    const result = await sql`
      SELECT timestamp FROM analyses
      ORDER BY timestamp DESC
      LIMIT 1;
    `;
    return result.rows[0]?.timestamp || null;
  } catch (error) {
    console.error("Database query error:", error);
    return null;
  }
}

export async function getAnalysesByDate(days: number = 30) {
  try {
    // Calculate date threshold in JavaScript to avoid SQL interpolation issues
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const result = await sql`
      SELECT
        DATE(timestamp) as date,
        COUNT(*) as count,
        COUNT(CASE WHEN render_type LIKE '%SSR%' THEN 1 END) as ssr_count,
        COUNT(CASE WHEN render_type LIKE '%CSR%' THEN 1 END) as csr_count,
        COUNT(CASE WHEN render_type LIKE '%Hybrid%' THEN 1 END) as hybrid_count
      FROM analyses
      WHERE timestamp >= ${dateThreshold.toISOString()}
      GROUP BY DATE(timestamp)
      ORDER BY date DESC;
    `;
    return result.rows;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

export async function getContentComparisonStats() {
  try {
    const result = await sql`
      WITH safe_analyses AS (
        SELECT (SELECT jsonb_object_agg(key, value)
          FROM jsonb_each(CASE WHEN jsonb_typeof(performance_metrics::jsonb) = 'object' THEN performance_metrics::jsonb ELSE '{}'::jsonb END)
          WHERE CASE WHEN jsonb_typeof(value) = 'number'
            THEN value::numeric BETWEEN 0 AND 9007199254740991
            ELSE false END) AS performance_metrics
        FROM analyses
      )
      SELECT
        AVG((performance_metrics::jsonb->>'contentRatio')::numeric) as avg_content_ratio,
        AVG((performance_metrics::jsonb->>'hybridScore')::numeric) as avg_hybrid_score,
        COUNT(CASE WHEN (performance_metrics::jsonb->>'contentRatio')::numeric < 0.2 THEN 1 END) as low_ratio_count,
        COUNT(CASE WHEN (performance_metrics::jsonb->>'contentRatio')::numeric > 0.7 THEN 1 END) as high_ratio_count,
        COUNT(CASE WHEN (performance_metrics::jsonb->>'contentRatio')::numeric BETWEEN 0.2 AND 0.7 THEN 1 END) as mid_ratio_count,
        COUNT(CASE WHEN (performance_metrics::jsonb->>'hybridScore')::numeric > 0 THEN 1 END) as hybrid_detected_count,
        COUNT(*) as total_with_metrics
      FROM safe_analyses
      WHERE performance_metrics::jsonb->>'contentRatio' IS NOT NULL;
    `;
    return result.rows[0];
  } catch (error) {
    console.error("Database query error:", error);
    // Return empty stats if query fails (e.g., no data with new metrics yet)
    return {
      avg_content_ratio: null,
      avg_hybrid_score: null,
      low_ratio_count: 0,
      high_ratio_count: 0,
      mid_ratio_count: 0,
      hybrid_detected_count: 0,
      total_with_metrics: 0,
    };
  }
}

// Phase 1: Core Web Vitals by Render Type
export async function getCoreWebVitalsByRenderType() {
  try {
    const result = await sql`
      WITH safe_analyses AS (
        SELECT render_type, (SELECT jsonb_object_agg(key, value)
          FROM jsonb_each(CASE WHEN jsonb_typeof(core_web_vitals) = 'object' THEN core_web_vitals ELSE '{}'::jsonb END)
          WHERE CASE WHEN jsonb_typeof(value) = 'number'
            THEN value::numeric BETWEEN 0 AND 9007199254740991
            ELSE false END) AS core_web_vitals
        FROM analyses
      )
      SELECT
        CASE
          WHEN render_type ILIKE '%SSR%' THEN 'SSR'
          WHEN render_type ILIKE '%CSR%' THEN 'CSR'
          WHEN render_type ILIKE '%Hybrid%' OR render_type ILIKE '%Mixed%' THEN 'Hybrid'
          ELSE 'Other'
        END as render_category,
        COUNT(*) as sample_count,
        -- LCP (Largest Contentful Paint)
        ROUND(AVG((core_web_vitals->>'lcp')::numeric)) as avg_lcp,
        COUNT(CASE WHEN (core_web_vitals->>'lcp')::numeric < 2500 THEN 1 END) as lcp_good,
        -- CLS (Cumulative Layout Shift)
        ROUND(AVG((core_web_vitals->>'cls')::numeric), 3) as avg_cls,
        COUNT(CASE WHEN (core_web_vitals->>'cls')::numeric < 0.1 THEN 1 END) as cls_good,
        -- INP (Interaction to Next Paint) — the current interactivity vital
        ROUND(AVG((core_web_vitals->>'inp')::numeric)) as avg_inp,
        COUNT(CASE WHEN (core_web_vitals->>'inp')::numeric < 200 THEN 1 END) as inp_good,
        -- FID (First Input Delay) — legacy rows only, kept so history stays readable
        ROUND(AVG((core_web_vitals->>'fid')::numeric)) as avg_fid,
        COUNT(CASE WHEN (core_web_vitals->>'fid')::numeric < 100 THEN 1 END) as fid_good,
        -- TTFB (Time to First Byte)
        ROUND(AVG((core_web_vitals->>'ttfb')::numeric)) as avg_ttfb,
        COUNT(CASE WHEN (core_web_vitals->>'ttfb')::numeric < 800 THEN 1 END) as ttfb_good,
        -- Overall pass rate
        ROUND(
          (COUNT(CASE WHEN 
            (core_web_vitals->>'lcp')::numeric < 2500 AND
            (core_web_vitals->>'cls')::numeric < 0.1
          THEN 1 END)::numeric / NULLIF(COUNT(*), 0)) * 100
        ) as pass_rate
      FROM safe_analyses
      -- jsonb_typeof excludes legacy rows storing JSON null (pre-v1.5.1 insert bug);
      -- the metric check keeps sample_count honest for all-null objects
      WHERE jsonb_typeof(core_web_vitals) = 'object'
        AND (
          core_web_vitals->>'lcp' IS NOT NULL
          OR core_web_vitals->>'cls' IS NOT NULL
          OR core_web_vitals->>'ttfb' IS NOT NULL
        )
      GROUP BY render_category
      ORDER BY sample_count DESC;
    `;
    return result.rows;
  } catch (error) {
    console.error("getCoreWebVitalsByRenderType error:", error);
    return [];
  }
}

// Phase 1: Page Type Distribution
export async function getPageTypeDistribution() {
  try {
    const result = await sql`
      WITH categorized_analyses AS (
        SELECT CASE WHEN page_type IN (SELECT jsonb_array_elements_text(${JSON.stringify(PAGE_TYPES)}::jsonb))
          THEN page_type ELSE 'other' END AS page_type, render_type
        FROM analyses
        WHERE page_type IS NOT NULL
      )
      SELECT
        page_type,
        COUNT(*) as total_count,
        COUNT(CASE WHEN render_type ILIKE '%SSR%' THEN 1 END) as ssr_count,
        COUNT(CASE WHEN render_type ILIKE '%CSR%' THEN 1 END) as csr_count,
        COUNT(CASE WHEN render_type ILIKE '%Hybrid%' OR render_type ILIKE '%Mixed%' THEN 1 END) as hybrid_count,
        ROUND((COUNT(CASE WHEN render_type ILIKE '%SSR%' THEN 1 END)::numeric / NULLIF(COUNT(*), 0)) * 100) as ssr_percentage,
        ROUND((COUNT(CASE WHEN render_type ILIKE '%CSR%' THEN 1 END)::numeric / NULLIF(COUNT(*), 0)) * 100) as csr_percentage,
        ROUND((COUNT(CASE WHEN render_type ILIKE '%Hybrid%' OR render_type ILIKE '%Mixed%' THEN 1 END)::numeric / NULLIF(COUNT(*), 0)) * 100) as hybrid_percentage
      FROM categorized_analyses
      GROUP BY page_type
      ORDER BY total_count DESC
      LIMIT 10;
    `;
    return result.rows.map((row) => ({
      page_type: PAGE_TYPES.includes(row.page_type) ? row.page_type : "other",
      total_count: aggregateNumber(row.total_count),
      ssr_count: aggregateNumber(row.ssr_count),
      csr_count: aggregateNumber(row.csr_count),
      hybrid_count: aggregateNumber(row.hybrid_count),
      ssr_percentage: aggregateNumber(row.ssr_percentage),
      csr_percentage: aggregateNumber(row.csr_percentage),
      hybrid_percentage: aggregateNumber(row.hybrid_percentage),
    }));
  } catch (error) {
    console.error("getPageTypeDistribution error:", error);
    return [];
  }
}

// Phase 1: Device Performance
export async function getDevicePerformance() {
  try {
    const result = await sql`
      WITH safe_analyses AS (
        SELECT device_info, (SELECT jsonb_object_agg(key, value)
          FROM jsonb_each(CASE WHEN jsonb_typeof(core_web_vitals) = 'object' THEN core_web_vitals ELSE '{}'::jsonb END)
          WHERE CASE WHEN jsonb_typeof(value) = 'number'
            THEN value::numeric BETWEEN 0 AND 9007199254740991
            ELSE false END) AS core_web_vitals
        FROM analyses
      )
      SELECT
        CASE WHEN device_info->>'deviceType' IN (SELECT jsonb_array_elements_text(${JSON.stringify(DEVICE_TYPES)}::jsonb))
          THEN device_info->>'deviceType' ELSE 'unknown' END AS device_type,
        CASE WHEN device_info->>'effectiveType' IN (SELECT jsonb_array_elements_text(${JSON.stringify(EFFECTIVE_TYPES)}::jsonb))
          THEN device_info->>'effectiveType'
          WHEN device_info->'connection'->>'effectiveType' IN (SELECT jsonb_array_elements_text(${JSON.stringify(EFFECTIVE_TYPES)}::jsonb))
          THEN device_info->'connection'->>'effectiveType' ELSE 'unknown' END AS connection_type,
        COUNT(*) as sample_count,
        ROUND(AVG((core_web_vitals->>'lcp')::numeric)) as avg_lcp,
        ROUND(AVG((core_web_vitals->>'cls')::numeric), 3) as avg_cls,
        ROUND(AVG((core_web_vitals->>'ttfb')::numeric)) as avg_ttfb,
        ROUND(
          (COUNT(CASE WHEN 
            (core_web_vitals->>'lcp')::numeric < 2500 AND
            (core_web_vitals->>'cls')::numeric < 0.1
          THEN 1 END)::numeric / NULLIF(COUNT(*), 0)) * 100
        ) as pass_rate
      FROM safe_analyses
      WHERE device_info IS NOT NULL AND core_web_vitals IS NOT NULL
      GROUP BY device_type, connection_type
      HAVING COUNT(*) >= 5
      ORDER BY sample_count DESC
      LIMIT 20;
    `;
    return result.rows.map((row) => ({
      device_type: DEVICE_TYPES.includes(row.device_type)
        ? row.device_type
        : "unknown",
      connection_type: EFFECTIVE_TYPES.includes(row.connection_type)
        ? row.connection_type
        : "unknown",
      sample_count: aggregateNumber(row.sample_count),
      avg_lcp: row.avg_lcp == null ? null : aggregateNumber(row.avg_lcp),
      avg_cls: row.avg_cls == null ? null : aggregateNumber(row.avg_cls),
      avg_ttfb: row.avg_ttfb == null ? null : aggregateNumber(row.avg_ttfb),
      pass_rate: aggregateNumber(row.pass_rate),
    }));
  } catch (error) {
    console.error("getDevicePerformance error:", error);
    return [];
  }
}

// Phase 1: Device Type Summary
export async function getDeviceTypeSummary() {
  try {
    const result = await sql`
      SELECT
        CASE WHEN device_info->>'deviceType' IN (SELECT jsonb_array_elements_text(${JSON.stringify(DEVICE_TYPES)}::jsonb))
          THEN device_info->>'deviceType' ELSE 'unknown' END AS device_type,
        COUNT(*) as count,
        ROUND((COUNT(*)::numeric / (SELECT COUNT(*) FROM analyses WHERE device_info IS NOT NULL)) * 100) as percentage
      FROM analyses
      WHERE device_info IS NOT NULL
      GROUP BY device_type
      ORDER BY count DESC;
    `;
    return result.rows.map((row) => ({
      device_type: DEVICE_TYPES.includes(row.device_type)
        ? row.device_type
        : "unknown",
      count: aggregateNumber(row.count),
      percentage: aggregateNumber(row.percentage),
    }));
  } catch (error) {
    console.error("getDeviceTypeSummary error:", error);
    return [];
  }
}
export async function deleteAnalysis(id: number) {
  try {
    const result = await sql`
      DELETE FROM analyses
      WHERE id = ${id}
      RETURNING id;
    `;
    return result.rows[0];
  } catch (error) {
    console.error("Database deletion error:", error);
    throw error;
  }
}
