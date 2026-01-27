import { sql } from '@vercel/postgres';

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
    // Content comparison metrics (v3.2.0+)
    contentRatio?: number;
    rawHtmlLength?: number;
    renderedLength?: number;
    hybridScore?: number;
  };
  indicators: string[];
  extension_version: string;
  user_agent?: string;
  // Phase 1 fields (v3.3.0+)
  core_web_vitals?: any;
  page_type?: string;
  device_info?: any;
}

export async function insertAnalysis(data: AnalysisRecord) {
  try {
    const result = await sql`
      INSERT INTO analyses (
        url, domain, render_type, confidence, frameworks,
        performance_metrics, indicators, extension_version, user_agent,
        core_web_vitals, page_type, device_info
      ) VALUES (
        ${data.url},
        ${data.domain},
        ${data.render_type},
        ${data.confidence},
        ${JSON.stringify(data.frameworks)},
        ${JSON.stringify(data.performance_metrics)},
        ${JSON.stringify(data.indicators)},
        ${data.extension_version},
        ${data.user_agent || null},
        ${data.core_web_vitals ? JSON.stringify(data.core_web_vitals) : null},
        ${data.page_type || null},
        ${data.device_info ? JSON.stringify(data.device_info) : null}
      )
      RETURNING id;
    `;
    return result.rows[0];
  } catch (error) {
    console.error('Database insertion error:', error);
    throw error;
  }
}

export async function getRecentAnalyses(limit: number = 100) {
  try {
    const result = await sql`
      SELECT * FROM analyses
      ORDER BY timestamp DESC
      LIMIT ${limit};
    `;
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
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
    console.log('getTotalStats result:', result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error('Database query error:', error);
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
      LATERAL jsonb_array_elements_text(frameworks::jsonb) as framework
      WHERE frameworks::jsonb != '[]'::jsonb
      GROUP BY framework
      ORDER BY count DESC
      LIMIT ${limit};
    `;
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export async function getTopDomains(limit: number = 20) {
  try {
    const result = await sql`
      SELECT
        domain,
        COUNT(*) as count,
        AVG(confidence) as avg_confidence,
        MODE() WITHIN GROUP (ORDER BY render_type) as most_common_type
      FROM analyses
      GROUP BY domain
      ORDER BY count DESC
      LIMIT ${limit};
    `;
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
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
    console.error('Database query error:', error);
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
    console.error('Database query error:', error);
    throw error;
  }
}

export async function getContentComparisonStats() {
  try {
    const result = await sql`
      SELECT
        AVG((performance_metrics::jsonb->>'contentRatio')::numeric) as avg_content_ratio,
        AVG((performance_metrics::jsonb->>'hybridScore')::numeric) as avg_hybrid_score,
        COUNT(CASE WHEN (performance_metrics::jsonb->>'contentRatio')::numeric < 0.2 THEN 1 END) as low_ratio_count,
        COUNT(CASE WHEN (performance_metrics::jsonb->>'contentRatio')::numeric > 0.7 THEN 1 END) as high_ratio_count,
        COUNT(CASE WHEN (performance_metrics::jsonb->>'contentRatio')::numeric BETWEEN 0.2 AND 0.7 THEN 1 END) as mid_ratio_count,
        COUNT(CASE WHEN (performance_metrics::jsonb->>'hybridScore')::numeric > 0 THEN 1 END) as hybrid_detected_count,
        COUNT(*) as total_with_metrics
      FROM analyses
      WHERE performance_metrics::jsonb->>'contentRatio' IS NOT NULL;
    `;
    return result.rows[0];
  } catch (error) {
    console.error('Database query error:', error);
    // Return empty stats if query fails (e.g., no data with new metrics yet)
    return {
      avg_content_ratio: null,
      avg_hybrid_score: null,
      low_ratio_count: 0,
      high_ratio_count: 0,
      mid_ratio_count: 0,
      hybrid_detected_count: 0,
      total_with_metrics: 0
    };
  }
}
