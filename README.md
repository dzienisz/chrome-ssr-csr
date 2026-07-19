# CSR vs SSR Detector

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/fhiopdjeekafnhmfbcfoolhejdgjpkgg)](https://chromewebstore.google.com/detail/csr-vs-ssr-detector/fhiopdjeekafnhmfbcfoolhejdgjpkgg)
[![Mozilla Add-on](https://img.shields.io/amo/v/csr-vs-ssr-detector)](https://addons.mozilla.org/firefox/addon/csr-vs-ssr-detector/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A browser extension (Chrome and Firefox) that detects whether a webpage uses **Server-Side Rendering (SSR)** or **Client-Side Rendering (CSR)**. Helps developers and SEO specialists understand page rendering strategies.

## Projects

This monorepo contains two projects:

| Project | Description | Links |
|---------|-------------|-------|
| **[Browser Extension](./extension)** | Detects SSR/CSR rendering on any webpage (Chrome & Firefox) | [Chrome](https://chromewebstore.google.com/detail/csr-vs-ssr-detector/fhiopdjeekafnhmfbcfoolhejdgjpkgg) · [Firefox](https://addons.mozilla.org/firefox/addon/csr-vs-ssr-detector/) · [Docs](./extension/README.md) |
| **[Analytics Dashboard](./backend)** | Real-time usage analytics | [Live](https://backend-mauve-beta-88.vercel.app/dashboard) · [Docs](./backend/README.md) |

## Quick Start

### Install Extension
- **Chrome**: [Chrome Web Store](https://chromewebstore.google.com/detail/csr-vs-ssr-detector/fhiopdjeekafnhmfbcfoolhejdgjpkgg) → "Add to Chrome"
- **Firefox (128+)**: [addons.mozilla.org](https://addons.mozilla.org/firefox/addon/csr-vs-ssr-detector/) → "Add to Firefox"

Then click the extension icon on any webpage to analyze it.

### Development
```bash
git clone https://github.com/dzienisz/chrome-ssr-csr.git
cd chrome-ssr-csr

# Extension development
cd extension
npm install
npm run build         # rebuild bundles after editing src/
npm run build:firefox # generate the Firefox variant in dist/firefox/
npm run test:run      # unit tests
# Chrome: load extension/ folder in chrome://extensions (Developer Mode)
# Firefox: load extension/dist/firefox/ in about:debugging#/runtime/this-firefox

# Backend development
cd backend
npm install
npm run dev
```

## Features

- **Accurate Detection** - Compares raw HTML vs rendered DOM, plus 15+ indicators — validated against a 22-site ground-truth suite (v3.7.0)
- **Framework Recognition** - Detects Next.js, Nuxt, Gatsby, React, Vue, Angular, and more
- **Tech Stack Intelligence** - Identifies CSS frameworks (Tailwind, Bootstrap), Build Tools (Vite), and Hosting (Vercel, Netlify)
- **SEO & Accessibility Audit** - Checks meta tags, social preview tags, alt text coverage, and ARIA labels
- **Badge on Icon** - Shows SSR/CSR/MIX result directly on extension icon
- **Export Results** - Download as JSON, CSV, or Markdown
- **Dark Mode** - Beautiful dark theme
- **Analytics Dashboard** - Aggregated usage data with live updates
- **Privacy-respecting telemetry** - Opt-out anonymous stats, origin only (never full URLs) — see the [privacy policy](./extension/privacy-policy.md)

## SSR vs CSR

| SSR (Server-Side) | CSR (Client-Side) |
|-------------------|-------------------|
| Content generated on server | Content generated in browser |
| Better for SEO | Better for interactivity |
| Faster First Paint | Smoother navigation |
| Next.js, Nuxt, Gatsby | React SPA, Vue SPA |

## Contributing

Contributions welcome! See individual project READMEs for details:
- [Extension Contributing](./extension/README.md#contributing)
- [Backend Contributing](./backend/README.md)

## License

MIT License - see [LICENSE](LICENSE)

## Links

- [Chrome Web Store](https://chromewebstore.google.com/detail/csr-vs-ssr-detector/fhiopdjeekafnhmfbcfoolhejdgjpkgg)
- [Live Dashboard](https://backend-mauve-beta-88.vercel.app/dashboard)
- [Report Issues](https://github.com/dzienisz/chrome-ssr-csr/issues)
