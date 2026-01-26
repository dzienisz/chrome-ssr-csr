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
  };
  indicators: string[];
  extension_version: string;
  user_agent?: string;
}

export async function insertAnalysis(data: AnalysisRecord) {
  try {
    const result = await sql`
      INSERT INTO analyses (
        url, domain, render_type, confidence, frameworks,
        performance_metrics, indicators, extension_version, user_agent
      ) VALUES (
        ${data.url},
        ${data.domain},
        ${data.render_type},
        ${data.confidence},
        ${JSON.stringify(data.frameworks)},
        ${JSON.stringify(data.performance_metrics)},
        ${JSON.stringify(data.indicators)},
        ${data.extension_version},
        ${data.user_agent || null}
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
        COUNT(CASE WHEN render_type LIKE '%SSR%' THEN 1 END) as ssr_count,
        COUNT(CASE WHEN render_type LIKE '%CSR%' THEN 1 END) as csr_count,
        COUNT(CASE WHEN render_type LIKE '%Hybrid%' THEN 1 END) as hybrid_count,
        AVG(confidence) as avg_confidence
      FROM analyses;
    `;
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
