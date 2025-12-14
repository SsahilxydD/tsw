# 🖼️ Cloudflare Images Setup Guide

Complete guide to migrate all 4200+ product images to Cloudflare Images for optimized CDN delivery.

---

## 📋 Prerequisites

1. **Cloudflare Account** with Images enabled
2. **API Token** with `Images:Edit` permission
3. **Node.js 18+** (or install `node-fetch` for older versions)
4. **Your images folder** with all product images

---

## 🔑 Step 1: Get Cloudflare Credentials

### Get Your Account ID

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Your Account ID is in the URL: `dash.cloudflare.com/XXXXXXXX/...`
3. Copy the `XXXXXXXX` part

### Create API Token

1. Go to **My Profile** → **API Tokens**
2. Click **Create Token**
3. Use **Custom token** template
4. Set permissions:
   - **Images** → **Edit**
5. Set account resources:
   - Include → **Your Account**
6. Click **Continue to summary** → **Create Token**
7. **Copy the token immediately** (you won't see it again!)

---

## 📦 Step 2: Install Dependencies

```powershell
cd C:\Sites\tsw
npm install form-data
```

**Note:** If using Node.js < 18, also install:
```powershell
npm install node-fetch
```

---

## ⬆️ Step 3: Upload Images to Cloudflare Images

### Set Environment Variables

```powershell
# Set your credentials
$env:CLOUDFLARE_IMAGES_TOKEN = "your-api-token-here"
$env:CLOUDFLARE_ACCOUNT_ID = "your-account-id-here"
```

### Run Upload Script

```powershell
# Replace with your actual images folder path
node scripts/upload-to-cloudflare-images.js "D:\path\to\your\images"
```

**📁 Nested Folder Structure Support:**

The script handles nested folders automatically! If your structure is:
```
images/
  ├── product-slug-1/
  │   ├── image1.jpg
  │   ├── image2.jpg
  │   └── image3.jpg
  ├── product-slug-2/
  │   └── image1.jpg
  ...
```

The script will:
- ✅ Recursively scan all subfolders
- ✅ Preserve folder structure in mapping
- ✅ Handle 10000+ images across 4200+ folders
- ✅ Show progress with ETA for large batches

**What it does:**
- ✅ Scans your images folder recursively
- ✅ Uploads images in parallel (8 at a time)
- ✅ Creates mapping file: `scripts/cloudflare-images-mapping.json`
- ✅ Skips already uploaded images on re-runs
- ✅ Shows progress and speed stats

**Expected output:**
```
📁 Found 4,200 new images (2.5 GB)
⚡ Concurrency: 8 parallel uploads

⬆️  Starting upload to Cloudflare Images...
[100%] ✅ 4200 uploaded | ❌ 0 failed | 12.5/s

💾 Image mappings saved to: scripts/cloudflare-images-mapping.json
```

**Time estimate:** ~5-10 minutes for 4200 images (depends on image sizes and connection)

---

## 🔄 Step 4: Update products.json

Once all images are uploaded, update your `products.json` file:

```powershell
# Update products.json (default: public/data/products.json)
node scripts/update-products-json.js

# Or specify custom path
node scripts/update-products-json.js "C:\path\to\products.json"
```

**What it does:**
- ✅ Reads the mapping file from Step 3
- ✅ Finds all image references in products.json
- ✅ Replaces old paths with Cloudflare Images URLs
- ✅ Creates backup: `products.json.backup.{timestamp}`
- ✅ Shows statistics of what was updated

**Example transformation:**
```json
// Before
{
  "images": ["/images/product-123.jpg"]
}

// After
{
  "images": ["https://imagedelivery.net/Ysm_SanI713eaOY5mRhkPQ/abc123/public"]
}
```

---

## 🧪 Step 5: Test (Dry Run)

Before updating the real file, test with dry run:

```powershell
node scripts/update-products-json.js --dry-run
```

This shows what would change without actually updating the file.

---

## ✅ Step 6: Verify & Deploy

1. **Check the backup** was created
2. **Verify a few products** in the updated JSON have Cloudflare URLs
3. **Rebuild your app:**
   ```powershell
   npm run build
   ```
4. **Test locally:**
   ```powershell
   npm run preview
   ```

---

## 🎯 How It Works

### Image URL Format

Cloudflare Images URLs follow this pattern:
```
https://imagedelivery.net/{account_hash}/{image_id}/{variant}
```

- **account_hash**: Your account identifier (auto-generated)
- **image_id**: Unique ID for each uploaded image
- **variant**: Image variant (`public` = original, or custom variants)

### Automatic Optimizations

Cloudflare Images automatically:
- ✅ Optimizes images for web delivery
- ✅ Serves via global CDN (faster loading)
- ✅ Provides multiple variants (thumbnails, etc.)
- ✅ Handles different formats (WebP, AVIF when supported)

### Your App Integration

Your `ShopContext.jsx` already handles absolute URLs, so Cloudflare Images URLs will work automatically:

```javascript
// Old: /images/product.jpg
// New: https://imagedelivery.net/.../abc123/public
// Both work! ✅
```

---

## 🔧 Troubleshooting

### "API Token Invalid"
- Check token has `Images:Edit` permission
- Verify token hasn't expired
- Regenerate token if needed

### "Account ID not found"
- Check the Account ID in your dashboard URL
- Make sure it's the correct account

### "Upload failed: Rate limit"
- Reduce `concurrency` in the script (default: 8)
- Cloudflare Images has rate limits (usually 1000 requests/hour)

### "Image not found" in update script
- Make sure image was uploaded successfully
- Check the mapping file has the correct path
- Image paths in products.json must match folder structure

### Large files failing
- Cloudflare Images max file size: **10MB**
- Compress large images before uploading
- Or use R2 for very large files

---

## 📊 Cost Considerations

**Cloudflare Images Pricing:**
- **Free tier**: 100,000 images stored, 100,000 served/month
- **Paid**: $1 per 100,000 images stored, $1 per 100,000 served

For 4200 images:
- **Storage**: ~$0.04/month (if over free tier)
- **Delivery**: Depends on traffic (likely free for most sites)

**Much cheaper than R2** for image delivery with optimization!

---

## 🚀 Advanced: Image Variants

Cloudflare Images supports custom variants (thumbnails, different sizes):

```javascript
// In your app, you can request different variants:
const thumbnailUrl = imageUrl.replace('/public', '/thumbnail');
const largeUrl = imageUrl.replace('/public', '/large');
```

Configure variants in Cloudflare Dashboard → Images → Variants.

---

## 📝 Next Steps

1. ✅ Upload all images
2. ✅ Update products.json
3. ✅ Test locally
4. ✅ Deploy to production
5. 🎉 Enjoy faster image loading!

---

## 💡 Tips

- **Batch uploads**: Upload in smaller batches if you hit rate limits
- **Resume capability**: Script saves progress, can resume if interrupted
- **Mapping file**: Keep `cloudflare-images-mapping.json` for reference
- **Backup**: Always backup products.json before updating

---

## 🆘 Need Help?

- Check Cloudflare Images docs: https://developers.cloudflare.com/images/
- Verify API token permissions
- Check script logs for specific error messages

