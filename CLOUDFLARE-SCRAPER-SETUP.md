# 🚀 Move Daily Scraper to Cloudflare Workers

## Why Cloudflare Workers for Scraping?

✅ **100% Free** - Free tier includes 100,000 requests/day  
✅ **No Local Machine Needed** - Runs in the cloud automatically  
✅ **Reliable** - Cloudflare's infrastructure, 99.9% uptime  
✅ **Scheduled** - Cron triggers run automatically  
✅ **Fast** - Runs on Cloudflare's edge network  
✅ **No Maintenance** - No server to manage or keep running  

## Architecture Options

### Option 1: Cloudflare Workers with Cron (Recommended)

**Best for:** Daily scraping, simple tasks, free tier

**How it works:**
- Worker runs on schedule (daily, hourly, etc.)
- Scrapes data from target sites
- Stores results in Cloudflare KV or R2
- Updates your products.json file

**Limitations:**
- 10ms CPU time limit (free tier)
- 50ms CPU time limit (paid tier)
- For heavy scraping, may need to split into multiple runs

### Option 2: Cloudflare Workers + Queue

**Best for:** Heavy scraping, large datasets, needs more processing time

**How it works:**
- Worker triggers scraping job
- Adds tasks to Cloudflare Queue
- Queue processes tasks with longer time limits
- Results stored in R2 or KV

**Limitations:**
- Requires paid Workers plan ($5/month)
- More complex setup

### Option 3: Cloudflare Workers + Durable Objects

**Best for:** Complex scraping with state management

**How it works:**
- Worker coordinates scraping
- Durable Objects manage state
- Can handle long-running tasks

**Limitations:**
- Requires paid Workers plan
- Most complex setup

## Recommended: Option 1 (Cron Worker)

For daily scraping, a simple Cron Worker is perfect. Here's how to set it up:

### Step 1: Create Scraper Worker

Create `scraper-worker.js`:

```javascript
// Cloudflare Worker - Daily Product Scraper
export default {
  async scheduled(event, env, ctx) {
    // Runs daily via cron trigger
    await runScraper(env);
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Manual trigger for testing
    if (url.pathname === '/scrape-now') {
      await runScraper(env);
      return new Response('Scraping started!', { status: 200 });
    }
    
    // Status endpoint
    if (url.pathname === '/status') {
      const lastRun = await env.SCRAPER_STATE.get('lastRun');
      return new Response(JSON.stringify({ lastRun }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Scraper Worker Active', { status: 200 });
  }
};

async function runScraper(env) {
  try {
    console.log('Starting daily scrape...');
    
    // TODO: Add your scraping logic here
    // Example: Fetch from external API or scrape website
    const scrapedData = await scrapeProducts();
    
    // Store in KV for persistence
    await env.SCRAPER_STATE.put('lastRun', new Date().toISOString());
    await env.SCRAPER_STATE.put('lastData', JSON.stringify(scrapedData));
    
    // Update products.json in R2 or Pages
    await updateProductsJson(scrapedData, env);
    
    console.log('Scraping completed successfully');
  } catch (error) {
    console.error('Scraping error:', error);
    // Store error for debugging
    await env.SCRAPER_STATE.put('lastError', error.message);
  }
}

async function scrapeProducts() {
  // Replace with your actual scraping logic
  // Example: Fetch from API
  const response = await fetch('https://api.example.com/products');
  return await response.json();
  
  // Or scrape HTML:
  // const html = await fetch('https://example.com/products').then(r => r.text());
  // Parse HTML and extract products
}

async function updateProductsJson(data, env) {
  // Option 1: Update R2 bucket (if using R2 for storage)
  if (env.PRODUCTS_BUCKET) {
    await env.PRODUCTS_BUCKET.put('data/products.json', JSON.stringify(data, null, 2));
    return;
  }
  
  // Option 2: Update via GitHub API (if products.json is in repo)
  // Requires GitHub token in secrets
  if (env.GITHUB_TOKEN) {
    await updateViaGitHub(data, env);
    return;
  }
  
  // Option 3: Store in KV (for small datasets)
  await env.SCRAPER_STATE.put('products', JSON.stringify(data));
}

async function updateViaGitHub(data, env) {
  const repo = 'SsahilxydD/tsw'; // Your repo
  const path = 'public/data/products.json';
  const content = btoa(JSON.stringify(data, null, 2)); // Base64 encode
  
  // Get current file SHA
  const getResponse = await fetch(
    `https://api.github.com/repos/${repo}/contents/${path}`,
    { headers: { 'Authorization': `token ${env.GITHUB_TOKEN}` } }
  );
  const file = await getResponse.json();
  
  // Update file
  await fetch(
    `https://api.github.com/repos/${repo}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `token ${env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Auto-update products.json from scraper',
        content: content,
        sha: file.sha
      })
    }
  );
}
```

### Step 2: Create Wrangler Config

Create `wrangler-scraper.toml`:

```toml
name = "product-scraper"
main = "scraper-worker.js"
compatibility_date = "2024-01-01"

