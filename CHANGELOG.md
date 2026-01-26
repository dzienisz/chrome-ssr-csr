# Changelog

All notable changes to the CSR vs SSR Detector extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.1.1] - 2026-01-26

### Changed
- **Telemetry opt-out**: Changed from opt-in to opt-out (enabled by default)
  - Users can disable anytime in Settings → "Share anonymous data"

## [3.1.0] - 2026-01-26

### Added
- **Analytics Backend**: New Next.js backend for anonymous telemetry
  - Dashboard at https://backend-mauve-beta-88.vercel.app/dashboard
  - Tracks render type distribution, top frameworks, analyzed domains
  - Timeline charts showing usage over time
  - Recent analyses table with detailed info
  - Top Domains component showing most analyzed sites

### Changed
- **Telemetry Integration**: Extension sends anonymous data (opt-out)
  - Enabled by default, can be disabled in settings
  - Data sent: domain (not full URL), render type, confidence, frameworks
  - Controlled via "Share anonymous data" setting
  - Privacy-first: URLs anonymized to origin only
- **Removed host_permissions**: Extension no longer requires host permissions
  - Fetch requests work via CORS headers from backend
  - Cleaner permission model for Chrome Web Store

### Security
- **Removed hardcoded API keys**: API authentication made optional
  - Backend relies on CORS headers for protection
  - No sensitive data in extension source code

## [3.0.5] - 2025-10-21

### Fixed
- **Critical Hotfix**: Fixed missing `src/analyzer-bundle.js` in production build
  - v3.0.4 was missing the analyzer bundle file due to incorrect zip exclusion pattern
  - Extension would show "Cannot access this page" error when analyzing
  - Updated build script to include bundle while excluding source modules
  - No code changes, only packaging fix

## [3.0.4] - 2025-10-20

### Fixed
- **Complete Dropdown Styling Fix**: All dropdown elements now properly styled in both themes
  - Fixed select element text color in dark mode (white text instead of dark)
  - Fixed dropdown options with explicit colors for both light and dark modes
  - Light mode: white background with dark text
  - Dark mode: dark background with white text
  - Both closed and open dropdowns are now readable in all themes
  - Applies to theme selector and history limit dropdowns
  - Note: CSS variables don't work reliably for native browser dropdown controls

## [3.0.3] - 2025-10-20

### Fixed
- **Initial Dropdown Styling**: First attempt at fixing dropdown visibility
  - Added basic styling for dropdown options
  - Discovered CSS variable limitations with native controls

## [3.0.2] - 2025-10-20

### Added
- **System Dark Mode Detection**: Theme now syncs with system preferences
  - New "Auto (System)" option in settings (default)
  - Automatically detects `prefers-color-scheme` media query
  - Three theme options: Auto, Light, Dark
  - Real-time switching between themes
  - Works seamlessly across popup and settings pages

### Changed
- **Dynamic Version Display**: Version now read from manifest.json
  - Removed hardcoded version strings from all HTML/JS files
  - Uses `chrome.runtime.getManifest().version` for consistency
  - Single source of truth for version number
  - Auto-updates in popup footer and settings footer

### Fixed
- **CSP Compliance**: Removed inline scripts from HTML files
  - Fixed Content Security Policy violations
  - Moved version injection code to JavaScript files
  - Follows Chrome extension best practices
- **Theme Dropdown Default**: "Auto (System)" now properly selected by default

### Technical
- Modified `options.js` and `popup.js` for system theme detection
- Updated `options.html` to use select dropdown instead of toggle
- Added `window.matchMedia('(prefers-color-scheme: dark)')` detection
- Version injection moved to DOMContentLoaded event listeners
- Bumped version to 3.0.2 in manifest.json

## [3.0.1] - 2025-10-20

### Fixed
- **Dark Mode Styling**: Fixed indicator badge styling in dark mode
  - Badges now show proper contrast (gray background with white text)
  - Fixed confidence bar background color for dark theme
  - All accent colors and borders properly adapt to theme
- **Script Injection Guard**: Added protection against duplicate analyzer injection
  - Prevents "Identifier already declared" errors on repeated analysis
  - Wrapped analyzer-bundle.js with injection guard
- **Restricted URL Handling**: Better error handling for Chrome internal pages
  - Shows friendly message when trying to analyze chrome://, edge://, about:, etc.
  - No more console errors for restricted pages
  - Added chrome.runtime.lastError checks throughout popup.js
  - Beautiful error screen with clear instructions

### Technical
- Updated `src/ui/components/results-renderer.js` with theme detection
- Rebuilt `src/analyzer-bundle.js` with injection guard wrapper
- Added URL validation and error handling in popup.js

## [3.0] - 2025-10-20

### Added
- **⚙️ Settings Page**: Full-featured options page (`options.html`)
  - Dark mode toggle with smooth theme transitions
  - Configurable history limit (5, 10, 25, 50, 100, or unlimited)
  - Desktop notifications toggle
  - Anonymous data sharing opt-in (UI ready for v3.1 backend)
  - Export settings as JSON
  - Reset to defaults functionality
- **🌙 Dark Mode**: Beautiful dark theme throughout the extension
  - CSS variable-based theming system
  - Syncs between popup and settings page
  - Smooth transitions and animations
  - Persists user preference across sessions
- **📤 Export Functionality**: Download analysis results in multiple formats
  - **JSON export**: Structured data for developers
  - **CSV export**: Spreadsheet-friendly format
  - **Markdown export**: Documentation-ready reports
  - Includes URL, timestamp, all metrics, and indicators
- **🔒 Data Sharing Opt-in**: Privacy-first anonymous data collection (v3.1)
  - Clear explanation of what data is shared
  - Fully GDPR-compliant UI
  - Currently logs to console (backend coming in v3.1)
- **🎨 UI Improvements**:
  - Settings gear icon in popup header
  - Export buttons appear after analysis
  - Better visual hierarchy
  - Improved dark mode compatibility

### Changed
- Updated popup UI with settings access
- History limit now respects user preference from settings
- All UI elements support both light and dark themes
- Improved loading state animations with theme awareness

### Technical
- Added `options_page` to manifest.json
- Created `options.html` and `options.js` for settings management
- Completely rewrote `popup.js` with dark mode, export, and settings integration
- Updated `popup.html` with new header layout and export buttons
- Uses `chrome.storage.sync` for settings persistence
- Bumped version to 3.0 in manifest.json

## [2.3] - 2025-10-20

### Changed
- **Internal code refactoring**: Split monolithic `analyzer.js` (350+ lines) into modular architecture
  - Created `src/core/` folder with config, analyzer, and scoring modules
  - Created `src/detectors/` folder with 4 specialized detector modules
  - Created `src/ui/components/` folder for results rendering
  - All modules bundled into `src/analyzer-bundle.js` for deployment
- Improved code maintainability and scalability for future v3.0 development
- Fixed script injection guard to prevent redeclaration errors

### Technical Notes
- No user-facing changes - functionality remains identical to v2.2
- Better organized codebase makes future feature development easier
- Foundation for v3.0 features (settings page, dark mode, export functionality)

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

- **v3.1.1**: Telemetry changed to opt-out (enabled by default)
- **v3.1.0**: Analytics backend with dashboard, telemetry integration
- **v3.0.5**: Critical hotfix for missing bundle file
- **v3.0**: Settings page, dark mode, export functionality
- **v2.1**: UI polish, privacy policy, documentation improvements
- **v2.0**: Major redesign with advanced detection, history, and modern UI
- **v1.0**: Initial release with basic detection capabilities
