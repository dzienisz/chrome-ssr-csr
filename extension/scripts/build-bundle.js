#!/usr/bin/env node

/**
 * Build Script for Extension Analyzer Bundle
 * Concatenates all detector modules into a single bundle file
 */

const fs = require('fs');
const path = require('path');

// Source files in order of dependency
const sourceFiles = [
  'src/core/config.js',
  'src/detectors/comparison-detector.js',
  'src/detectors/csr-pattern-detector.js',
  'src/detectors/hybrid-detector.js',
  'src/detectors/content-detector.js',
  'src/detectors/framework-detector.js',
  'src/detectors/meta-detector.js',
  'src/detectors/performance-detector.js',
  'src/detectors/performance-collector.js',
  'src/detectors/page-type-detector.js',
  'src/detectors/device-detector.js',
  // NEW Phase 2 detectors
  'src/detectors/tech-stack-detector.js',
  'src/detectors/seo-detector.js',
  // Core analyzer (must be last)
  'src/core/scoring.js',
  'src/core/analyzer.js',
  // UI components
  'src/ui/components/results-renderer.js'
];

const outputFile = 'src/analyzer-bundle.js';
const extensionDir = path.join(__dirname, '..');  // Go up one level from scripts/

console.log('🔨 Building analyzer bundle...\n');

try {
  // Read all source files
  let bundleContent = '';
  let totalLines = 0;
  
  // Add injection guard at the start
  bundleContent += `// Prevent duplicate injection
if (typeof window.__SSR_CSR_ANALYZER_LOADED__ === 'undefined') {
  window.__SSR_CSR_ANALYZER_LOADED__ = true;

`;

  sourceFiles.forEach((file, index) => {
    const filePath = path.join(extensionDir, file);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  Warning: ${file} not found, skipping...`);
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').length;
    totalLines += lines;
    
    console.log(`✓ ${file.padEnd(50)} (${lines} lines)`);
    
    // Add file separator comment
    bundleContent += `/**\n * ${file}\n */\n\n`;
    bundleContent += content;
    bundleContent += '\n\n';
  });
  
  // Close injection guard
  bundleContent += `
} // End of injection guard
`;
  
  // Write bundle file
  fs.writeFileSync(path.join(extensionDir, outputFile), bundleContent, 'utf8');
  
  const bundleLines = bundleContent.split('\n').length;
  const bundleSize = (bundleContent.length / 1024).toFixed(2);
  
  console.log('\n✅ Build complete!');
  console.log(`📦 Output: ${outputFile}`);
  console.log(`📊 Total lines: ${bundleLines.toLocaleString()}`);
  console.log(`💾 Bundle size: ${bundleSize} KB`);
  console.log(`📁 Files bundled: ${sourceFiles.length}`);
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
