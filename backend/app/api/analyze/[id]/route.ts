import { NextRequest, NextResponse } from "next/server";
import { getCorsHeaders, corsOptionsResponse } from "@/lib/cors";

const corsHeaders = getCorsHeaders(["OPTIONS"]);

export async function DELETE(
  _request: NextRequest,
  _context: { params: { id: string } },
) {
  return NextResponse.json(
    { success: false, error: "Analysis deletion is disabled" },
    { status: 403, headers: corsHeaders },
  );
}

export async function OPTIONS() {
  return corsOptionsResponse(["OPTIONS"]);
}
