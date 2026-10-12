#!/usr/bin/env node
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const LAB_DIR = path.join(SCRIPT_DIR, "fixtures", "lab");
const PROBE = path.join(SCRIPT_DIR, "..", "src", "probe.js");
const BUNDLE = await readFile(path.join(SCRIPT_DIR, "..", "src", "analyzer-bundle.js"), "utf8");
const apps = JSON.parse(await readFile(path.join(LAB_DIR, "manifest.json"), "utf8"));
const updateBaseline = process.argv.includes("--update-baseline");
const baselinePath = path.join(LAB_DIR, "baseline.json");
const fixtures = new Map();

for (const app of apps) {
  fixtures.set(app.name, {
    raw: await readFile(path.join(LAB_DIR, app.name, "raw.html"), "utf8"),
    rendered: await readFile(path.join(LAB_DIR, app.name, "rendered.html"), "utf8"),
  });
}

function bucket(renderType) {
  if (renderType === "Cannot assess") return "UNKNOWN";
  if (/hybrid|mixed/i.test(renderType)) return "HYBRID";
  if (/ssr/i.test(renderType)) return "SSR";
  if (/csr/i.test(renderType)) return "CSR";
  return "ERROR";
}

function htmlWithReplay(raw, name) {
  const tag = `<script src="/lab/${encodeURIComponent(name)}/__replay.js"></script>`;
  return /<\/body\s*>/i.test(raw)
    ? raw.replace(/<\/body\s*>/i, `${tag}$&`)
    : `${raw}${tag}`;
}

function replayScript(name) {
  const snapshotUrl = JSON.stringify(`/lab/${encodeURIComponent(name)}/rendered.html`);
  return `setTimeout(async () => {
  try {
    const response = await fetch(${snapshotUrl});
    if (!response.ok) throw new Error("rendered snapshot unavailable");
    const parsed = new DOMParser().parseFromString(await response.text(), "text/html");
    const html = document.documentElement;
    for (const attribute of [...html.attributes]) html.removeAttribute(attribute.name);
    for (const attribute of [...parsed.documentElement.attributes]) {
      html.setAttribute(attribute.name, attribute.value);
    }
    document.body.replaceWith(document.importNode(parsed.body, true));
  } catch (error) {
    console.error("Lab replay failed", error);
  }
}, 300);`;
}

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url || "/", "http://localhost").pathname;
  const match = /^\/lab\/([^/]+)(?:\/(.*))?\/?$/.exec(pathname);
  const name = match?.[1];
  const route = match?.[2] ?? "";
  const fixture = fixtures.get(name);

  if (!fixture) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("");
    return;
  }

  if (route === "") {
    response.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    });
    response.end(htmlWithReplay(fixture.raw, name));
    return;
  }

  if (route === "__replay.js") {
    response.writeHead(200, {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "no-store",
    });
    response.end(replayScript(name));
    return;
  }

  if (route === "rendered.html") {
    response.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    });
    response.end(fixture.rendered);
    return;
  }

  response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  response.end("");
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const rows = [];

try {
  browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  );

  for (const app of apps) {
    const context = await browser.newContext({
      bypassCSP: true,
      viewport: { width: 1440, height: 900 },
    });
    await context.addInitScript({ path: PROBE });
    const page = await context.newPage();
    await context.route("**/*", (route) => {
      let requestOrigin;
      try {
        requestOrigin = new URL(route.request().url()).origin;
      } catch {
        requestOrigin = "";
      }
      return requestOrigin === origin
        ? route.continue()
        : route.fulfill({ status: 404, contentType: "text/plain", body: "" });
    });

    let result;
    try {
      await page.goto(`${origin}/lab/${encodeURIComponent(app.name)}/`, {
        waitUntil: "load",
        timeout: 30000,
      });
      await page.waitForTimeout(1500);
      await page.addScriptTag({ content: BUNDLE });
      result = await page.evaluate(() => window.pageAnalyzer());
      const renderType = result.renderType ?? "ERROR";
      rows.push({
        app,
        expected: app.origin.article === "S" ? "SSR" : "CSR",
        bucket: bucket(renderType),
        renderType,
        confidence: result.confidence ?? null,
        ratio: result.detailedInfo?.contentComparison?.ratio ?? null,
        error: null,
      });
    } catch (error) {
      rows.push({
        app,
        expected: app.origin.article === "S" ? "SSR" : "CSR",
        bucket: "ERROR",
        renderType: "ERROR",
        confidence: null,
        ratio: null,
        error: String(error).slice(0, 200),
      });
    } finally {
      await context.close();
    }
  }
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

const accurate = rows.filter((row) => row.bucket === row.expected).length;
console.log("| name | framework | mode | expected | v4 verdict (confidence) | content ratio | sections | result |");
console.log("| --- | --- | --- | --- | --- | ---: | --- | --- |");
for (const row of rows) {
  const { app } = row;
  const ratio = row.ratio === null ? "—" : row.ratio.toFixed(3);
  const confidence = row.confidence === null ? "—" : row.confidence;
  const sections =
    app.origin.article === "S" && ["C", "D"].includes(app.origin.comments) ? "JS" : "—";
  const result = row.bucket === row.expected ? "PASS" : "FAIL";
  console.log(
    `| ${app.name} | ${app.framework} | ${app.mode} | ${row.expected} | ` +
      `${row.renderType} (${confidence}) | ${ratio} | ${sections} | ${result} |`,
  );
  if (row.error) console.log(`  ${app.name}: ${row.error}`);
}
console.log(`v4 accuracy ${accurate}/${apps.length}`);

if (updateBaseline) {
  const baseline = Object.fromEntries(
    rows.map((row) => [row.app.name, { bucket: row.bucket, renderType: row.renderType }]),
  );
  await writeFile(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
  console.log(`Updated baseline: ${baselinePath}`);
} else {
  let baseline = {};
  try {
    baseline = JSON.parse(await readFile(baselinePath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const changes = rows.filter((row) => baseline[row.app.name]?.bucket !== row.bucket);
  for (const row of changes) {
    const previous = baseline[row.app.name]?.bucket ?? "<missing>";
    console.log(`Baseline change ${row.app.name}: ${previous} -> ${row.bucket}`);
  }
  if (changes.length) process.exitCode = 1;
}
