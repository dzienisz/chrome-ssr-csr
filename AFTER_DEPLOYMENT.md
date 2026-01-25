# After Deployment - Complete Integration Guide

After you've deployed your backend to Vercel, follow these steps to complete the integration.

## ✅ What You Should Have After Deployment

1. **Backend URL**: `https://your-project.vercel.app`
2. **API Secret Key**: The key you set in Vercel dashboard
3. **Database**: Vercel Postgres with tables created

## Step 1: Update Extension with Your Backend Details

### Update Telemetry Configuration

Edit `src/telemetry.js` and replace the placeholder values:

```javascript
// Line 7-8: Replace with your actual values
const BACKEND_URL = 'https://your-actual-project.vercel.app';  // ← Your Vercel URL
const API_KEY = 'your-actual-api-secret-key';                   // ← Your API key from Vercel
```

**How to get these values:**

1. **Backend URL**:
   - Go to https://vercel.com/dashboard
   - Click on your project
   - Copy the URL (e.g., `https://ssr-csr-analytics.vercel.app`)

2. **API Key**:
   - In Vercel project → Settings → Environment Variables
   - Copy the value of `API_SECRET_KEY`

## Step 2: Test Locally

1. **Reload the extension**:
   ```
   1. Open chrome://extensions
   2. Find "CSR vs SSR Detector"
   3. Click the refresh icon 🔄
   ```

2. **Enable data sharing**:
   ```
   1. Click extension icon
   2. Click Settings (gear icon)
   3. Toggle "Share anonymous usage data" ON
   4. Save settings
   ```

3. **Test the integration**:
   ```
   1. Navigate to any website (e.g., https://nextjs.org)
   2. Click extension icon
   3. Click "Analyze Page"
   4. Check browser console (F12) for telemetry logs
   ```

   You should see:
   ```
   [Telemetry] Sending analysis data to backend...
   [Telemetry] Data sent successfully: {success: true, id: 1}
   [Extension] Telemetry data sent
   ```

4. **Check your dashboard**:
   - Go to `https://your-project.vercel.app/dashboard`
   - You should see your test analysis appear!

## Step 3: Verify Data in Dashboard

Visit your dashboard and check:
- ✅ Total analyses count increased
- ✅ Render type appears in the distribution chart
- ✅ Framework detected appears in the bar chart
- ✅ Recent analyses table shows your test
- ✅ Timeline chart shows today's date with 1 analysis

## Step 4: Update Manifest Version

Update `manifest.json`:

```json
{
  "version": "3.1.0"
}
```

This indicates the new telemetry feature.

## Step 5: Update Privacy Policy

Update your `privacy-policy.md` (already exists) to ensure it mentions:

1. What data is collected (domain, render type, frameworks, performance metrics)
2. That it's opt-in only
3. That full URLs are NOT stored (only domains)
4. How to opt-out

The privacy policy is already comprehensive, but double-check it includes backend data collection.

## Step 6: Package and Submit Update

1. **Test thoroughly**:
   - Test on multiple websites
   - Test with data sharing ON and OFF
   - Check dashboard shows all data correctly
   - Test on SSR, CSR, and hybrid sites

2. **Package the extension**:
   ```bash
   # Navigate to extension root
   cd /Users/home/Developer/chrome-ssr-csr

   # Create a zip excluding unnecessary files
   zip -r chrome-ssr-csr-v3.1.0.zip . \
     -x "*.git*" \
     -x "backend/*" \
     -x "node_modules/*" \
     -x "*.md" \
     -x "*.zip"
   ```

3. **Upload to Chrome Web Store**:
   - Go to https://chrome.google.com/webstore/devconsole
   - Select your extension
   - Click "Upload new package"
   - Upload the zip file
   - Update version notes to mention analytics feature
   - Submit for review

## Troubleshooting

### Data not appearing in dashboard?

**Check browser console (F12)**:
- Do you see `[Telemetry] User has not opted in`? → Enable data sharing in settings
- Do you see `401 Unauthorized`? → Check API key is correct
- Do you see CORS errors? → API route already has CORS headers, check network tab
- Do you see network timeout? → Check backend URL is correct

**Check Vercel logs**:
```
1. Go to https://vercel.com/dashboard
2. Click your project
3. Go to "Logs" tab
4. Look for /api/analyze requests
```

**Common issues**:

1. **401 Unauthorized**: API key mismatch
   - Double-check the key in `src/telemetry.js`
   - Verify it matches Vercel environment variable

2. **404 Not Found**: Wrong URL
   - Verify BACKEND_URL in telemetry.js
   - Should NOT have trailing slash

3. **CORS errors**: Shouldn't happen, but if it does:
   - Check backend is deployed
   - Verify API route has CORS headers (already included)

4. **No data in console**: Extension not loading telemetry
   - Check `src/telemetry.js` exists
   - Reload extension
   - Check for JavaScript errors in console

### Testing without real users

Send test data using curl:

```bash
curl -X POST https://your-project.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
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
    "version": "3.1.0"
  }'
```

Expected response:
```json
{
  "success": true,
  "id": 123
}
```

## Monitoring Your Backend

### Check Usage

**Vercel Dashboard**:
- Go to your project → Analytics
- See function invocations
- Monitor response times
- Check for errors

**Database**:
- Go to your project → Storage → Postgres
- Click "Data" to see stored analyses
- Monitor storage usage

### Costs to Watch

**Free tier limits**:
- Vercel: 100GB bandwidth/month
- Postgres: 256MB storage, 60 hours compute/month

**If you exceed**:
- You'll get email notifications
- Can upgrade to Pro ($20/month) + Postgres Pro ($10+/month)

### Set Up Alerts (Optional)

In Vercel dashboard:
1. Go to Settings → Notifications
2. Enable email alerts for:
   - Failed deployments
   - High usage warnings
   - Error rate spikes

## Next Steps

Once everything is working:

1. **Monitor for a few days**: Watch dashboard to see real data coming in
2. **Analyze trends**: Look for patterns in SSR vs CSR usage
3. **Share insights**: Use the data to improve the extension's detection algorithm
4. **Iterate**: Add more charts or insights to dashboard as needed

## Optional Enhancements

### Make Backend URL Configurable

Instead of hardcoding in telemetry.js, you could:

1. Add to options page:
   ```javascript
   // In options.html, add input field
   backendUrl: settings.backendUrl || 'https://default.vercel.app'
   ```

2. Read from settings in telemetry.js:
   ```javascript
   const settings = await chrome.storage.sync.get(['backendUrl', 'apiKey']);
   const BACKEND_URL = settings.backendUrl;
   ```

### Add Rate Limiting

To prevent abuse, implement rate limiting using Upstash Redis:

1. Add Upstash Redis in Vercel dashboard (Storage → Create)
2. Update `lib/auth.ts` to use Redis for rate limiting
3. Free tier: 10,000 commands/day

### Add More Analytics

Enhance the dashboard with:
- Performance averages by framework
- Most common SSR/CSR patterns
- Geographic distribution (if storing regions)
- Extension version adoption rates

## Support

If you run into issues:
1. Check Vercel function logs
2. Check browser console
3. Verify environment variables
4. Test API endpoint with curl
5. Check database has data

---

**Congratulations! 🎉**

Your extension now has a full backend analytics system. You can now see:
- How many people use your extension
- What sites they analyze
- Which frameworks are most common
- SSR vs CSR trends over time

This data will help you improve the extension and understand web rendering trends!
