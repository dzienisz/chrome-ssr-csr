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
  'popup.html', 'popup.js', 'popup.css',
  'options.html', 'options.js', 'options.css',
  'background.js',
  'welcome.html', 'welcome.js', 'welcome.css',
  'devtools',
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

/**
 * Every local file the packaged extension references, from the manifest and
 * from the pages themselves.
 *
 * @param {Object} manifest
 * @returns {Array<{file: string, from: string}>}
 */
function referencedFiles(manifest) {
  const refs = [];
  const add = (file, from) => {
    if (file && !/^(https?:|data:|chrome-extension:|#|mailto:)/.test(file)) {
      refs.push({ file: file.split(/[?#]/)[0], from });
    }
  };

  // Manifest entry points.
  add(manifest.background && manifest.background.scripts && manifest.background.scripts[0], 'manifest.background');
  add(manifest.action && manifest.action.default_popup, 'manifest.action');
  add(manifest.options_ui && manifest.options_ui.page, 'manifest.options_ui');
  add(manifest.devtools_page, 'manifest.devtools_page');
  for (const icon of Object.values(manifest.icons || {})) add(icon, 'manifest.icons');
  for (const icon of Object.values((manifest.action || {}).default_icon || {})) {
    add(icon, 'manifest.action.default_icon');
  }
  for (const script of manifest.content_scripts || []) {
    for (const file of script.js || []) add(file, 'manifest.content_scripts');
  }

  // Anything the HTML pages pull in, resolved relative to the page.
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.html')) {
        const html = fs.readFileSync(full, 'utf8');
        const pageDir = path.relative(OUT_DIR, dir) || '.';
        for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
          const resolved = path.posix.normalize(
            path.posix.join(pageDir === '.' ? '' : pageDir, match[1]),
          );
          add(resolved, path.relative(OUT_DIR, full));
        }
      }
    }
  };
  walk(OUT_DIR);

  return refs;
}

/**
 * Fail the build when the package references a file it does not contain.
 *
 * The shipped-file list is maintained by hand in two places (SHIPPED here and
 * the zip step in release.yml), so adding a directory to the extension without
 * adding it to both produces a package that installs and then breaks — which
 * is exactly what a missing `devtools/` would have done.
 *
 * @param {Object} manifest
 */
function verifyPackageIsComplete(manifest) {
  const missing = referencedFiles(manifest).filter(
    ({ file }) => !fs.existsSync(path.join(OUT_DIR, file)),
  );

  if (missing.length) {
    for (const { file, from } of missing) {
      console.error(`  missing from package: ${file}  (referenced by ${from})`);
    }
    console.error(
      `\n${missing.length} referenced file(s) are not in dist/firefox. ` +
        'Add them to SHIPPED in this script, and to the zip step in ' +
        '.github/workflows/release.yml.',
    );
    process.exit(1);
  }
}

function main() {
  const manifest = buildFirefoxManifest();

  copyShippedFiles();
  fs.writeFileSync(
    path.join(OUT_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n'
  );
  verifyPackageIsComplete(manifest);
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
