# 🔧 Fix: Cloudflare Worker Not Working for OG Tags

## Problem
The Worker for OG tags (embeds) is not working because:
1. Worker may not be deployed
2. Worker route may not be configured
3. Worker is fetching from old Hostinger VPS instead of Cloudflare Pages

## Solution: Deploy and Configure Worker

### Step 1: Deploy the Worker

#### Option A: Using Cloudflare Dashboard (Easiest)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → **Create Application** → **Create Worker**
3. Name it: `og-meta-handler`
4. Click **Deploy** (creates a template)
5. Click **Edit Code**
6. **Delete everything** in the editor
7. Copy the entire content from `cloudflare-worker.js` in your project
8. **Paste it** into the editor
9. Click **Save and Deploy**

#### Option B: Using Wrangler CLI

1. Install Wrangler (if not already):
   ```bash
   npm install -g wrangler
   ```

2. Login to Cloudflare:
   ```bash
   wrangler login
   ```

3. Create `wrangler-og.toml` in your project root:
   ```toml
   name = "og-meta-handler"
   main = "cloudflare-worker.js"
   compatibility_date = "2024-01-01"
   ```

4. Deploy:
   ```bash
   wrangler deploy --config wrangler-og.toml
   ```

### Step 2: Configure Worker Route

**IMPORTANT:** The Worker must be routed to intercept product page requests.

1. Go to Cloudflare Dashboard
2. Select your domain: **thesolowardrobe.com**
3. Go to **Workers Routes** (in left sidebar under Workers section)
4. Click **Add Route**
5. Configure:
   - **Route**: `thesolowardrobe.com/product/*`
   - **Worker**: Select `og-meta-handler`
   - **Zone**: `thesolowardrobe.com`
6. Click **Save**

### Step 3: Verify Worker is Working

Test with a bot user agent:

```bash
# Using curl (Linux/Mac)
curl -H "User-Agent: WhatsApp/2.0" "https://thesolowardrobe.com/product/7362216615470562330" | grep "og:title"

# Using PowerShell (Windows)
Invoke-WebRequest -Uri "https://thesolowardrobe.com/product/7362216615470562330" -Headers @{"User-Agent"="WhatsApp/2.0"} | Select-Object -ExpandProperty Content | Select-String "og:title"
```

You should see:
```html
<meta property="og:title" content="[Product Name] – Solo Wardrobe" />
```

### Step 4: Test in Facebook Debugger

1. Go to [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
2. Enter: `https://thesolowardrobe.com/product/7362216615470562330`
3. Click **Debug**
4. Click **Scrape Again** to clear cache
5. You should see the product-specific OG tags

## Troubleshooting

### Worker Not Intercepting Requests

**Check:**
1. Route is configured: `thesolowardrobe.com/product/*` (not `https://thesolowardrobe.com/product/*`)
2. Worker is deployed and active
3. Route is enabled (not paused)

**Fix:**
- Go to Workers Routes → Edit route → Ensure it's enabled

### Worker Fetching from Old VPS

**Problem:** Worker tries to fetch `https://thesolowardrobe.com/index.html` but gets old VPS content.

**Solution:** The worker should automatically fetch from Cloudflare Pages now that your domain points to Pages. If it doesn't:

1. Verify DNS is pointing to Cloudflare Pages:
   - Go to DNS Records
   - Ensure CNAME records point to your Pages project
   
2. The worker code already uses `https://thesolowardrobe.com` which should resolve to Pages

### Still Not Working?

1. **Check Worker Logs:**
   - Go to Workers & Pages → `og-meta-handler` → Logs
   - Look for errors

2. **Test Worker Directly:**
   - Go to Workers & Pages → `og-meta-handler` → Settings
   - Copy the Worker URL (e.g., `og-meta-handler.YOUR-SUBDOMAIN.workers.dev`)
   - Test: `https://og-meta-handler.YOUR-SUBDOMAIN.workers.dev?url=https://thesolowardrobe.com/product/7362216615470562330`

3. **Verify Bot Detection:**
   - The worker only activates for bots
   - Test with: `User-Agent: WhatsApp/2.0` or `facebookexternalhit/1.1`

## Quick Checklist

- [ ] Worker `og-meta-handler` is created and deployed
- [ ] Worker route is configured: `thesolowardrobe.com/product/*`
- [ ] Route is enabled (not paused)
- [ ] DNS points to Cloudflare Pages (CNAME to Pages project)
- [ ] Test with bot user agent shows OG tags
- [ ] Facebook Debugger shows correct preview

## After Fix

Once working:
- WhatsApp/Facebook shares will show product-specific previews
- Twitter/LinkedIn embeds will work
- All social media crawlers will see proper OG tags

