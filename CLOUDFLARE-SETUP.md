# 🚀 Cloudflare Worker Setup (5 Minutes, 100% Free)

**This is the simplest solution. No servers, no backend, completely free.**

## Why This is Perfect:

✅ **Free**: 100,000 requests per day on free plan
✅ **Fast**: Runs on Cloudflare's edge network (faster than your server)
✅ **Zero Maintenance**: No servers to manage
✅ **Simple**: Just copy-paste the code
✅ **Works Immediately**: No deployment complexity

---

## Step 1: Add Your Domain to Cloudflare (if not already)

1. Go to https://cloudflare.com and sign up (free)
2. Add your domain `thesolowardrobe.com`
3. Update your domain's nameservers to Cloudflare's nameservers (they'll tell you which ones)
4. Wait for DNS to propagate (5-30 minutes)

> **If your domain is already on Cloudflare, skip to Step 2!**

---

## Step 2: Create the Worker (2 minutes)

1. Go to https://dash.cloudflare.com
2. Click on **Workers & Pages** in the left sidebar
3. Click **Create Application** → **Create Worker**
4. Give it a name like `og-meta-handler`
5. Click **Deploy** (it creates a template)

---

## Step 3: Add the Code (1 minute)

1. After deploying, click **Edit Code**
2. **Delete everything** in the editor
3. Copy the entire content from `cloudflare-worker.js`
4. **Paste it** into the editor
5. Click **Save and Deploy**

---

## Step 4: Add Worker Route (1 minute)

1. Go back to the Cloudflare dashboard
2. Select your website (`thesolowardrobe.com`)
3. Click **Workers Routes** (under Workers)
4. Click **Add Route**
5. Enter:
   - **Route**: `thesolowardrobe.com/product/*`
   - **Worker**: Select `og-meta-handler` (the one you created)
6. Click **Save**

---

## Step 5: Test It! (30 seconds)

```bash
# Test from terminal (simulating WhatsApp bot):
curl -H "User-Agent: WhatsApp/2.0" "https://thesolowardrobe.com/product/5487546952058530185" | grep "og:title"
```

You should see:
```html
<meta property="og:title" content="Men Black Sneaker Shoes – Solo Wardrobe" />
```

---

## How It Works:

```
Bot visits product page → Cloudflare Worker intercepts → Adds OG tags → Returns modified HTML
Regular user visits → Worker does nothing → Fast SPA loads normally
```

**Bots**: See product-specific meta tags
**Users**: See your normal fast SPA

---

## Test in WhatsApp:

Share this URL (with a new parameter to bypass cache):
```
https://thesolowardrobe.com/product/5487546952058530185?share=1
```

Or use Facebook Debugger:
https://developers.facebook.com/tools/debug/

---

## Troubleshooting:

**Q: Still seeing old preview?**
A: WhatsApp caches for 7 days. Add `?v=2` to the URL or wait.

**Q: Worker not working?**
A: Check the route is `thesolowardrobe.com/product/*` (no https://)

**Q: Cloudflare not active yet?**
A: DNS takes time. Check cloudflare.com → your domain → DNS → Status should be "Active"

---

## That's It! 🎉

No servers, no deployment, no configuration files, no complexity. Just Cloudflare doing what it does best: sitting between users and your site, modifying responses on-the-fly.

**Free tier limits**: 100,000 requests/day (plenty for your site)

**Performance**: Actually FASTER than your origin because it runs on Cloudflare's global edge network!
