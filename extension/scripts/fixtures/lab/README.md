# Recorded framework lab

These snapshots capture 25 production-built apps with known rendering origins.
The app sources and build outputs are kept outside this repository in
`/home/ubuntu/v5lab/apps/`; this directory contains only recorded responses,
metadata, and the shared `/home/ubuntu/v5lab/content.json` copy.

The region order is shell (nav and footer), h1, article, comments:

- **S** — included in the first HTML response.
- **C** — built by client-side JavaScript.
- **D** — server-rendered HTML fetched after load.

`manifest.json` records each app's framework, mode, origin, declared
`frameworkVersion`, and recording time. `raw.html` is the first response;
`rendered.html` is the document after four seconds with script elements removed.
The app names and expected origins are:

| App | Shell | H1 | Article | Comments |
| --- | :---: | :---: | :---: | :---: |
| `next-app-ssr` | S | S | S | S |
| `next-app-static` | S | S | S | S |
| `next-app-streaming` | S | S | S | S |
| `next-app-client-comments` | S | S | S | C |
| `next-app-ssr-false` | S | C | C | C |
| `next-pages-gssp` | S | S | S | S |
| `next-pages-client-fetch` | S | C | C | C |
| `nuxt-ssr` | S | S | S | S |
| `nuxt-spa` | C | C | C | C |
| `nuxt-clientonly-comments` | S | S | S | C |
| `sveltekit-ssr` | S | S | S | S |
| `sveltekit-spa` | C | C | C | C |
| `react-router-ssr` | S | S | S | S |
| `react-router-spa` | C | C | C | C |
| `astro-static` | S | S | S | S |
| `astro-client-only` | S | S | C | C |
| `astro-server-defer` | S | S | S | D |
| `angular-csr` | C | C | C | C |
| `angular-ssr` | S | S | S | S |
| `angular-ssr-defer` | S | S | S | C |
| `qwik-city` | S | S | S | S |
| `vite-react-spa` | C | C | C | C |
| `htmx-load` | S | S | S | D |
| `skeleton-swap` | S | S | C | C |
| `prerendered-shell` | S | C | C | C |

## Framework versions

These are the dependency version specifications read from each app's
`package.json`, not versions resolved from its lockfile:

- Next.js `16.4.0`, React `19.3.0`
- Nuxt `^4.6.1`
- SvelteKit `^3.0.0`
- React Router `^7.18.4`, React `^19.2.8`
- Astro `^7.3.8`; Astro React integration `^7.0.1`; Astro Node integration `^11.1.7`
- Angular `@angular/core ^22.2.0`; SSR adapter `@angular/ssr ^22.2.2`
- Qwik City `^1.20.2`
- Vite `^8.3.0`, React `^19.2.8`
- Express `^5.1.0`, htmx `^2.0.8`
- The plain HTML/JavaScript app has no framework dependency.

## Re-recording

Start the lab apps on ports 4101–4125 from
`/home/ubuntu/v5lab/apps/start-all.sh` if they are not already running, then
from the repository's `extension/` directory run:

```bash
node scripts/record-lab.mjs /home/ubuntu/v5lab/apps/manifest.json
```

The recorder uses Playwright Chromium, runs the probe at document start, waits
four seconds, saves each raw response and script-free rendered document, and
updates this directory's manifest and `content.json`. Set `CHROMIUM_PATH` if
Playwright cannot find the installed browser. App sources are not in this
repository, so re-recording requires the external lab checkout and its running
servers.

`npm run validate:lab` replays only these local snapshots and blocks external
asset requests. It reports the coarse v4 accuracy separately from its CI gate:
the gate fails only when an app's bucket differs from `baseline.json`.
`npm run validate:lab -- --update-baseline` deliberately replaces that baseline
with the current detector results.
