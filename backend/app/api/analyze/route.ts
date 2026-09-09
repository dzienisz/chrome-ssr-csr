import { NextRequest, NextResponse } from "next/server";
import { insertAnalysis } from "@/lib/db";
import { verifyApiKey } from "@/lib/auth";
import { getCorsHeaders, corsOptionsResponse } from "@/lib/cors";
import {
  parseTelemetry,
  readTelemetryBody,
  TelemetryError,
} from "@/lib/telemetry-schema";

const corsHeaders = getCorsHeaders(["POST", "OPTIONS"]);

export async function POST(request: NextRequest) {
  // Verify API key
  if (!verifyApiKey(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401, headers: corsHeaders },
    );
  }

  try {
    const analysisRecord = parseTelemetry(
      await readTelemetryBody(request),
      request.geo?.country || request.headers.get("x-vercel-ip-country"),
    );

    // Insert into database
    const result = await insertAnalysis(analysisRecord);
    return NextResponse.json(
      { success: true, id: result.id },
      { headers: corsHeaders },
    );
  } catch (error) {
    const status = error instanceof TelemetryError ? error.status : 500;
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof TelemetryError
            ? error.message
            : "Internal server error",
      },
      { status, headers: corsHeaders },
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return corsOptionsResponse(["POST", "OPTIONS"]);
}
