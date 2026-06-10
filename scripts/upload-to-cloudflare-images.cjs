/**
 * Bulk Upload Images to Cloudflare Images
 * 
 * This script uploads your product images to Cloudflare Images service.
 * After upload, you'll get optimized CDN URLs for all images.
 * 
 * Usage:
 *   1. Get your Cloudflare API token (Images:Edit permission)
 *   2. Set environment variables
 *   3. Run: node scripts/upload-to-cloudflare-images.js "C:\path\to\images-folder"
 * 
 * Examples:
 *   node scripts/upload-to-cloudflare-images.js "D:\product-images"
 *   node scripts/upload-to-cloudflare-images.js "C:\Sites\tsw-images\images"
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

// ============= CONFIGURATION =============
const CONFIG = {
  // Get from: Cloudflare Dashboard → My Profile → API Tokens
  // Create token with: Images:Edit permission
  apiToken: process.env.CLOUDFLARE_IMAGES_TOKEN || 'YOUR_API_TOKEN',
  
  // Your Cloudflare account ID (from dashboard URL)
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID || 'YOUR_ACCOUNT_ID',
  
  // Your Cloudflare Images account hash (from dashboard → Images → Developer Resources)
  // This is a fixed value for your account, not per-image
  accountHash: process.env.CLOUDFLARE_ACCOUNT_HASH,
  
  // Number of parallel uploads (5-10 is optimal for API rate limits)
  // For 10000+ images, 8-10 is a good balance
  concurrency: 8,
  
  // Maximum file size to upload (10MB default for Cloudflare Images)
  maxFileSizeMB: 10,
  
  // Image variants to request (public is default, you can add others)
  variant: 'public',
  
  // Output file to save image mappings (old path -> new Cloudflare URL)
  mappingFile: path.join(__dirname, 'cloudflare-images-mapping.json'),
};
// ==========================================

const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
};

// Cloudflare Images API endpoint
const API_BASE = `https://api.cloudflare.com/client/v4/accounts/${CONFIG.accountId}/images/v1`;

// Load existing mapping to skip already uploaded images
let existingMapping = {};
if (fs.existsSync(CONFIG.mappingFile)) {
  try {
    existingMapping = JSON.parse(fs.readFileSync(CONFIG.mappingFile, 'utf8'));
    console.log(`📋 Loaded ${Object.keys(existingMapping).length} existing mappings\n`);
  } catch (err) {
    console.warn('⚠️  Could not load existing mapping file, starting fresh\n');
  }
}

// Recursively get all image files
async function getAllFiles(dir, baseDir = dir, fileList = []) {
  const files = await readdir(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    
    try {
      const fileStat = await stat(filePath);
      
      if (fileStat.isDirectory()) {
        await getAllFiles(filePath, baseDir, fileList);
      } else {
        const ext = path.extname(file).toLowerCase();
        if (MIME_TYPES[ext]) {
          const sizeMB = fileStat.size / (1024 * 1024);
          if (sizeMB <= CONFIG.maxFileSizeMB) {
            const relativePath = path.relative(baseDir, filePath).replace(/\\/g, '/');
            // Skip if already uploaded
            if (!existingMapping[relativePath]) {
              fileList.push({
                localPath: filePath,
                relativePath: relativePath,
                size: fileStat.size,
              });
            }
          } else {
            console.warn(`⚠️  Skipping large file (${sizeMB.toFixed(1)}MB): ${file}`);
          }
        }
      }
    } catch (err) {
      console.warn(`⚠️  Cannot access: ${filePath} - ${err.message}`);
    }
  }
  
  return fileList;
}

// Upload a single image to Cloudflare Images
async function uploadImage(fileInfo) {
  const fileContent = await readFile(fileInfo.localPath);
  const ext = path.extname(fileInfo.localPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'image/jpeg';
  
  // Upload with retry/backoff on rate limits (429), server errors (5xx) and network blips.
  // FormData/Blob are rebuilt each attempt because fetch consumes the body stream.
  let response;
  for (let attempt = 0; ; attempt++) {
    const formData = new FormData();
    const blob = new Blob([fileContent], { type: contentType });
    formData.append('file', blob, path.basename(fileInfo.localPath));
    try {
      response = await fetch(`${API_BASE}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${CONFIG.apiToken}` },
        body: formData,
      });
    } catch (netErr) {
      if (attempt >= 6) throw netErr;
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      continue;
    }
    if ((response.status === 429 || response.status >= 500) && attempt < 6) {
      const ra = parseInt(response.headers.get('retry-after') || '0', 10);
      await new Promise((r) => setTimeout(r, ra ? ra * 1000 : 500 * 2 ** attempt));
      continue;
    }
    break;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  
  if (!result.success || !result.result) {
    throw new Error(`Upload failed: ${JSON.stringify(result.errors || result)}`);
  }
  
  const imageId = result.result.id;

  // Extract delivery URL from the API response variants array
  // Cloudflare returns full URLs like: https://imagedelivery.net/<hash>/<id>/public
  let imageUrl;
  if (result.result.variants && result.result.variants.length > 0) {
    imageUrl = result.result.variants[0];
  } else {
    // Fallback: construct manually if accountHash is available
    const accountHash = CONFIG.accountHash || process.env.CLOUDFLARE_ACCOUNT_HASH;
    if (accountHash) {
      imageUrl = `https://imagedelivery.net/${accountHash}/${imageId}/${CONFIG.variant}`;
    } else {
      imageUrl = `https://imagedelivery.net/_/${imageId}/${CONFIG.variant}`;
    }
  }

  return {
    status: 'uploaded',
    relativePath: fileInfo.relativePath,
    imageUrl: imageUrl,
    imageId: imageId,
  };
}

// Process files with concurrency control
async function processWithConcurrency(items, fn, concurrency) {
  const results = [];
  const executing = new Set();
  
  for (const item of items) {
    const promise = fn(item).then(result => {
      executing.delete(promise);
      return result;
    }).catch(err => {
      executing.delete(promise);
      return { status: 'failed', item, error: err.message };
    });
    
    results.push(promise);
    executing.add(promise);
    
    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }
  
  return Promise.all(results);
}

// Format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Main function
async function main() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║   Cloudflare Images Bulk Uploader                  ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  const sourceDir = process.argv[2];
  
  if (!sourceDir) {
    console.log('Usage: node upload-to-cloudflare-images.js <source-directory>\n');
    console.log('Examples:');
    console.log('  node scripts/upload-to-cloudflare-images.js "D:\\product-images"');
    console.log('  node scripts/upload-to-cloudflare-images.js "C:\\Sites\\tsw-images\\images"\n');
    console.log('Environment variables:');
    console.log('  CLOUDFLARE_IMAGES_TOKEN  - API token with Images:Edit permission');
    console.log('  CLOUDFLARE_ACCOUNT_ID    - Your Cloudflare account ID\n');
    process.exit(1);
  }
  
  if (!fs.existsSync(sourceDir)) {
    console.error(`❌ Directory not found: ${sourceDir}`);
    process.exit(1);
  }
  
  // Validate config
  if (CONFIG.apiToken === 'YOUR_API_TOKEN' || CONFIG.accountId === 'YOUR_ACCOUNT_ID') {
    console.error('❌ Please configure your Cloudflare credentials!\n');
    console.error('Option 1: Set environment variables:');
    console.error('  $env:CLOUDFLARE_IMAGES_TOKEN = "your-api-token"');
    console.error('  $env:CLOUDFLARE_ACCOUNT_ID = "your-account-id"\n');
    console.error('Option 2: Edit the CONFIG object in this script\n');
    console.error('Get API token from: Cloudflare Dashboard → My Profile → API Tokens');
    console.error('  Create token with: Images:Edit permission');
    console.error('Get Account ID from: Dashboard URL (dash.cloudflare.com/XXXXXXXX/...)');
    process.exit(1);
  }
  
  console.log('🔍 Scanning for images (this may take a minute for 10000+ files)...');
  const files = await getAllFiles(sourceDir);
  
  if (files.length === 0) {
    console.log('\n✅ All images already uploaded! (or no images found)');
    console.log('   Supported formats: .jpg, .jpeg, .png, .gif, .webp, .svg, .avif');
    process.exit(0);
  }
  
  const totalSize = files.reduce((acc, f) => acc + f.size, 0);
  
  // Count folders (approximate - folders with images)
  const folderCount = new Set(files.map(f => {
    const parts = f.relativePath.split('/');
    return parts.length > 1 ? parts[0] : 'root';
  })).size;
  
  console.log(`\n📁 Found ${files.length.toLocaleString()} images in ${folderCount.toLocaleString()} folders (${formatBytes(totalSize)})\n`);
  console.log(`📦 Account: ${CONFIG.accountId}`);
  console.log(`⚡ Concurrency: ${CONFIG.concurrency} parallel uploads`);
  console.log(`💾 Mapping file: ${CONFIG.mappingFile}\n`);
  
  let uploaded = 0;
  let failed = 0;
  const startTime = Date.now();
  const mapping = { ...existingMapping };
  const failedFiles = [];
  
  console.log('⬆️  Starting upload to Cloudflare Images...\n');
  
  // Note: FormData and Blob are Node.js globals in v18+, but for older versions
  // we might need to use form-data package. For now, assuming Node 18+
  
  const results = await processWithConcurrency(
    files,
    async (fileInfo) => {
      try {
        const result = await uploadImage(fileInfo);
        
        if (result.status === 'uploaded') {
          uploaded++;
          // Save mapping immediately
          mapping[result.relativePath] = result.imageUrl;
          
          // Save mapping file periodically (every 10 uploads)
          if (uploaded % 10 === 0) {
            fs.writeFileSync(CONFIG.mappingFile, JSON.stringify(mapping, null, 2));
          }
        }
        
        const total = uploaded + failed;
        const percent = Math.round((total / files.length) * 100);
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = uploaded / elapsed;
        const remaining = files.length - total;
        const eta = remaining > 0 && rate > 0 ? Math.round(remaining / rate) : 0;
        const etaMin = Math.floor(eta / 60);
        const etaSec = eta % 60;
        
        process.stdout.write(
          `\r[${percent.toString().padStart(3)}%] ✅ ${uploaded.toLocaleString()} | ❌ ${failed} | ${rate.toFixed(1)}/s | ETA: ${etaMin}m${etaSec}s    `
        );
        
        return result;
      } catch (err) {
        failed++;
        if (failed <= 3) {
          console.error(`\n⚠️  Upload error (${fileInfo.relativePath}): ${err.message}`);
        }
        failedFiles.push({ path: fileInfo.relativePath, error: err.message });
        return { status: 'failed', path: fileInfo.relativePath, error: err.message };
      }
    },
    CONFIG.concurrency
  );
  
  // Save final mapping
  fs.writeFileSync(CONFIG.mappingFile, JSON.stringify(mapping, null, 2));
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const avgSpeed = (uploaded / parseFloat(duration)).toFixed(1);
  
  console.log(`\n\n${'═'.repeat(55)}`);
  console.log('📊 Upload Complete!');
  console.log('═'.repeat(55));
  console.log(`   ✅ Uploaded:  ${uploaded.toLocaleString()} images`);
  console.log(`   ❌ Failed:    ${failed.toLocaleString()} images`);
  console.log(`   ⏱️  Duration:  ${duration}s (avg ${avgSpeed} images/s)`);
  console.log('═'.repeat(55));
  
  if (uploaded > 0) {
    console.log(`\n💾 Image mappings saved to: ${CONFIG.mappingFile}`);
    
    // Automatically update products.json if any images were uploaded
    console.log(`\n🔄 Automatically updating products.json...`);
    try {
      const { execFileSync } = require('child_process');
      const updateScript = path.join(__dirname, 'update-products-json.cjs');
      const productsJsonPath = path.join(__dirname, '..', 'public', 'data', 'products.json');

      execFileSync('node', [updateScript, productsJsonPath], {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
      });
      
      console.log(`\n✅ products.json updated automatically!`);
    } catch (err) {
      console.log(`\n⚠️  Could not auto-update products.json: ${err.message}`);
      console.log(`   Run manually: node scripts/update-products-json.cjs`);
    }
  } else if (failed === 0 && uploaded === 0) {
    console.log(`\n📝 All images already uploaded. Run update script if needed:`);
    console.log(`   node scripts/update-products-json.cjs`);
  }
  
  if (failedFiles.length > 0) {
    const failedLog = path.join(__dirname, 'failed-uploads.json');
    fs.writeFileSync(failedLog, JSON.stringify(failedFiles, null, 2));
    console.log(`\n⚠️  Failed uploads logged to: ${failedLog}`);
    console.log('   Re-run the script to retry failed uploads.');
  }
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});

