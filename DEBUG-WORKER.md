# 🐛 Debug Worker Issues

## Current Problem

Route is configured but embeds still show generic site info. This means the Worker is either:
1. Not intercepting requests
2. Not detecting bots
3. Hitting an error and falling back

## What I Fixed

✅ **Fixed bug:** `productId` was used before being defined (causing crash)
✅ **Improved bot detection:** Better Facebook crawler detection
✅ **Added error handling:** Better logging to debug issues
✅ **Fixed logic:** Combined bot checks properly

## Check Worker Logs

1. Go to Cloudflare Dashboard
2. **Workers & Pages** → `og-meta-handler` → **Logs**
3. Test with Facebook Debugger
4. Look for:
   - "Bot detected on product page: facebookexternalhit..."
   - "Product found: [name]"
   - "Product image URL: [url]"
   - Any errors

## Test the Worker

### Test 1: Check if Route is Active

1. Go to domain: **thesolowardrobe.com**
2. **Workers Routes**
3. Verify route shows:
   - Route: `thesolowardrobe.com/product/*`
   - Status: **Active** or **Enabled**

### Test 2: Test with Bot User Agent

```powershell
# PowerShell
$response = Invoke-WebRequest -Uri "https://thesolowardrobe.com/product/6797971343086091435" -Headers @{"User-Agent"="facebookexternalhit/1.1"}
$response.Content | Select-String -Pattern "og:title" -Context 0,2
```

**Expected:** Product-specific title
**If generic:** Worker not intercepting

### Test 3: Check Worker Logs After Test

After running Test 2, check Worker logs. You should see:
- "Bot detected on product page: facebookexternalhit..."
- "Product found: [name]"
- "Product image URL: [url]"

If you see errors, that's the issue!

## Common Issues

### Issue 1: Worker Not Intercepting

**Symptom:** No logs appear, generic embeds
**Fix:** 
- Verify route is active
- Check route pattern is correct: `thesolowardrobe.com/product/*`
- Ensure Worker is deployed (not draft)

### Issue 2: Bot Not Detected

**Symptom:** Logs show "Regular user" or no bot detection
**Fix:**
- Check User-Agent in logs
- Verify bot detection regex matches Facebook's crawler
- Test with explicit bot user agent

### Issue 3: Product Not Found

**Symptom:** Logs show "Product not found for ID: [id]"
**Fix:**
- Verify product ID format matches products.json
- Check products.json is accessible
- Verify product exists in products.json

### Issue 4: Image URL Issues

**Symptom:** Logs show "No product image, using fallback"
**Fix:**
- Check product has image in products.json
- Verify image path format
- Check image is accessible at the URL

## Next Steps

1. **Check Worker Logs** - This will tell you exactly what's happening
2. **Test with bot user agent** - Verify Worker intercepts
3. **Check for errors** - Any errors will show in logs
4. **Verify product data** - Ensure product exists and has image

## After Fixing

1. Wait 1-2 minutes
2. Test with Facebook Debugger (Scrape Again)
3. Should see product-specific OG tags

