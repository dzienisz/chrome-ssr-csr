# SSR/CSR Analytics Backend

Backend service and dashboard for the Chrome SSR/CSR Detector extension.

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

# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment to Vercel

### Option 1: Using Vercel CLI (Recommended)

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

6. **Set API Key**:
   - In Vercel dashboard, go to Settings > Environment Variables
   - Add `API_SECRET_KEY` with a secure random value
   - Add `NEXTAUTH_SECRET` with output from: `openssl rand -base64 32`

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

Submit analysis data from the extension.

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
  "indicators": ["Rich initial content", "Hydration markers"],
  "version": "3.0.5"
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

Get aggregated statistics.

**Query Parameters**:
- `type`: `all`, `total`, `frameworks`, `domains`, `timeline`, `recent`
- `limit`: Number of results (for frameworks, domains, recent)
- `days`: Number of days for timeline (default: 30)

**Examples**:
- `/api/stats?type=all` - All stats
- `/api/stats?type=frameworks&limit=10` - Top 10 frameworks
- `/api/stats?type=timeline&days=7` - Last 7 days

## Dashboard

Access at: `/dashboard`

Features:
- Total analyses count
- SSR/CSR/Hybrid distribution
- Top frameworks detected
- Timeline of analyses
- Recent analyses table
- Real-time updates

## Updating the Chrome Extension

After deploying, update your extension to send data to the backend:

1. Add the API endpoint URL to extension settings
2. Add the API key securely (don't hardcode in extension)
3. Update the telemetry code to call your API

See `EXTENSION_INTEGRATION.md` for detailed instructions.

## Security

- CORS headers restrict browser requests to allowed origins
- Optional API key authentication (disabled by default)
- Rate limiting (implement with Upstash Redis in production)
- Input validation and sanitization
- No sensitive user data stored (only domains, not full URLs)
- HTTPS only in production

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

## Support

For issues or questions:
- Check Vercel logs for errors
- Review database queries in Vercel Postgres dashboard
- Check environment variables are set correctly
