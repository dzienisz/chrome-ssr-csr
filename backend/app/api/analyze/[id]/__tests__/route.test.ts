import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, OPTIONS } from "../route";
import { deleteAnalysis } from "@/lib/db";

vi.mock("@/lib/db", () => ({ deleteAnalysis: vi.fn() }));
vi.mock("next/cache", () => ({ unstable_noStore: vi.fn() }));
afterEach(() => vi.unstubAllEnvs());

describe("disabled deletion", () => {
  for (const key of ["", "synthetic-key"]) {
    for (const id of ["1", "invalid"]) {
      for (const headers of [
        {},
        { referer: "https://example.test/dashboard" },
        { referer: "https://example.test.evil.test/" },
        { "x-api-key": "synthetic-key" },
      ]) {
        it(`denies ${id} with key ${key} and ${JSON.stringify(headers)}`, async () => {
          vi.stubEnv("API_SECRET_KEY", key);
          vi.mocked(deleteAnalysis).mockResolvedValue({ id: 1 });
          const response = await DELETE(
            new NextRequest("https://example.test/api/analyze/" + id, {
              method: "DELETE",
              headers: headers as Record<string, string>,
            }),
            { params: { id } },
          );
          expect(response.status).toBe(403);
          expect(await response.json()).toEqual({
            success: false,
            error: "Analysis deletion is disabled",
          });
          expect(deleteAnalysis).not.toHaveBeenCalled();
        });
      }
    }
  }
  it("does not advertise DELETE", async () => {
    expect(
      (await OPTIONS()).headers.get("Access-Control-Allow-Methods"),
    ).not.toContain("DELETE");
  });
});
