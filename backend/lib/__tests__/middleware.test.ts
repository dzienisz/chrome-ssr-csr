import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { middleware } from "../../middleware";

const request = (authorization?: string) =>
  new NextRequest("http://localhost/admin", {
    headers: authorization ? { authorization } : undefined,
  });

const basicAuthorization = (user: string, password: string) =>
  `Basic ${btoa(`${user}:${password}`)}`;

const expectAdminHeaders = (response: Response) => {
  expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  expect(response.headers.get("Cache-Control")).toBe("no-store");
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("admin middleware", () => {
  it("returns 503 when admin is disabled", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");
    const response = await middleware(request());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      success: false,
      error: "Admin not configured",
    });
    expectAdminHeaders(response);
  });

  it("returns 401 with a Basic challenge when credentials are missing", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "secret");
    const response = await middleware(request());

    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe(
      'Basic realm="SSR/CSR admin", charset="UTF-8"',
    );
    expectAdminHeaders(response);
  });

  it("passes through authorized requests", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "secret");
    vi.stubEnv("ADMIN_USER", "admin");
    const response = await middleware(
      request(basicAuthorization("admin", "secret")),
    );

    expect(response.status).toBe(200);
    expectAdminHeaders(response);
  });
});
