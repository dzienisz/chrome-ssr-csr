# Quick Deploy Guide

## Deploy to Vercel (5 minutes)

### Step 1: Install Vercel CLI
```bash
npm i -g vercel
```

### Step 2: Login
```bash
vercel login
```

### Step 3: Navigate and Deploy
```bash
cd backend
npm install
vercel
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **N**
- Project name? **ssr-csr-analytics** (or your choice)
- Directory? **./backend** (it should detect this)
- Override settings? **N**

### Step 4: Add Database

1. Go to https://vercel.com/dashboard
2. Click on your new project
3. Go to **Storage** tab
4. Click **Create Database**
5. Select **Postgres**
6. Click **Create**

Environment variables are automatically added!

### Step 5: Set API Key

In Vercel dashboard:
1. Go to **Settings** > **Environment Variables**
2. Add new variable:
   - Name: `API_SECRET_KEY`
   - Value: Generate a secure random string (e.g., run `openssl rand -hex 32`)
   - Save

### Step 6: Setup Database

Back in your terminal:
```bash
# Pull the environment variables locally
vercel env pull .env.local

# Run the database setup
npm run db:setup
```

### Step 7: Deploy to Production
```bash
vercel --prod
```

Your app is live! 🎉

Note your URL: `https://your-project.vercel.app`

### Step 8: Test It

Visit your dashboard:
```
https://your-project.vercel.app/dashboard
```

Test the API:
```bash
curl -X POST https://your-project.vercel.app/api/analyze \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "url": "https://example.com",
    "domain": "example.com",
    "renderType": "Server-Side Rendered (SSR)",
    "confidence": 85,
    "frameworks": ["Next.js"],
    "performanceMetrics": {},
    "indicators": ["Test"],
    "version": "3.0.5"
  }'
```

## Alternative: Deploy via GitHub

1. **Push to GitHub**:
```bash
cd backend
git init
git add .
git commit -m "Initial backend"
git remote add origin https://github.com/yourusername/ssr-csr-analytics.git
git push -u origin main
```

2. **Import to Vercel**:
   - Go to https://vercel.com/new
   - Import your repository
   - Select the `backend` folder as root directory
   - Click Deploy

3. **Add Database** (same as Step 4 above)

4. **Add Environment Variables** (same as Step 5 above)

5. **Setup Database** (same as Step 6 above)

## What You Get

- **API Endpoint**: `https://your-app.vercel.app/api/analyze`
- **Dashboard**: `https://your-app.vercel.app/dashboard`
- **Home**: `https://your-app.vercel.app`

## Next: Integrate with Extension

See `EXTENSION_INTEGRATION.md` for connecting your Chrome extension to the backend.

## Monitoring

- **Logs**: https://vercel.com/dashboard > Your Project > Logs
- **Database**: https://vercel.com/dashboard > Your Project > Storage
- **Analytics**: Built into Vercel dashboard

## Costs

- **Free Tier**: Good for thousands of analyses per month
- **If you exceed**: Vercel Pro ($20/month) + Postgres ($10+/month)

## Troubleshooting

**Database connection error?**
- Make sure you created Vercel Postgres in Step 4
- Run `vercel env pull` to sync environment variables
- Redeploy: `vercel --prod`

**API returns 401?**
- Check that API_SECRET_KEY is set in Vercel dashboard
- Make sure you're sending the correct key in `x-api-key` header

**Dashboard shows no data?**
- Database might not be set up - run `npm run db:setup`
- Check that analyses table exists in Vercel Postgres dashboard
