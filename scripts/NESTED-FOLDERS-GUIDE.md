# Handling Nested Folder Structure (4200+ folders, 10000+ images)

## 📁 Your Structure

```
images/
  ├── product-slug-1/
  │   ├── image1.jpg
  │   ├── image2.jpg
  │   └── image3.jpg
  ├── product-slug-2/
  │   ├── image1.jpg
  │   └── image2.jpg
  ...
  (4200 folders, 10000+ images total)
```

## ✅ How the Script Handles It

### 1. **Recursive Scanning**
The script automatically scans all nested folders recursively:
- Finds all images in subfolders
- Preserves the folder structure in the mapping
- Example: `product-slug-1/image1.jpg` → Cloudflare URL

### 2. **Path Matching**
The update script intelligently matches paths:

**In products.json, you might have:**
```json
{
  "images": [
    "/images/product-slug-1/image1.jpg",
    "images/product-slug-2/image2.jpg",
    "/data/images/product-slug-3/image3.jpg"
  ]
}
```

**The script matches all these formats:**
- ✅ `/images/product-slug-1/image1.jpg`
- ✅ `images/product-slug-1/image1.jpg`
- ✅ `/data/images/product-slug-1/image1.jpg`
- ✅ `product-slug-1/image1.jpg`

### 3. **Performance Optimizations**

For 10000+ images:
- **Concurrency**: 10 parallel uploads (optimal for API limits)
- **Progress tracking**: Shows ETA and speed
- **Resume capability**: Skips already uploaded images
- **Periodic saves**: Mapping file saved every 10 uploads

### 4. **Expected Performance**

**Upload time:**
- 10,000 images: ~15-25 minutes
- Progress: Shows real-time stats with ETA
- Speed: ~6-10 images/second (depends on file sizes)

**Update time:**
- 4200 products: ~30-60 seconds
- Progress: Shows every 50 products

## 🚀 Usage Example

```powershell
# 1. Upload all images (handles nested folders automatically)
$env:CLOUDFLARE_IMAGES_TOKEN = "your-token"
$env:CLOUDFLARE_ACCOUNT_ID = "your-account-id"
node scripts/upload-to-cloudflare-images.js "D:\images"

# Output:
# 📁 Found 10,234 images in 4,200 folders (2.5 GB)
# [100%] ✅ 10,234 uploaded | ❌ 0 failed | 8.5/s | ETA: 0m0s

# 2. Update products.json
node scripts/update-products-json.js

# Output:
# ✅ Products updated: 4,200
# 🖼️ Images updated: 10,234
```

## 🔍 Path Matching Examples

The update script uses multiple strategies to match paths:

**Example 1: Exact match**
```
products.json: "/images/product-123/image.jpg"
Mapping: "product-123/image.jpg"
✅ Matches!
```

**Example 2: With/without prefix**
```
products.json: "images/product-123/image.jpg"
Mapping: "product-123/image.jpg"
✅ Matches! (strips images/ prefix)
```

**Example 3: Nested path**
```
products.json: "/data/images/product-123/image.jpg"
Mapping: "product-123/image.jpg"
✅ Matches! (normalizes path)
```

## ⚠️ Troubleshooting

### "Images not found" warnings

If some images can't be matched:
1. Check the mapping file has the correct paths
2. Verify image paths in products.json match folder structure
3. Check `unmapped-images.json` for a list of unmatched images

### Large batch uploads

If upload is slow:
- Reduce concurrency (edit script, change `concurrency: 5`)
- Upload in smaller batches
- Check your internet connection

### Memory issues

For very large batches (50,000+ images):
- The script processes files one at a time
- Uses minimal memory
- Should handle any size batch

## 📊 Statistics

After running, you'll see:
```
📊 Update Statistics
═══════════════════════════════════════════════════════════
   ✅ Products updated:  4,200
   ⏭️  Products skipped:  0
   🖼️  Images updated:    10,234
   ❓ Images not found:   0
═══════════════════════════════════════════════════════════
```

## ✅ Verification

After updating, verify a few products:

```json
{
  "_id": "product-123",
  "images": [
    "https://imagedelivery.net/Ysm_SanI713eaOY5mRhkPQ/abc123/public"
  ]
}
```

If you see Cloudflare URLs like above, you're all set! 🎉

