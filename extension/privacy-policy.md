# Privacy Policy for CSR vs SSR Detector

## Data Collection and Storage

### Local Storage
This extension stores the following information locally on your device:
- URLs of websites you analyze
- Titles of websites you analyze
- Analysis results (rendering type, confidence score, indicators)
- Timestamps of when analyses were performed
- Your preferences (theme, history limit, notification settings)

### Optional Anonymous Telemetry
If you opt-in to "Share anonymous data" in settings, the extension sends anonymized usage data to help improve the extension:

**Data sent when opted-in:**
- Domain name only (e.g., "example.com", NOT full URLs or paths)
- Detected render type (SSR/CSR/Hybrid)
- Confidence score
- Detected frameworks (e.g., "Next.js", "React")
- Performance metrics (DOM ready time, First Contentful Paint)
- Extension version
- Timestamp

**Data NOT collected:**
- Full URLs or page paths
- Personal information
- Browsing history
- Page content
- IP addresses are not stored

## Data Usage

### Local Data
Local data is used solely to provide the history feature, allowing you to view your past analyses. All local data is stored on your device using chrome.storage and is not transmitted unless you opt-in to telemetry.

### Telemetry Data (opt-in only)
Anonymous telemetry data is used to:
- Understand which frameworks are most commonly detected
- Improve detection accuracy
- Identify and fix issues with the extension
- View aggregate usage statistics

Telemetry data is stored on secure servers hosted by Vercel and is only accessible to the extension developer.

## Data Retention

### Local Data
The extension stores a configurable number of recent analyses (default: 10). Older entries are automatically deleted when new analyses are performed.

### Telemetry Data
Anonymous telemetry data is retained for statistical analysis and may be deleted periodically.

## User Control

### Local Data
You can clear all stored data by clearing your browser's extension storage or by uninstalling the extension.

### Telemetry
- Telemetry is **enabled by default** (opt-out)
- You can disable it anytime in the extension settings
- Disabling telemetry stops all future data transmission

## Third-Party Access
- Local data: No third parties have access
- Telemetry data: Hosted on Vercel infrastructure, not shared with third parties

## Contact
For questions about this privacy policy, please open an issue on the GitHub repository.

Last updated: 2026-01-26
