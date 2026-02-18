#!/usr/bin/env node

/**
 * Build Script for Extension Bundles
 * Produces two bundles:
 *   analyzer-bundle.js    — detection only, always injected
 *   src/telemetry-bundle.js — telemetry collectors, injected only when shareData=true
 */

const fs = require('fs');
const path = require('path');

// Detection files only — no telemetry
const detectorFiles = [
  'src/core/config.js',
  'src/detectors/comparison-detector.js',
  'src/detectors/csr-pattern-detector.js',
  'src/detectors/hybrid-detector.js',
  'src/detectors/content-detector.js',
  'src/detectors/framework-detector.js',
  'src/detectors/meta-detector.js',
  'src/detectors/performance-detector.js',
  // Core analyzer (must come after detectors)
  'src/core/scoring.js',
  'src/core/analyzer.js',
  // UI components
  'src/ui/components/results-renderer.js'
];

// Telemetry collectors — loaded only when shareData=true
const telemetryFiles = [
  'src/collectors/performance-collector.js',
  'src/collectors/page-type-detector.js',
  'src/collectors/device-detector.js',
  'src/collectors/tech-stack-detector.js',
  'src/collectors/seo-detector.js',
  'src/collectors/hydration-detector.js',
  'src/collectors/navigation-detector.js',
  'src/core/telemetry-collector.js'
];

const extensionDir = path.join(__dirname, '..');

function buildBundle(sourceFiles, outputFile, guardName) {
  let bundleContent = '';
  let totalLines = 0;

  bundleContent += `// Prevent duplicate injection\nif (typeof window.${guardName} === 'undefined') {\n  window.${guardName} = true;\n\n`;

  sourceFiles.forEach((file) => {
    const filePath = path.join(extensionDir, file);

    if (!fs.existsSync(filePath)) {
      console.warn(`  ⚠️  Warning: ${file} not found, skipping...`);
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').length;
    totalLines += lines;

    console.log(`  ✓ ${file.padEnd(55)} (${lines} lines)`);

    bundleContent += `/**\n * ${file}\n */\n\n`;
    bundleContent += content;
    bundleContent += '\n\n';
  });

  bundleContent += `\n} // End of injection guard\n`;

  fs.writeFileSync(path.join(extensionDir, outputFile), bundleContent, 'utf8');

  const bundleLines = bundleContent.split('\n').length;
  const bundleSize = (bundleContent.length / 1024).toFixed(2);

  console.log(`\n  📦 Output: ${outputFile}`);
  console.log(`  📊 Total lines: ${bundleLines.toLocaleString()}`);
  console.log(`  💾 Bundle size: ${bundleSize} KB`);
  console.log(`  📁 Files bundled: ${sourceFiles.length}`);
}

console.log('🔨 Building bundles...\n');

try {
  console.log('▶ analyzer-bundle.js (detection)');
  buildBundle(detectorFiles, 'src/analyzer-bundle.js', '__SSR_CSR_ANALYZER_LOADED__');

  console.log('\n▶ src/telemetry-bundle.js (telemetry collectors)');
  buildBundle(telemetryFiles, 'src/telemetry-bundle.js', '__SSR_CSR_TELEMETRY_LOADED__');

  console.log('\n✅ Build complete!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
