/**
 * Render one promo-images/src/*.html at an exact pixel size.
 *
 *   node shoot.mjs <src-name> <width> <height> <out.png>
 *
 * Uses Playwright's viewport so the output is exactly width×height. Chrome's
 * own `--headless --screenshot --window-size` treats the size as the outer
 * window on some platforms, which leaves an ~88px blank strip at the bottom.
 * Honours CHROMIUM_PATH like scripts/ui-preview.mjs.
 */
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const [name, width, height, out] = process.argv.slice(2);
if (!name || !width || !height || !out) {
  console.error("usage: node shoot.mjs <src-name> <width> <height> <out.png>");
  process.exit(2);
}

const HERE = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const page = await browser.newPage({
  viewport: { width: Number(width), height: Number(height) },
  deviceScaleFactor: 1,
});
await page.goto(`file://${join(HERE, "src", `${name}.html`)}`);
await page.waitForTimeout(150);
await page.screenshot({ path: join(HERE, out) });
await browser.close();
