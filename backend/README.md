# SSR/CSR Analytics Dashboard

[![Changelog](https://img.shields.io/badge/changelog-CHANGELOG.md-blue.svg)](./CHANGELOG.md)
[![Live Dashboard](https://img.shields.io/badge/dashboard-live-brightgreen)](https://backend-mauve-beta-88.vercel.app/dashboard)

Real-time analytics dashboard for the [CSR vs SSR Detector](../extension) Chrome extension.

## Live Dashboard

**[View Live Dashboard](https://backend-mauve-beta-88.vercel.app/dashboard)**

Features:

- Real-time stats with 30-second auto-refresh
- SSR/CSR/Hybrid distribution charts
- Core Web Vitals by render type (LCP, CLS, TTFB, pass rate)
- SPA vs MPA navigation behavior by render type
- Framework detection trends
- Top analyzed domains and country flags in recent records
- Read-only recent analyses table with infinite scroll and record details

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Vercel Postgres
- **UI**: Tremor (charts and dashboard components)
- **Styling**: Tailwind CSS
- **Hosting**: Vercel

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file:

```bash
cp .env.example .env.local
```

Then fill in the values:

```env
# After creating Vercel Postgres, copy these from Vercel dashboard
POSTGRES_URL="postgres://..."
POSTGRES_PRISMA_URL="postgres://..."
POSTGRES_URL_NON_POOLING="postgres://..."
POSTGRES_USER="..."
POSTGRES_HOST="..."
POSTGRES_PASSWORD="..."
POSTGRES_DATABASE="..."

# Optional: API key for additional security (not required, CORS is used)
# API_SECRET_KEY="your-super-secret-key-here"
```

### 3. Run Locally

```bash
npm run dev       # http://localhost:3000
npm run test:run  # unit tests
```

## Deployment to Vercel

**Day-to-day deploys are automatic**: merges to `main` deploy production via
the Vercel GitHub integration (project root is `backend/`). The options below
are only needed for first-time project setup.

### Option 1: Using Vercel CLI

1. **Install Vercel CLI**:

```bash
npm i -g vercel
```

2. **Login to Vercel**:

```bash
vercel login
```

3. **Deploy**:

```bash
cd backend
vercel
```

4. **Add Vercel Postgres**:
   - Go to your project on Vercel dashboard
   - Navigate to Storage tab
   - Click "Create Database"
   - Select "Postgres"
   - Environment variables will be automatically added

5. **Set up the database**:
   - After Postgres is connected, run the setup script:

```bash
vercel env pull .env.local  # Pull environment variables
npm run db:setup
```

6. **Optional API Key**:
   - In Vercel dashboard, go to Settings > Environment Variables
   - Add `API_SECRET_KEY` with a secure random value

7. **Redeploy**:

```bash
vercel --prod
```

### Option 2: Using Vercel Dashboard

1. Push this backend folder to a GitHub repository
2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Select your repository
5. Configure:
   - Root Directory: `backend`
   - Framework Preset: Next.js
6. Add environment variables in the dashboard
7. Deploy
8. Add Vercel Postgres from Storage tab
9. Run setup script (see above)

## Database Setup

After deploying and adding Vercel Postgres, run:

```bash
npm run db:setup
```

This creates the `analyses` table with all necessary indexes.

## API Endpoints

### POST /api/analyze

Submit analysis data from the extension. The request body is limited to 64 KiB of UTF-8 bytes, enforced while reading the stream (413 if exceeded). Invalid JSON or malformed retained fields return 400 with `{ success: false, error: 'Invalid telemetry' }`.

The API accepts finite confidence from 0 through 100 and recognized current/legacy rendering labels. It requires an HTTP(S) URL without credentials, stores only its origin and derives the authoritative hostname from that URL. Supplied paths, queries and fragments are not stored. Missing/null optional metric groups remain null; retained counts, timings, percentages, booleans and closed-vocabulary labels are validated without numeric-string coercion. `performanceMetrics.hybridScore` is an unnormalized points accumulator (currently up to 140), not a percentage: finite nonnegative values through `Number.MAX_SAFE_INTEGER` are preserved without clamping, including in historical aggregates. Actual percentages and normalized health/confidence scores remain bounded to 0..100. Unknown fields are dropped for compatibility.

`lib/telemetry-schema.ts` defines the input allowlist and the separate public record projection. Hydration retains only count/score; navigation retains aggregate flags/counts. Incoming free-form indicators, raw user-agent values, page titles, SEO text/structured-data strings, raw errors and route details are not stored. Country is derived from validated hosting-platform metadata, not the submitted device country.

**Headers**:

- `Content-Type`: application/json
- `x-api-key`: (Optional) API key if configured on server

**Body**:

```json
{
  "url": "https://example.com",
  "domain": "example.com",
  "renderType": "Server-Side Rendered (SSR)",
  "confidence": 85,
  "frameworks": ["Next.js", "React"],
  "performanceMetrics": {
    "domReady": 125,
    "fcp": 650
  },
  "version": "3.7.0"
}
```

**Response**:

```json
{
  "success": true,
  "id": 123
}
```

### GET /api/stats

Get public aggregate statistics. `recent` and `all.recent` expose only the public DTO: ID, hostname, rendering label, confidence, timestamp, normalized frameworks/tech labels, validated performance metrics, hydration count/score, SPA flag/client-route count and country. URLs, user agents, indicators, SEO records, raw errors/routes and other device fields are excluded, including for historical records. The server-rendered dashboard uses the same `getRecentAnalyses` projection.

Historical numeric JSONB values are type/range-checked before aggregation; malformed values are ignored rather than cast unsafely. Historical public category names are normalized or filtered. Existing CWV thresholds are unchanged.

**Query Parameters**:

- `type`: `all`, `total`, `frameworks`, `domains`, `timeline`, `recent`, `contentComparison`
- `limit`: Integer 1..100 (frameworks default 10; domains/recent default 20)
- `offset`: Integer 0..100000 (recent default 0)
- `days`: Integer 1..365 (timeline default 30)

Invalid, fractional, negative, out-of-range or trailing-junk query values return 400 with `{ success: false, error: 'Invalid query parameters' }`.

**Examples**:

- `/api/stats?type=all` - All stats (Phase 1-3, preferred)
- `/api/stats?type=frameworks&limit=10` - Top 10 frameworks
- `/api/stats?type=timeline&days=7` - Last 7 days

### DELETE /api/analyze/[id]

Deletion is disabled. Every request returns HTTP 403 and `{ success: false, error: 'Analysis deletion is disabled' }`, regardless of ID, Referer or API-key configuration. No database mutation is performed. OPTIONS does not advertise DELETE, and the public dashboard has no deletion controls. There is no new administrator login or key.

## Dashboard

Access at: `/dashboard`

Features:

- Total analyses count
- SSR/CSR/Hybrid distribution
- Top frameworks detected
- Timeline of analyses
- Recent analyses table
- Real-time updates

## Chrome Extension Integration

Telemetry is already built into the extension (since v3.2.0) — see
`sendAnalysisData()` in `extension/popup.js`. To point it at your own
deployment, change the `BACKEND_URL` constant there. Users can opt out via
the "Share Anonymous Data" toggle in the extension settings.

## Security

- CORS is not authentication. The existing optional ingestion-key policy is unchanged: when configured, the key is required for POST; without it, ingestion remains public.
- Public deletion is disabled independently of ingestion policy.
- Strict bounded input and public-output projections minimize retained and exposed fields; this is not a blanket anonymity guarantee.
- HTTPS is used in production.

### Operational follow-up

These source changes do not deploy anything, inspect production records or delete historical data. Previously accepted raw fields may remain in private database storage after the public projection is deployed. Historical cleanup requires separate approval. Review hosting/log retention and store disclosures against the updated extension privacy policy before release; no live store settings have been changed.

Authentication redesign, distributed rate limiting, consent-default redesign and extension history/CSV cleanup remain separate work. No new secret, provider, per-process limiter or migration is introduced here.

Run mocked tests with `npm run test:run` and typecheck with `npm run typecheck`; do not supply production database credentials for verification.

## Monitoring

- Check Vercel dashboard for deployment logs
- Monitor database usage in Vercel Postgres tab
- Set up alerts for errors

## Cost Estimate

**Free Tier (Starting out)**:

- Vercel: Free (100GB bandwidth, unlimited requests)
- Vercel Postgres: Free (256MB storage, 60 hours compute/month)

**Pro Tier (If you exceed free tier)**:

- Vercel Pro: $20/month
- Postgres Pro: $10+/month

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history.

## Related

- [Main Project README](../README.md)
- [Chrome Extension](../extension)
- [Chrome Web Store](https://chromewebstore.google.com/detail/csr-vs-ssr-detector/fhiopdjeekafnhmfbcfoolhejdgjpkgg)

## Support

For issues or questions:

- [GitHub Issues](https://github.com/dzienisz/chrome-ssr-csr/issues)
- Check Vercel logs for errors
- Review database queries in Vercel Postgres dashboard
- Check environment variables are set correctly

## License

MIT License - see [LICENSE](../LICENSE)
