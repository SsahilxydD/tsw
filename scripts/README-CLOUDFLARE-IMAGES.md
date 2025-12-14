# Quick Start: Cloudflare Images Migration

## 🚀 3-Step Process

### 1. Install Dependencies
```powershell
npm install form-data node-fetch
```

### 2. Upload Images
```powershell
$env:CLOUDFLARE_IMAGES_TOKEN = "your-token"
$env:CLOUDFLARE_ACCOUNT_ID = "your-account-id"
node scripts/upload-to-cloudflare-images.js "D:\your-images-folder"
```

### 3. Update products.json
```powershell
node scripts/update-products-json.js
```

## 📋 Files Created

- `scripts/cloudflare-images-mapping.json` - Maps old paths to new Cloudflare URLs
- `public/data/products.json.backup.{timestamp}` - Backup of original JSON

## ✅ Verification

After updating, check that products.json has URLs like:
```json
"images": ["https://imagedelivery.net/Ysm_SanI713eaOY5mRhkPQ/abc123/public"]
```

## 📖 Full Guide

See `CLOUDFLARE-IMAGES-SETUP.md` for detailed instructions.

