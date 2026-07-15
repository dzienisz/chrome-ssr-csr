#!/usr/bin/env node
/**
 * Build the Firefox variant of the extension.
 *
 * Chrome's manifest.json stays canonical. This script copies the shipped
 * files into dist/firefox/ (loadable via about:debugging as a temporary
 * add-on) with a transformed manifest:
 *   - background.service_worker -> background.scripts (Firefox MV3 runs
 *     event pages, not service workers)
 *   - browser_specific_settings.gecko added: AMO add-on id, minimum
 *     Firefox version (128 — first release supporting content_scripts
 *     world: "MAIN", which probe.js requires), and the data collection
 *     disclosure AMO requires for new submissions
 *
 * Usage: node scripts/build-firefox.js [--zip]
 *   --zip also produces dist/csr-ssr-detector-firefox-v<version>.zip
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const EXTENSION_DIR = path.join(__dirname, '..');
const OUT_DIR = path.join(EXTENSION_DIR, 'dist', 'firefox');

// Same file list as the Chrome Web Store zip (.github/workflows/release.yml)
const SHIPPED = [
  'manifest.json',
  'popup.html', 'popup.js',
  'options.html', 'options.js',
  'background.js',
  'welcome.html', 'welcome.js',
  'src',
  '_locales'
];

const GECKO_SETTINGS = {
  gecko: {
    id: '{d14f5025-b75f-435c-8d8e-e6b4d0e65457}',
    strict_min_version: '128.0',
    data_collection_permissions: {
      required: ['websiteActivity'],
      optional: ['technicalAndInteraction']
    }
  }
};

function buildFirefoxManifest() {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(EXTENSION_DIR, 'manifest.json'), 'utf8')
  );

  manifest.background = { scripts: ['background.js'] };
  manifest.browser_specific_settings = GECKO_SETTINGS;

  return manifest;
}

function copyShippedFiles() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const icons = fs.readdirSync(EXTENSION_DIR).filter((f) => /^icon.*\.png$/.test(f));

  for (const entry of [...SHIPPED.filter((f) => f !== 'manifest.json'), ...icons]) {
    fs.cpSync(path.join(EXTENSION_DIR, entry), path.join(OUT_DIR, entry), {
      recursive: true,
      filter: (src) => {
        const base = path.basename(src);
        return base !== '.DS_Store' && base !== '__tests__';
      }
    });
  }
}

function main() {
  const manifest = buildFirefoxManifest();

  copyShippedFiles();
  fs.writeFileSync(
    path.join(OUT_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n'
  );
  console.log(`Firefox build written to ${path.relative(process.cwd(), OUT_DIR)}`);

  if (process.argv.includes('--zip')) {
    const zipName = `csr-ssr-detector-firefox-v${manifest.version}.zip`;
    const zipPath = path.join(EXTENSION_DIR, 'dist', zipName);
    fs.rmSync(zipPath, { force: true });
    execFileSync('zip', ['-r', zipPath, '.'], { cwd: OUT_DIR, stdio: 'inherit' });
    console.log(`Firefox zip written to ${path.relative(process.cwd(), zipPath)}`);
  }
}

main();
