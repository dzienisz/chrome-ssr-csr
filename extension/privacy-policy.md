# Privacy Policy for CSR vs SSR Detector

## Local Analysis and History

The extension analyzes pages you choose to inspect. Analysis and the local history feature work even when telemetry sharing is disabled.

Your browser's extension storage holds:

- Analyzed page URLs and titles
- Rendering results, confidence scores, indicators and timestamps
- Preferences such as theme, history limit and notifications

History stays on your device; enabling sharing does not upload the history database. Preferences use browser sync storage and may sync through your browser account. Exports you create are under your control.

## Optional Telemetry (enabled by default, opt-out)

The setting named "Share anonymous data" controls telemetry sharing. It is **enabled by default** and can be disabled in settings. The name of this setting is not a guarantee of anonymity: domains, timestamps and combinations of technical measurements can reveal context about an analyzed visit.

When sharing is enabled, the extension sends technical analysis data to the analytics backend. The backend validates and minimizes incoming records before storing them. Retained fields are:

- HTTP(S) origin and hostname, not URL paths, queries or fragments
- Rendering classification, confidence, recognized frameworks and extension version
- Performance measurements and counts: DOM ready time, content-size comparison, Core Web Vitals and aggregate Long Animation Frame measurements
- A page-category label such as blog, ecommerce or documentation
- Device category, screen dimensions, pixel ratio, touch capability, browser/engine/version, connection category and measurements, CPU core count, language, timezone and display/motion preferences
- Recognized CSS frameworks, state-management libraries, build tools, hosting/CDN providers and technology-related global labels
- SEO/accessibility flags, counts and percentages, including title/description lengths, heading counts and image-alt coverage; not page titles or description text
- Hydration error count and health score
- SPA/MPA classification and aggregate client-navigation counts/API-support flags
- Receipt timestamp and a two-letter country code derived server-side from hosting-platform request metadata

The API discards free-form indicators, raw user-agent values, page titles, structured-data strings, raw hydration messages/stacks, route details and unrecognized extra fields. Older clients may submit fields that are now discarded. The updated hydration collector emits only an error count and score, not raw messages. Local diagnostic/probe data is separate from the retained telemetry record.

IP addresses are not stored in the analysis records. Network requests necessarily expose connection information, including an IP address, to the hosting provider; this policy does not make claims about provider-level request logs.

## Public Dashboard and API

Telemetry is hosted on Vercel infrastructure. Aggregate statistics and a minimized subset of individual recent analyses are **publicly accessible**, not developer-only.

The public per-record subset contains a record ID, hostname, rendering classification, confidence, timestamp, recognized frameworks/technologies, allowed performance metrics, hydration count/score, SPA flag/client-route count and country. Other device details, URLs, indicators, SEO records, raw errors and route details are excluded. The same projection applies when displaying historical records.

Data is used to understand framework usage, compare rendering/performance patterns, improve detection and identify extension issues. Public data can be accessed by third parties. Do not enable sharing for visits whose hostname or technical context you do not want to appear publicly.

## Retention and Control

Local history retains a configurable number of recent analyses (default: 10); older entries are removed as new analyses are added. Clear extension storage or uninstall the extension to remove local history.

Disable telemetry in settings to stop future telemetry submissions. This does not remove already submitted records. Public record deletion is currently disabled; no administrator login or public deletion control is provided.

Telemetry records are retained for statistical analysis with no automatic deletion schedule promised here. Historical records may still contain previously accepted fields in private database storage. The public projection excludes those fields; this change does not perform historical cleanup. Any cleanup requires a separate operational decision.

## Contact

For privacy questions, please open an issue on the GitHub repository. Do not include private page content, credentials or sensitive URLs in a public issue.

Last updated: 2026-09-09
