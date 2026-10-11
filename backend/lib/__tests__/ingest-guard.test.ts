import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "@vercel/postgres";
import {
  checkIngest,
  clientIp,
  INGEST_MAX_PER_WINDOW,
  INGEST_WINDOW_SECONDS,
} from "../ingest-guard";

const mockSql = sql as unknown as ReturnType<typeof vi.fn>;
const secret = "test-secret";
const ip = "203.0.113.42";

function request(headers: Record<string, string> = {}, requestIp?: string) {
  return Object.assign(
    new Request("https://backend.example.com/api/analyze", { headers }),
    requestIp === undefined ? {} : { ip: requestIp },
  );
}

function queryText(call: unknown[]) {
  return (call[0] as TemplateStringsArray).join("");
}

function insertCalls() {
  return mockSql.mock.calls.filter((call: unknown[]) =>
    queryText(call).includes("INSERT INTO ingest_guard"),
  );
}

function returnHits(hits: number[]) {
  let index = 0;
  mockSql.mockImplementation(async (strings: TemplateStringsArray) => {
    if (strings.join("").includes("INSERT INTO ingest_guard")) {
      return { rows: [{ hits: hits[index++] }] };
    }
    return { rows: [] };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  returnHits([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("clientIp", () => {
  it("prefers request.ip", () => {
    expect(
      clientIp(request({ "x-forwarded-for": "198.51.100.1" }, ip)),
    ).toBe(ip);
  });

  it("uses the trimmed first x-forwarded-for entry", () => {
    expect(
      clientIp(request({ "x-forwarded-for": " 198.51.100.2 , 198.51.100.3" })),
    ).toBe("198.51.100.2");
  });

  it("falls back to x-real-ip", () => {
    expect(clientIp(request({ "x-real-ip": " 198.51.100.4 " }))).toBe(
      "198.51.100.4",
    );
  });

  it("returns null when no client IP is available", () => {
    expect(clientIp(request())).toBeNull();
  });
});

describe("checkIngest", () => {
  it("fails open without a secret, warns once, and does not use SQL", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(
      checkIngest(request({}, ip), "example.com", { INGEST_HASH_SECRET: "" }),
    ).resolves.toEqual({ decision: "accept" });
    await expect(
      checkIngest(request({}, ip), "example.com", { INGEST_HASH_SECRET: "" }),
    ).resolves.toEqual({ decision: "accept" });

    expect(warn).toHaveBeenCalledOnce();
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("fails open without an IP and does not use SQL", async () => {
    await expect(
      checkIngest(request(), "example.com", { INGEST_HASH_SECRET: secret }),
    ).resolves.toEqual({ decision: "accept" });
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("retries table creation after a create failure", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    mockSql.mockRejectedValueOnce(new Error("create failed"));

    await expect(
      checkIngest(request({}, ip), "example.com", { INGEST_HASH_SECRET: secret }),
    ).resolves.toEqual({ decision: "accept" });
    expect(error).toHaveBeenCalledOnce();

    returnHits([1, 1]);
    await expect(
      checkIngest(request({}, ip), "example.com", { INGEST_HASH_SECRET: secret }),
    ).resolves.toEqual({ decision: "accept" });

    const createCalls = mockSql.mock.calls.filter((call: unknown[]) =>
      queryText(call).includes("CREATE TABLE IF NOT EXISTS ingest_guard"),
    );
    expect(createCalls).toHaveLength(2);
  });

  it("allows the thirtieth request and limits the thirty-first without deduping", async () => {
    expect(INGEST_MAX_PER_WINDOW).toBe(30);
    expect(INGEST_WINDOW_SECONDS).toBe(600);
    returnHits([30, 1]);
    await expect(
      checkIngest(
        request({}, ip),
        "example.com",
        { INGEST_HASH_SECRET: secret },
        100_000,
      ),
    ).resolves.toEqual({ decision: "accept" });

    mockSql.mockClear();
    returnHits([31]);
    await expect(
      checkIngest(
        request({}, ip),
        "example.com",
        { INGEST_HASH_SECRET: secret },
        100_000,
      ),
    ).resolves.toEqual({ decision: "rate-limited", retryAfter: 500 });
    expect(insertCalls()).toHaveLength(1);
    expect(insertCalls()[0][1]).toMatch(/^rate:[a-f0-9]{64}$/);
  });

  it("marks repeats as duplicates and accepts the first domain hit", async () => {
    returnHits([1, 2]);
    await expect(
      checkIngest(request({}, ip), "example.com", { INGEST_HASH_SECRET: secret }),
    ).resolves.toEqual({ decision: "duplicate" });

    mockSql.mockClear();
    returnHits([1, 1]);
    await expect(
      checkIngest(request({}, ip), "example.com", { INGEST_HASH_SECRET: secret }),
    ).resolves.toEqual({ decision: "accept" });
  });

  it("uses stable 64-hex HMAC keys without sending the raw IP to SQL", async () => {
    returnHits([1, 1, 1, 1, 1, 1]);
    const input = request({ "x-real-ip": ip });
    const firstNow = 100_000;
    const secondNow = 200_000;

    await checkIngest(input, "example.com", { INGEST_HASH_SECRET: secret }, firstNow);
    await checkIngest(input, "example.com", { INGEST_HASH_SECRET: secret }, secondNow);
    await checkIngest(input, "example.com", { INGEST_HASH_SECRET: "other-secret" }, firstNow);

    const calls = insertCalls();
    const keys = calls.map((call: unknown[]) => call[1]);
    const rateKeys = [keys[0], keys[2], keys[4]];
    const duplicateKeys = [keys[1], keys[3], keys[5]];

    expect(rateKeys[0]).toMatch(/^rate:[a-f0-9]{64}$/);
    expect(duplicateKeys[0]).toMatch(/^dup:[a-f0-9]{64}:example\.com$/);
    expect(rateKeys[0]).toBe(rateKeys[1]);
    expect(rateKeys[0]).not.toBe(rateKeys[2]);
    expect(duplicateKeys[0]).toBe(duplicateKeys[1]);
    expect(duplicateKeys[0]).not.toBe(duplicateKeys[2]);
    expect(JSON.stringify(calls)).not.toContain(ip);
    expect(calls[0][2]).toBe(calls[2][2]);
    expect(new Date(calls[0][2] as string).toISOString()).toBe(
      new Date(Math.floor(firstNow / 600_000) * 600_000).toISOString(),
    );
  });

  it("fails open and logs no IP or hash when SQL throws", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    mockSql.mockRejectedValue(new Error("database unavailable"));

    await expect(
      checkIngest(request({}, ip), "example.com", { INGEST_HASH_SECRET: secret }),
    ).resolves.toEqual({ decision: "accept" });
    expect(error).toHaveBeenCalledOnce();
    expect(JSON.stringify(error.mock.calls)).not.toContain(ip);
  });
});
