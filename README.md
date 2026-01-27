# CSR vs SSR Detector

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/fhiopdjeekafnhmfbcfoolhejdgjpkgg)](https://chromewebstore.google.com/detail/csr-vs-ssr-detector/fhiopdjeekafnhmfbcfoolhejdgjpkgg)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Chrome extension that detects whether a webpage uses **Server-Side Rendering (SSR)** or **Client-Side Rendering (CSR)**. Helps developers and SEO specialists understand page rendering strategies.

## Projects

This monorepo contains two projects:

| Project | Description | Links |
|---------|-------------|-------|
| **[Chrome Extension](./extension)** | Detects SSR/CSR rendering on any webpage | [Install](https://chromewebstore.google.com/detail/csr-vs-ssr-detector/fhiopdjeekafnhmfbcfoolhejdgjpkgg) · [Docs](./extension/README.md) |
| **[Analytics Dashboard](./backend)** | Real-time usage analytics | [Live](https://backend-mauve-beta-88.vercel.app/dashboard) · [Docs](./backend/README.md) |

## Quick Start

### Install Extension
1. Visit the [Chrome Web Store](https://chromewebstore.google.com/detail/csr-vs-ssr-detector/fhiopdjeekafnhmfbcfoolhejdgjpkgg)
2. Click "Add to Chrome"
3. Click the extension icon on any webpage to analyze

### Development
```bash
git clone https://github.com/dzienisz/chrome-ssr-csr.git
cd chrome-ssr-csr

# Extension development
# Load extension/ folder in chrome://extensions (Developer Mode)

# Backend development
cd backend
npm install
npm run dev
```

## Features

- **Accurate Detection** - Compares raw HTML vs rendered DOM, plus 15+ indicators
- **Framework Recognition** - Detects Next.js, Nuxt, Gatsby, React, Vue, Angular, and more
- **Tech Stack Intelligence** - Identifies CSS frameworks (Tailwind, Bootstrap), Build Tools (Vite), and Hosting (Vercel, Netlify)
- **SEO & Accessibility Audit** - Checks meta tags, social preview tags, alt text coverage, and ARIA labels
- **Badge on Icon** - Shows SSR/CSR/MIX result directly on extension icon
- **Export Results** - Download as JSON, CSV, or Markdown
- **Dark Mode** - Beautiful dark theme
- **Analytics Dashboard** - Aggregated usage data with live updates

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
