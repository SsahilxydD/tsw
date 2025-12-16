# 🧪 Test Worker for OG Tags

## Quick Test Steps

### 1. Test with Bot User Agent

```bash
# Using curl (Linux/Mac)
curl -H "User-Agent: WhatsApp/2.0" "https://thesolowardrobe.com/product/7362216615470562330" | grep -A 5 "og:image"

# Using PowerShell (Windows)
$response = Invoke-WebRequest -Uri "https://thesolowardrobe.com/product/7362216615470562330" -Headers @{"User-Agent"="WhatsApp/2.0"}
$response.Content | Select-String -Pattern "og:image" -Context 0,2
```

### 2. Test with Facebook Debugger

1. Go to: https://developers.facebook.com/tools/debug/
2. Enter: `https://thesolowardrobe.com/product/7362216615470562330`
3. Click **Debug**
4. Click **Scrape Again** (to clear cache)
5. Check the preview - should show:
   - Product name
   - Product image
   - Product description with price

### 3. Check Worker Logs

1. Go to Cloudflare Dashboard
2. Workers & Pages → `og-meta-handler` → Logs
3. Look for any errors when testing

## What Was Fixed

✅ **Improved image URL handling:**
- Handles absolute URLs (http://, https://)
- Handles absolute paths (starting with /)
- Handles relative paths
- Uses origin from request (Cloudflare Pages)
- Fallback to default image if product image missing

✅ **Better product name extraction:**
- Tries `name`, `title`, then `slug_name`

✅ **Proper HTML escaping:**
- All URLs and text are properly escaped
- Prevents XSS and malformed HTML

✅ **Conditional image tags:**
- Only adds image meta tags if image exists
- Prevents empty/broken image references

## Expected Output

When working correctly, you should see in the HTML:

```html
<meta property="og:title" content="[Product Name] – Solo Wardrobe" />
<meta property="og:description" content="[Description with price and details]" />
<meta property="og:image" content="https://thesolowardrobe.com/[image-path]" />
<meta property="og:image:secure_url" content="https://thesolowardrobe.com/[image-path]" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="1200" />
<meta property="product:price:amount" content="[price]" />
<meta property="product:price:currency" content="INR" />
```

## Troubleshooting

### No Image in Preview

**Check:**
1. Product has image in products.json
2. Image URL is accessible (try opening in browser)
3. Worker is deployed and route is configured
4. Worker logs show no errors

**Fix:**
- Verify image path in products.json
- Check if image exists at the URL
- Ensure worker route is active

### Wrong Product Details

**Check:**
1. Product ID matches in URL and products.json
2. Worker is finding the correct product
3. Product data is correct in products.json

**Fix:**
- Verify product ID format matches
- Check worker logs for product lookup
- Ensure products.json is up to date

