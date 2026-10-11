import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "./lib/admin-auth";

function withAdminHeaders(response: NextResponse) {
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function middleware(request: NextRequest) {
  const authorization = await isAdminAuthorized(
    request.headers.get("authorization"),
  );

  if (authorization === "disabled") {
    return withAdminHeaders(
      NextResponse.json(
        { success: false, error: "Admin not configured" },
        { status: 503 },
      ),
    );
  }

  if (authorization === "unauthorized") {
    return withAdminHeaders(
      NextResponse.json(
        { success: false, error: "Unauthorized" },
        {
          status: 401,
          headers: {
            "WWW-Authenticate": 'Basic realm="SSR/CSR admin", charset="UTF-8"',
          },
        },
      ),
    );
  }

  return withAdminHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
