import { sql } from "@vercel/postgres";

export const INGEST_WINDOW_SECONDS = 600;
export const INGEST_MAX_PER_WINDOW = 30;

export type IngestDecision =
  | { decision: "accept" }
  | { decision: "duplicate" }
  | { decision: "rate-limited"; retryAfter: number };

type IngestEnvironment = {
  INGEST_HASH_SECRET?: string;
};

let tableReady: Promise<void> | undefined;
let warnedMissingSecret = false;

export function clientIp(request: Request & { ip?: string }): string | null {
  if (request.ip) return request.ip;

  const forwardedFor = request.headers.get("x-forwarded-for");
  const forwardedIp = forwardedFor?.split(",", 1)[0].trim();
  if (forwardedIp) return forwardedIp;

  return request.headers.get("x-real-ip")?.trim() || null;
}

async function hashClientIp(ip: string, secret: string): Promise<string> {
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = new Uint8Array(
    await globalThis.crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(ip),
    ),
  );
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = sql`
      CREATE TABLE IF NOT EXISTS ingest_guard (
        key TEXT NOT NULL,
        window_start TIMESTAMPTZ NOT NULL,
        hits INTEGER NOT NULL,
        PRIMARY KEY (key, window_start)
      )
    `
      .then(() => undefined)
      .catch((error) => {
        tableReady = undefined;
        throw error;
      });
  }
  return tableReady;
}

async function upsert(key: string, windowStart: string): Promise<number> {
  const result = await sql`
    INSERT INTO ingest_guard (key, window_start, hits)
    VALUES (${key}, ${windowStart}, 1)
    ON CONFLICT (key, window_start)
    DO UPDATE SET hits = ingest_guard.hits + 1
    RETURNING hits
  `;
  return Number(result.rows[0]?.hits);
}

export async function checkIngest(
  request: Request & { ip?: string },
  domain: string,
  env: IngestEnvironment = process.env as IngestEnvironment,
  now = Date.now(),
): Promise<IngestDecision> {
  const secret = env.INGEST_HASH_SECRET;
  if (!secret) {
    if (!warnedMissingSecret) {
      console.warn(
        "INGEST_HASH_SECRET is not configured; ingest protection is disabled.",
      );
      warnedMissingSecret = true;
    }
    return { decision: "accept" };
  }

  const ip = clientIp(request);
  if (!ip) return { decision: "accept" };

  try {
    const hash = await hashClientIp(ip, secret);
    const windowMs = INGEST_WINDOW_SECONDS * 1000;
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const windowStartIso = new Date(windowStart).toISOString();

    await ensureTable();
    if (Math.random() < 0.01) {
      void sql`
        DELETE FROM ingest_guard
        WHERE window_start < now() - interval '1 day'
      `.catch(() => {});
    }

    const rateHits = await upsert(`rate:${hash}`, windowStartIso);
    if (rateHits > INGEST_MAX_PER_WINDOW) {
      return {
        decision: "rate-limited",
        retryAfter: Math.max(
          1,
          Math.ceil((windowStart + windowMs - now) / 1000),
        ),
      };
    }

    const duplicateHits = await upsert(
      `dup:${hash}:${domain}`,
      windowStartIso,
    );
    if (duplicateHits > 1) return { decision: "duplicate" };

    return { decision: "accept" };
  } catch {
    console.error("Ingest guard database error.");
    return { decision: "accept" };
  }
}
