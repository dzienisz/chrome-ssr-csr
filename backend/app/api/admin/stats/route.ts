import { NextRequest } from "next/server";
import { handleStats } from "@/lib/stats-handler";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  return handleStats(request, { admin: true });
}
