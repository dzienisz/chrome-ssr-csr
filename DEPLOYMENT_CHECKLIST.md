# Deployment Checklist

Quick reference for deploying the backend and integrating with your extension.

## 📋 Before You Start

- [ ] Chrome SSR/CSR extension is working locally
- [ ] You have a Vercel account
- [ ] You have access to terminal

---

## 🚀 PART 1: Deploy Backend (5-10 minutes)

### 1. Login to Vercel
```bash
cd backend
npx vercel login
```

### 2. Deploy
```bash
npx vercel
```
Answer prompts:
- Set up and deploy? → **Y**
- Which scope? → Select your account
- Link to existing project? → **N**
- Project name? → **ssr-csr-analytics**
- Directory? → Press Enter
- Override settings? → **N**

✅ **Save the URL shown!** (e.g., `https://ssr-csr-analytics.vercel.app`)

### 3. Add Database
1. Go to https://vercel.com/dashboard
2. Click your project
3. Storage tab → Create Database → Postgres → Create

### 4. Generate & Set API Key
```bash
# Generate key
openssl rand -hex 32
```

Then in Vercel dashboard:
1. Settings → Environment Variables
2. Add New:
   - Name: `API_SECRET_KEY`
   - Value: (paste the generated key)
   - ✅ Production, Preview, Development

✅ **Save this API key!** You'll need it for the extension.

### 5. Setup Database
```bash
# Pull environment variables
npx vercel env pull .env.local

# Create tables
npm run db:setup
```

### 6. Deploy to Production
```bash
npx vercel --prod
```

✅ **Backend is live!**

---

## 🔌 PART 2: Integrate Extension (5 minutes)

### 1. Update Telemetry Config

Edit `src/telemetry.js`:

```javascript
// Line 7: Your Vercel URL
const BACKEND_URL = 'https://ssr-csr-analytics.vercel.app';  // ← CHANGE THIS

// Line 10: Your API key from Step 4
const API_KEY = 'abc123...';  // ← CHANGE THIS
```

### 2. Reload Extension
1. Open `chrome://extensions`
2. Find "CSR vs SSR Detector"
3. Click refresh icon 🔄

### 3. Enable Data Sharing
1. Click extension icon
2. Click Settings ⚙️
3. Toggle "Share anonymous usage data" → **ON**
4. Save

### 4. Test It!
1. Go to https://nextjs.org
2. Click extension icon
3. Click "Analyze Page"
4. Open console (F12)
5. Look for: `[Telemetry] Data sent successfully`

### 5. Check Dashboard
Visit: `https://your-project.vercel.app/dashboard`

You should see your test analysis! 🎉

---

## 📦 PART 3: Release Update (Optional)

### 1. Update Version
Edit `manifest.json`:
```json
"version": "3.1.0"
```

### 2. Package Extension
```bash
zip -r chrome-ssr-csr-v3.1.0.zip . \
  -x "*.git*" "backend/*" "node_modules/*" "*.md" "*.zip"
```

### 3. Upload to Chrome Web Store
1. Go to https://chrome.google.com/webstore/devconsole
2. Upload new package
3. Update release notes: "Added anonymous analytics dashboard"
4. Submit for review

---

## ✅ Verification Checklist

### Backend Working:
- [ ] Can visit dashboard at `/dashboard`
- [ ] Dashboard loads without errors
- [ ] Stats show 0 or test data

### Extension Working:
- [ ] Extension analyzes pages normally
- [ ] Console shows telemetry logs
- [ ] Data appears in dashboard
- [ ] Works with data sharing OFF (no errors)

### Production Ready:
- [ ] Tested on multiple websites
- [ ] Dashboard shows correct data
- [ ] Privacy policy reviewed
- [ ] Version bumped to 3.1.0

---

## 🐛 Quick Troubleshooting

**"401 Unauthorized"**
→ API key mismatch, check `src/telemetry.js` line 10

**"No data in dashboard"**
→ Check data sharing is enabled in settings

**"Cannot read property..."**
→ Reload extension, check console for errors

**"CORS error"**
→ Verify backend URL in telemetry.js (no trailing slash)

---

## 📊 Your URLs

After deployment, save these:

- **Dashboard**: `https://your-project.vercel.app/dashboard`
- **API Endpoint**: `https://your-project.vercel.app/api/analyze`
- **Vercel Project**: `https://vercel.com/dashboard`

---

## 🎯 What You Get

✅ Real-time analytics dashboard
✅ See how many people use your extension
✅ Track SSR vs CSR trends
✅ Monitor popular frameworks
✅ Performance metrics over time
✅ All data private and anonymous

---

Need detailed help? See:
- `backend/README.md` - Full backend documentation
- `backend/DEPLOY.md` - Detailed deployment guide
- `AFTER_DEPLOYMENT.md` - Complete integration guide