# Daily cron - runs at 2 AM UTC (adjust timezone as needed)
[triggers]
crons = ["0 2 * * *"]

# KV namespace for storing scraper state
[[kv_namespaces]]
binding = "SCRAPER_STATE"
id = "YOUR_KV_NAMESPACE_ID"  # Create via: wrangler kv:namespace create "SCRAPER_STATE"

# Optional: R2 bucket for storing products.json
# [[r2_buckets]]
# binding = "PRODUCTS_BUCKET"
# bucket_name = "products-storage"
```

### Step 3: Set Up Storage

#### Option A: Use KV (Simple, Free)

```bash
# Create KV namespace
wrangler kv:namespace create "SCRAPER_STATE" --config wrangler-scraper.toml

# Copy the ID from output and update wrangler-scraper.toml
```

#### Option B: Use R2 (Better for Large Files)

```bash
# Create R2 bucket
wrangler r2 bucket create products-storage

# Update wrangler-scraper.toml with bucket name
```

### Step 4: Set Secrets (if needed)

```bash
# GitHub token (if updating via GitHub)
wrangler secret put GITHUB_TOKEN --config wrangler-scraper.toml

# API keys for scraping
wrangler secret put SCRAPER_API_KEY --config wrangler-scraper.toml
```

### Step 5: Deploy

```bash
wrangler deploy --config wrangler-scraper.toml
```

## Cron Schedule Examples

```toml
# Daily at 2 AM UTC
crons = ["0 2 * * *"]

# Daily at 9 AM IST (UTC+5:30 = 3:30 AM UTC)
crons = ["30 3 * * *"]

# Every 12 hours
crons = ["0 */12 * * *"]

# Multiple times per day (9 AM and 6 PM IST)
crons = ["30 3 * * *", "30 12 * * *"]

# Every 6 hours
crons = ["0 */6 * * *"]
```

## Updating products.json

### Method 1: Update R2 Bucket (Recommended)

If you store products.json in R2:

```javascript
await env.PRODUCTS_BUCKET.put('data/products.json', JSON.stringify(products, null, 2));
```

Then serve from R2 custom domain or update Pages deployment.

### Method 2: Update via GitHub API

Automatically commit to your repo:

```javascript
// Requires GITHUB_TOKEN secret
await updateViaGitHub(products, env);
```

This triggers Cloudflare Pages auto-deployment!

### Method 3: Store in KV (Small datasets only)

KV has 25MB limit, so only for small product lists:

```javascript
await env.SCRAPER_STATE.put('products', JSON.stringify(products));
```

## Handling Large Scrapes

If scraping takes too long (>10ms CPU), split into chunks:

```javascript
async function runScraper(env) {
  const lastProcessed = await env.SCRAPER_STATE.get('lastProcessed') || '0';
  
  // Scrape in batches
  const batch = await scrapeBatch(parseInt(lastProcessed), 100);
  
  // Process batch
  await processBatch(batch, env);
  
  // Update last processed
  await env.SCRAPER_STATE.put('lastProcessed', String(parseInt(lastProcessed) + 100));
  
  // If more to process, schedule next run
  if (hasMore) {
    // Trigger next batch via fetch to self
    await fetch('https://product-scraper.YOUR-SUBDOMAIN.workers.dev/scrape-now');
  }
}
```

## Monitoring & Debugging

### Check Logs

```bash
wrangler tail --config wrangler-scraper.toml
```

### Manual Trigger

Visit: `https://product-scraper.YOUR-SUBDOMAIN.workers.dev/scrape-now`

### Check Status

Visit: `https://product-scraper.YOUR-SUBDOMAIN.workers.dev/status`

## Migration Steps

1. **Export current scraper logic** from your local script
2. **Adapt to Worker format** (no file system, use KV/R2)
3. **Test locally** with `wrangler dev`
4. **Deploy** and test with manual trigger
5. **Set up cron** schedule
6. **Monitor** for a few days
7. **Disable local scraper** once confirmed working

## Cost

**Free Tier Includes:**
- 100,000 requests/day
- 10ms CPU time per request
- 100,000 KV reads/day
- 1,000 KV writes/day
- 1 GB R2 storage (if using R2)

**For most daily scrapers, free tier is enough!**

## Next Steps

1. Share your current scraper code/logic
2. I'll help adapt it to Cloudflare Workers
3. Set up the Worker with cron
4. Test and deploy

Want me to help adapt your specific scraper code?

