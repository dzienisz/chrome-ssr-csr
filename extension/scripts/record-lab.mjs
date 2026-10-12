#!/usr/bin/env node
import { chromium } from "playwright";
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error("Usage: node scripts/record-lab.mjs <manifest.json>");
  process.exit(2);
}

const manifest = JSON.parse(await readFile(path.resolve(manifestPath), "utf8"));
if (!Array.isArray(manifest)) throw new Error("The lab manifest must be an array");

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.join(SCRIPT_DIR, "fixtures", "lab");
const PROBE = path.join(SCRIPT_DIR, "..", "src", "probe.js");
const CONTENT = path.join(path.dirname(path.resolve(manifestPath)), "..", "content.json");
const packageVersions = {
  "Next.js": ["next"],
  Nuxt: ["nuxt"],
  SvelteKit: ["@sveltejs/kit"],
  "React Router": ["react-router"],
  Astro: ["astro"],
  "Astro + React": ["astro", "@astrojs/react"],
  "Astro + Node": ["astro", "@astrojs/node"],
  Angular: ["@angular/core"],
  "Qwik City": ["@builder.io/qwik-city"],
  "Vite + React": ["vite", "react"],
  "Node + Express + htmx": ["express", "htmx.org"],
  "Plain HTML + JavaScript": [],
};

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const recordedEntries = [];
const sizeByApp = new Map();

try {
  for (const app of manifest) {
    const packagePath = path.join(path.dirname(path.resolve(manifestPath)), app.name, "package.json");
    const appPackage = JSON.parse(await readFile(packagePath, "utf8"));
    const dependencies = {
      ...appPackage.dependencies,
      ...appPackage.devDependencies,
      ...appPackage.optionalDependencies,
    };
    const versionKeys = packageVersions[app.framework] ?? [];
    const frameworkVersion = versionKeys
      .map((key) => dependencies[key] && `${key} ${dependencies[key]}`)
      .filter(Boolean)
      .join(" + ") || "N/A (plain HTML and JavaScript)";
    const appDir = path.join(FIXTURE_DIR, app.name);
    await mkdir(appDir, { recursive: true });

    const response = await fetch(app.url);
    if (!response.ok) throw new Error(`${app.name}: raw GET returned HTTP ${response.status}`);
    const raw = Buffer.from(await response.arrayBuffer());
    await writeFile(path.join(appDir, "raw.html"), raw);

    const context = await browser.newContext({
      bypassCSP: true,
      viewport: { width: 1440, height: 900 },
    });
    let rendered;
    try {
      await context.addInitScript({ path: PROBE });
      const page = await context.newPage();
      await page.goto(app.url, { waitUntil: "load", timeout: 45000 });
      await page.waitForTimeout(4000);
      rendered = await page.evaluate(() => {
        const html = document.documentElement.cloneNode(true);
        const removeScripts = (node) => {
          for (const child of [...node.childNodes]) {
            if (child.nodeType === Node.ELEMENT_NODE && child.localName === "script") {
              child.remove();
              continue;
            }
            removeScripts(child);
          }
          if (node instanceof HTMLTemplateElement) removeScripts(node.content);
        };
        removeScripts(html);
        return html.outerHTML;
      });
    } finally {
      await context.close();
    }
    await writeFile(path.join(appDir, "rendered.html"), rendered, "utf8");

    const entry = {
      name: app.name,
      framework: app.framework,
      mode: app.mode,
      origin: app.origin,
      frameworkVersion,
      recordedAt: new Date().toISOString(),
    };
    recordedEntries.push(entry);
    sizeByApp.set(app.name, raw.length + Buffer.byteLength(rendered));
    console.log(
      `Recorded ${app.name}: raw=${raw.length} bytes rendered=${Buffer.byteLength(rendered)} bytes`,
    );
  }
} finally {
  await browser.close();
}

await copyFile(CONTENT, path.join(FIXTURE_DIR, "content.json"));
const fixtureManifestPath = path.join(FIXTURE_DIR, "manifest.json");
let existingEntries = [];
try {
  existingEntries = JSON.parse(await readFile(fixtureManifestPath, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const entriesByName = new Map(existingEntries.map((entry) => [entry.name, entry]));
for (const entry of recordedEntries) entriesByName.set(entry.name, entry);
await writeFile(
  fixtureManifestPath,
  `${JSON.stringify([...entriesByName.values()], null, 2)}\n`,
  "utf8",
);

let totalBytes = 0;
async function measureDirectory(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) await measureDirectory(entryPath);
    else totalBytes += (await stat(entryPath)).size;
  }
}
await measureDirectory(FIXTURE_DIR);
console.log(`Fixture directory size: ${totalBytes} bytes (${(totalBytes / 1024 / 1024).toFixed(2)} MiB)`);
if (totalBytes > 3 * 1024 * 1024) {
  console.log("Largest app snapshots (raw + rendered):");
  for (const [name, size] of [...sizeByApp].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`  ${name}: ${size} bytes`);
  }
}
