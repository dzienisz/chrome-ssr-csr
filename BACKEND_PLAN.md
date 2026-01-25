# Backend Implementation Plan

## Overview
Add a backend system to collect and analyze usage data from the Chrome extension.

## Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **Hosting**: Vercel
- **Database**: Vercel Postgres or Supabase (PostgreSQL)
- **Auth** (for dashboard): NextAuth.js or Clerk
- **Analytics/Charts**: Recharts or Tremor

## Project Structure

```
ssr-csr-analytics/          # New separate repository
├── app/
│   ├── api/
│   │   ├── analyze/route.ts    # Endpoint to receive analysis data
│   │   └── stats/route.ts      # Endpoint to fetch aggregated stats
│   ├── dashboard/
│   │   └── page.tsx            # Main dashboard UI
│   └── page.tsx                # Public landing page
├── lib/
│   ├── db.ts                   # Database client
│   └── analytics.ts            # Analytics logic
└── components/
    └── charts/                 # Chart components
```

## Database Schema

```sql
CREATE TABLE analyses (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT NOW(),
  url TEXT NOT NULL,
  domain TEXT NOT NULL,
  render_type VARCHAR(50) NOT NULL,
  confidence INTEGER NOT NULL,
  frameworks JSONB,
  performance_metrics JSONB,
  indicators TEXT[],
  extension_version VARCHAR(20),
  user_agent TEXT,
  -- Optional: anonymized user identifier (hash)
  user_hash VARCHAR(64)
);

CREATE INDEX idx_timestamp ON analyses(timestamp);
CREATE INDEX idx_domain ON analyses(domain);
CREATE INDEX idx_render_type ON analyses(render_type);

-- Aggregated stats table for faster queries
CREATE TABLE daily_stats (
  date DATE PRIMARY KEY,
  total_analyses INTEGER,
  ssr_count INTEGER,
  csr_count INTEGER,
  hybrid_count INTEGER,
  top_frameworks JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Implementation Steps

### Phase 1: Backend Setup (1-2 days)

1. **Create Next.js project**
   ```bash
   npx create-next-app@latest ssr-csr-analytics --typescript --tailwind --app
   cd ssr-csr-analytics
   ```

2. **Set up database**
   - Option A: Vercel Postgres (easiest)
   - Option B: Supabase (more features, free tier)

3. **Create API endpoint** (`app/api/analyze/route.ts`)
   ```typescript
   export async function POST(request: Request) {
     const data = await request.json();
     // Validate data
     // Insert into database
     // Return success
   }
   ```

4. **Add rate limiting** (prevent abuse)
   - Use Upstash Redis with Vercel
   - Limit per IP: 100 requests/hour

### Phase 2: Extension Integration (1 day)

1. **Update extension `options.js`**
   - `shareData` setting already exists (line 46 in popup.js)
   - Add API endpoint configuration

2. **Add telemetry module** (`src/telemetry.js`)
   ```javascript
   function sendAnalysisData(url, title, results) {
     chrome.storage.sync.get(['shareData'], async (settings) => {
       if (settings.shareData) {
         await fetch('https://your-analytics.vercel.app/api/analyze', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             url: anonymizeUrl(url),  // Strip query params
             domain: new URL(url).hostname,
             renderType: results.renderType,
             confidence: results.confidence,
             frameworks: results.detailedInfo.frameworks,
             performanceMetrics: {
               domReady: results.detailedInfo.domReadyTime,
               fcp: results.detailedInfo.fcp
             },
             indicators: results.indicators,
             version: chrome.runtime.getManifest().version,
             timestamp: new Date().toISOString()
           })
         });
       }
     });
   }
   ```

3. **Call from `popup.js`** after analysis completes

### Phase 3: Dashboard UI (2-3 days)

1. **Authentication** (protect dashboard)
   - Use Clerk or NextAuth.js
   - Only you need access initially

2. **Dashboard features**
   - Total analyses over time (line chart)
   - SSR vs CSR distribution (pie chart)
   - Top frameworks detected (bar chart)
   - Top domains analyzed (table)
   - Average confidence scores
   - Real-time activity feed
   - Filters: date range, render type, framework

3. **Example components**
   - Use Tremor or Shadcn/ui for pre-built chart components
   - Recharts for custom visualizations

### Phase 4: Privacy & Compliance (1 day)

1. **Update extension privacy policy**
   - Clearly explain what data is collected
   - Explain it's opt-in only
   - Provide opt-out instructions

2. **Data anonymization**
   - Don't store full URLs (strip paths/queries, or hash them)
   - Store only domains
   - No personal user data
   - Optional: Generate anonymous user hash (for session tracking)

3. **GDPR compliance**
   - Add data export endpoint
   - Add data deletion endpoint
   - Document data retention policy

## Cost Estimate

**Free Tier (Starting out):**
- Vercel: Free (hobby plan)
- Vercel Postgres: Free tier (256MB, 60 hours compute)
- Domain: ~$10/year

**When scaling (1000+ users):**
- Vercel Pro: $20/month
- Database: $10-50/month (depends on usage)

## Environment Variables

```env
# .env.local
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-secret
API_KEY=your-api-key  # For extension authentication
```

## Deployment Steps

1. Push Next.js project to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy (automatic)
5. Update extension with production API URL
6. Submit extension update to Chrome Web Store

## Metrics to Track

### Usage Metrics
- Daily/weekly/monthly active users
- Analyses per user
- Most analyzed domains
- Popular frameworks

### Detection Metrics
- SSR/CSR/Hybrid distribution
- Average confidence scores
- Most common indicators
- Framework combinations

### Performance Metrics
- Average DOM ready time by render type
- Average FCP by render type
- Correlation: framework vs performance

## Alternative: Simpler Options

If you want to start simpler:

1. **Firebase/Firestore** (backend-as-a-service)
   - No backend code needed
   - Built-in analytics
   - Free tier: 50K reads/day

2. **Google Analytics 4** (via Measurement Protocol)
   - Track events directly
   - Pre-built reports
   - No custom backend needed

3. **Supabase** (PostgreSQL + API + Dashboard)
   - Auto-generated REST API
   - Built-in dashboard
   - Generous free tier

## Security Considerations

1. **API Authentication**
   - Extension includes API key in requests
   - Store key securely in extension
   - Rotate periodically

2. **Rate Limiting**
   - Prevent abuse/spam
   - 100 requests/hour per IP

3. **Input Validation**
   - Validate all incoming data
   - Sanitize URLs
   - Check data types

4. **HTTPS Only**
   - All API calls over HTTPS
   - Enforce in Next.js config

## Next Steps

1. Decide: Full Next.js app or simpler option (Firebase/Supabase)?
2. Create new repository for backend project
3. Set up database
4. Implement basic API endpoint
5. Test with extension locally
6. Add dashboard UI
7. Deploy to Vercel
8. Update extension with production endpoint
9. Submit extension update
