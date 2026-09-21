#!/usr/bin/env node
/**
 * Offline detection harness.
 *
 * Serves the hand-written fixtures in scripts/fixtures/pages.mjs from a local
 * HTTP server, loads each one in Chromium, injects the real
 * src/analyzer-bundle.js and grades the verdict, the delivery classification
 * and the region attribution against what the fixture declares.
 *
 * Unlike validate-detection.mjs this needs no network and never changes
 * underneath you, so it can gate a release:
 *
 *   npm run validate:local
 *
 * Requires playwright with a Chromium build. Set CHROMIUM_PATH to use a
 * browser playwright did not install itself.
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { FIXTURES } from "./fixtures/pages.mjs";

const BUNDLE = readFileSync(
  new URL("../src/analyzer-bundle.js", import.meta.url),
  "utf8",
);

/** Mirrors the bucketing in backend/lib/db.ts and validate-detection.mjs. */
function bucket(renderType) {
  if (/hybrid|mixed/i.test(renderType)) return "HYBRID";
  if (/ssr/i.test(renderType)) return "SSR";
  if (/csr/i.test(renderType)) return "CSR";
  return "ERROR";
}

const byPath = new Map(FIXTURES.map((f) => [`/${f.name}`, f]));

const server = createServer((req, res) => {
  const path = (req.url || "/").split("?")[0];
  const fixture = byPath.get(path);

  if (!fixture) {
    // Fixtures reference bundle URLs that do not need to exist; an empty 200
    // keeps the console clean without changing what the detector sees.
    res.writeHead(200, { "content-type": "application/javascript" });
    res.end("/* fixture asset */");
    return;
  }

  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    ...fixture.headers,
  });
  res.end(fixture.html);
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const origin = `http://127.0.0.1:${port}`;

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);

let failures = 0;
const rows = [];

for (const fixture of FIXTURES) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const problems = [];

  try {
    await page.goto(`${origin}/${fixture.name}`, { waitUntil: "load" });
    await page.waitForTimeout(150); // let inline scripts finish filling the DOM
    await page.addScriptTag({ content: BUNDLE });
    const result = await page.evaluate(() => window.pageAnalyzer());

    const got = bucket(result.renderType);
    if (got !== fixture.bucket) {
      problems.push(`verdict: expected ${fixture.bucket}, got ${got} (${result.renderType})`);
    }

    const deliveryMode = result.detailedInfo?.delivery?.mode;
    if (fixture.delivery && deliveryMode !== fixture.delivery) {
      problems.push(`delivery: expected ${fixture.delivery}, got ${deliveryMode}`);
    }

    if (!Array.isArray(result.signals) || result.signals.length === 0) {
      problems.push("no explainable signals were produced");
    }

    // The result crosses an executeScript boundary in the extension, so it
    // must survive a JSON round-trip with no DOM references left in it.
    const serialized = JSON.stringify(result);
    if (serialized.includes("<html")) {
      problems.push("raw HTML leaked into the analysis result");
    }

    for (const [ok, message] of fixture.expect ? fixture.expect(result) : []) {
      if (!ok) problems.push(message);
    }

    rows.push({
      name: fixture.name,
      verdict: result.renderType,
      confidence: result.confidence,
      delivery: deliveryMode,
      origin: result.renderOrigin?.label,
      signals: result.signals?.length ?? 0,
      problems,
    });
  } catch (error) {
    problems.push(`harness error: ${String(error).slice(0, 200)}`);
    rows.push({ name: fixture.name, problems });
  }

  await context.close();

  const mark = problems.length === 0 ? "PASS" : "FAIL";
  if (problems.length) failures++;
  const row = rows[rows.length - 1];
  console.log(
    `${mark}  ${fixture.name.padEnd(16)} ${(row.verdict || "-").padEnd(30)} ` +
      `delivery=${(row.delivery || "-").padEnd(12)} origin=${row.origin || "-"}`,
  );
  for (const problem of problems) console.log(`        ↳ ${problem}`);
}

await browser.close();
server.close();

console.log(`\n${FIXTURES.length - failures}/${FIXTURES.length} fixtures passed`);
process.exit(failures === 0 ? 0 : 1);
