/**
 * Upload a release zip to Microsoft Edge Add-ons and submit it for review,
 * through the Edge Add-ons Update REST API v1.1:
 * https://learn.microsoft.com/microsoft-edge/extensions/update/api/using-addons-api
 *
 *   EDGE_PRODUCT_ID=… EDGE_CLIENT_ID=… EDGE_API_KEY=… \
 *     node scripts/publish-edge.mjs <package.zip> ["notes for certification"]
 *
 * The API can only update a product that already exists: the first version
 * has to be submitted by hand in Partner Center (see edge-listing.md).
 * The Chrome zip is uploaded unchanged; Edge runs Chrome MV3 packages as-is.
 */
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const API_ROOT = "https://api.addons.microsoftedge.microsoft.com";

const sleepMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** The Location header carries the operation id, bare or as a URL path. */
export function operationIdFrom(location) {
  const id = String(location || "").trim().replace(/\/+$/, "").split("/").pop();
  if (!id) throw new Error("Edge Add-ons API returned no operation id (Location header missing)");
  return id;
}

function describeFailure(step, body) {
  const errors = Array.isArray(body?.errors)
    ? body.errors.map((e) => (typeof e === "string" ? e : e?.message || JSON.stringify(e)))
    : [];
  const code = body?.errorCode ? ` [${body.errorCode}]` : "";
  return [`Edge ${step} failed${code}: ${body?.message || "no message"}`, ...errors].join("\n  ");
}

async function expectAccepted(response, step) {
  if (response.status === 202) return operationIdFrom(response.headers.get("location"));
  const text = await response.text().catch(() => "");
  throw new Error(`Edge ${step} request returned HTTP ${response.status}${text ? `: ${text}` : ""}`);
}

async function request(fetchImpl, url, init, { step, timeoutMs }) {
  try {
    return await fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    if (error?.name === "TimeoutError") {
      throw new Error(`Edge ${step} request timed out after ${timeoutMs / 1000}s`);
    }
    throw error;
  }
}

async function poll({ url, headers, step, fetchImpl, sleep, intervalMs, maxPolls, timeoutMs }) {
  for (let attempt = 1; attempt <= maxPolls; attempt++) {
    const response = await request(fetchImpl, url, { headers }, { step, timeoutMs });
    if (!response.ok) {
      throw new Error(`Edge ${step} status check returned HTTP ${response.status}`);
    }
    const body = await response.json();
    if (body.status === "Succeeded") return body;
    if (body.status === "Failed") throw new Error(describeFailure(step, body));
    await sleep(intervalMs);
  }
  throw new Error(`Edge ${step} still in progress after ${maxPolls} checks`);
}

export async function publishToEdge({
  productId,
  clientId,
  apiKey,
  zip,
  notes = "",
  fetchImpl = fetch,
  sleep = sleepMs,
  intervalMs = 5000,
  maxPolls = 60,
  timeoutMs = 60000,
  log = console.log,
}) {
  if (!productId || !clientId || !apiKey) {
    throw new Error("EDGE_PRODUCT_ID, EDGE_CLIENT_ID and EDGE_API_KEY are all required");
  }
  const auth = { Authorization: `ApiKey ${apiKey}`, "X-ClientID": clientId };
  const product = `${API_ROOT}/v1/products/${encodeURIComponent(productId)}`;
  const pollOptions = { headers: auth, fetchImpl, sleep, intervalMs, maxPolls, timeoutMs };

  const uploadOperation = await expectAccepted(
    await request(
      fetchImpl,
      `${product}/submissions/draft/package`,
      { method: "POST", headers: { ...auth, "Content-Type": "application/zip" }, body: zip },
      { step: "upload", timeoutMs },
    ),
    "upload",
  );
  log(`Edge: package uploaded, validating (operation ${uploadOperation})`);
  await poll({
    ...pollOptions,
    url: `${product}/submissions/draft/package/operations/${uploadOperation}`,
    step: "upload",
  });

  const publishOperation = await expectAccepted(
    await request(
      fetchImpl,
      `${product}/submissions`,
      { method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify({ notes }) },
      { step: "publish", timeoutMs },
    ),
    "publish",
  );
  log(`Edge: draft submitted (operation ${publishOperation})`);
  const result = await poll({
    ...pollOptions,
    url: `${product}/submissions/operations/${publishOperation}`,
    step: "publish",
  });
  log(`Edge: ${result.message || "submitted for certification"}`);
  return { uploadOperation, publishOperation, message: result.message };
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const [zipPath, notes] = process.argv.slice(2);
  if (!zipPath) {
    console.error('usage: node scripts/publish-edge.mjs <package.zip> ["notes"]');
    process.exit(2);
  }
  try {
    await publishToEdge({
      productId: process.env.EDGE_PRODUCT_ID,
      clientId: process.env.EDGE_CLIENT_ID,
      apiKey: process.env.EDGE_API_KEY,
      zip: await readFile(zipPath),
      notes,
    });
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
