# Changelog

All notable changes to the CSR vs SSR Detector extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2] - 2024-10-14

### Added
- Try-catch error handling in `pageAnalyzer()` function for better stability
- Additional React detection selectors for modern React 18+ applications
- Better error reporting with fallback analysis results
- MIT License file
- Comprehensive documentation (CHANGELOG.md, ROADMAP.md, enhanced README.md)

### Fixed
- Function call argument order in `popup.js:60` (history saving bug)
- React detection for applications without legacy `[data-reactroot]` attribute
- Privacy policy date correction (2025 → 2024)
- Improved error handling for DOM operations on restricted pages

### Changed
- Enhanced README.md with better structure, badges, and detailed sections
- Updated documentation with clear installation, usage, and contributing guidelines

## [2.1] - 2024-07-03

### Added
- Privacy policy documentation
- Sequence diagram illustrating detection flow
- Improved UI with modern design system

### Changed
- Enhanced detection algorithm with weighted scoring
- Better confidence calculation based on indicator count
- Improved visual feedback with confidence bars

### Fixed
- Performance timing analysis edge cases
- History display formatting

## [2.0] - 2024-05-26

### Added
- Complete UI/UX redesign with modern interface
- Enhanced analysis engine with more accurate detection
- History tracking feature (stores last 10 analyses)
- Performance metrics display (DOM ready time, FCP)
- Framework-specific detection for:
  - Next.js, Nuxt, Gatsby, Remix, SvelteKit
  - Astro, Qwik, SolidJS
  - Jekyll, Hugo, Eleventy, Hexo
- Detailed indicator display showing detection signals
- Visual confidence bars for analysis results
- Desktop notifications for analysis completion
- Help section explaining SSR vs CSR differences

### Changed
- Migrated to Chrome Manifest V3
- Improved scoring algorithm with multiple weighted indicators:
  - HTML content analysis
  - Framework hydration markers
  - Serialized data detection
  - Meta tags and SEO analysis
  - Script analysis and code splitting patterns
  - Performance timing metrics
  - Client-side routing detection
  - Structured data presence
- Better classification with 5 render type categories:
  - Server-Side Rendered (SSR)
  - Client-Side Rendered (CSR)
  - Likely SSR with Hydration
  - Likely CSR/SPA
  - Hybrid/Mixed Rendering
- Enhanced UI with color-coded results
- Improved extension popup design

### Fixed
- Validation rules for SSR and CSR detection
- Script injection reliability
- Performance on complex web applications

## [1.0] - Initial Release

### Added
- Basic SSR vs CSR detection functionality
- Simple popup interface
- Chrome extension with basic analysis
- Detection based on:
  - Initial HTML content
  - JavaScript framework presence
  - Basic meta tag analysis

---

## Version History Summary

- **v2.1**: UI polish, privacy policy, documentation improvements
- **v2.0**: Major redesign with advanced detection, history, and modern UI
- **v1.0**: Initial release with basic detection capabilities
