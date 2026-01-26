import { NextRequest, NextResponse } from 'next/server';
import { insertAnalysis } from '@/lib/db';
import { verifyApiKey } from '@/lib/auth';

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
};

export async function POST(request: NextRequest) {
  // Verify API key
  if (!verifyApiKey(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    const data = await request.json();

    // Validate required fields
    if (!data.url || !data.domain || !data.renderType || !data.confidence) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate data types
    if (typeof data.confidence !== 'number' || data.confidence < 0 || data.confidence > 100) {
      return NextResponse.json(
        { error: 'Invalid confidence value' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Prepare data for insertion
    const analysisRecord = {
      url: data.url.substring(0, 500), // Limit URL length
      domain: data.domain.substring(0, 255),
      render_type: data.renderType,
      confidence: data.confidence,
      frameworks: Array.isArray(data.frameworks) ? data.frameworks : [],
      performance_metrics: {
        domReady: data.performanceMetrics?.domReady,
        fcp: data.performanceMetrics?.fcp,
      },
      indicators: Array.isArray(data.indicators) ? data.indicators.slice(0, 20) : [],
      extension_version: data.version || 'unknown',
      user_agent: request.headers.get('user-agent') || undefined,
    };

    // Insert into database
    const result = await insertAnalysis(analysisRecord);

    return NextResponse.json({
      success: true,
      id: result.id,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Analysis submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    },
  });
}
