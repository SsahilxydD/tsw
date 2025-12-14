/**
 * Bulk Upload Images to Cloudflare R2
 * 
 * This script uploads your images folder to R2, preserving the folder structure.
 * Your products.json references images like: /images/product.jpg
 * After upload, they'll be available at: https://cdn.yourdomain.com/images/product.jpg
 * 
 * Usage:
 *   1. Set environment variables (or edit the config below)
 *   2. Run: node scripts/upload-to-r2.js "C:\path\to\images-folder"
 * 
 * Examples:
 *   node scripts/upload-to-r2.js "D:\product-images"
 *   node scripts/upload-to-r2.js "C:\Sites\tsw-images\images"
 */

const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

// ============= CONFIGURATION =============
// Get these from: Cloudflare Dashboard → R2 → Manage R2 API Tokens
const CONFIG = {
  // Your Cloudflare account ID (from dashboard URL)
  accountId: process.env.R2_ACCOUNT_ID || 'YOUR_ACCOUNT_ID',
  
  // R2 API Token credentials
  accessKeyId: process.env.R2_ACCESS_KEY_ID || 'YOUR_ACCESS_KEY_ID',
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'YOUR_SECRET_ACCESS_KEY',
  
  // Your R2 bucket name
  bucketName: process.env.R2_BUCKET_NAME || 'tsw-media',
  
  // Upload prefix - set to '' if your source folder already has /images structure
  // Set to 'images/' if you want to add the images prefix
  uploadPrefix: '',
  
  // Number of parallel uploads (10-20 is optimal for most connections)
  concurrency: 15,
  
  // Skip files that already exist in R2 (faster for re-runs)
  skipExisting: true,
  
  // Maximum file size to upload (50MB default)
  maxFileSizeMB: 50,
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
  '.ico': 'image/x-icon',
  '.bmp': 'image/bmp',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
};

let s3 = null;

function initS3Client() {
  s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${CONFIG.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: CONFIG.accessKeyId,
      secretAccessKey: CONFIG.secretAccessKey,
    },
  });
}

// Recursively get all image files in a directory
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
          // Check file size
          const sizeMB = fileStat.size / (1024 * 1024);
          if (sizeMB <= CONFIG.maxFileSizeMB) {
            fileList.push({
              localPath: filePath,
              relativePath: path.relative(baseDir, filePath).replace(/\\/g, '/'),
              size: fileStat.size,
            });
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

// Check if file exists in R2
async function fileExistsInR2(key) {
  try {
    await s3.send(new HeadObjectCommand({
      Bucket: CONFIG.bucketName,
      Key: key,
    }));
    return true;
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return false;
    }
    // On other errors (permissions, etc), assume file doesn't exist
    return false;
  }
}

// Upload a single file
async function uploadFile(fileInfo) {
  const key = CONFIG.uploadPrefix + fileInfo.relativePath;
  const ext = path.extname(fileInfo.localPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  
  // Check if file exists (for skip mode)
  if (CONFIG.skipExisting) {
    try {
      const exists = await fileExistsInR2(key);
      if (exists) {
        return { status: 'skipped', key, size: fileInfo.size };
      }
    } catch (err) {
      // Continue with upload if check fails
    }
  }
  
  const fileContent = await readFile(fileInfo.localPath);
  
  await s3.send(new PutObjectCommand({
    Bucket: CONFIG.bucketName,
    Key: key,
    Body: fileContent,
    ContentType: contentType,
    // Aggressive caching for images (1 year, immutable)
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  
  return { status: 'uploaded', key, size: fileInfo.size };
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

// Format bytes to human readable
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
  console.log('║     Cloudflare R2 Bulk Image Uploader              ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  const sourceDir = process.argv[2];
  
  if (!sourceDir) {
    console.log('Usage: node upload-to-r2.js <source-directory>\n');
    console.log('Examples:');
    console.log('  node scripts/upload-to-r2.js "D:\\product-images"');
    console.log('  node scripts/upload-to-r2.js "C:\\Sites\\tsw-data\\images"\n');
    console.log('Environment variables:');
    console.log('  R2_ACCOUNT_ID      - Your Cloudflare account ID');
    console.log('  R2_ACCESS_KEY_ID   - R2 API access key');
    console.log('  R2_SECRET_ACCESS_KEY - R2 API secret key');
    console.log('  R2_BUCKET_NAME     - R2 bucket name (default: tsw-media)\n');
    process.exit(1);
  }
  
  // Check if source directory exists
  if (!fs.existsSync(sourceDir)) {
    console.error(`❌ Directory not found: ${sourceDir}`);
    process.exit(1);
  }
  
  // Validate config
  if (CONFIG.accountId === 'YOUR_ACCOUNT_ID' || 
      CONFIG.accessKeyId === 'YOUR_ACCESS_KEY_ID' ||
      CONFIG.secretAccessKey === 'YOUR_SECRET_ACCESS_KEY') {
    console.error('❌ Please configure your R2 credentials!\n');
    console.error('Option 1: Set environment variables:');
    console.error('  $env:R2_ACCOUNT_ID = "your-account-id"');
    console.error('  $env:R2_ACCESS_KEY_ID = "your-access-key"');
    console.error('  $env:R2_SECRET_ACCESS_KEY = "your-secret-key"');
    console.error('  $env:R2_BUCKET_NAME = "your-bucket-name"\n');
    console.error('Option 2: Edit the CONFIG object in this script\n');
    console.error('Get credentials from: Cloudflare Dashboard → R2 → Manage R2 API Tokens');
    process.exit(1);
  }
  
  // Initialize S3 client
  initS3Client();
  
  console.log('🔍 Scanning for images...');
  const files = await getAllFiles(sourceDir);
  
  if (files.length === 0) {
    console.log('\n❌ No images found!');
    console.log('   Supported formats: .jpg, .jpeg, .png, .gif, .webp, .svg, .avif');
    process.exit(0);
  }
  
  const totalSize = files.reduce((acc, f) => acc + f.size, 0);
  
  console.log(`\n📁 Found ${files.length.toLocaleString()} images (${formatBytes(totalSize)})\n`);
  console.log(`📦 Bucket: ${CONFIG.bucketName}`);
  console.log(`🔗 Prefix: ${CONFIG.uploadPrefix || '(root)'}`);
  console.log(`⚡ Concurrency: ${CONFIG.concurrency} parallel uploads`);
  console.log(`⏭️  Skip existing: ${CONFIG.skipExisting ? 'Yes' : 'No'}\n`);
  
  let uploaded = 0;
  let skipped = 0;
  let failed = 0;
  let uploadedBytes = 0;
  const startTime = Date.now();
  const failedFiles = [];
  
  console.log('⬆️  Starting upload...\n');
  
  await processWithConcurrency(
    files,
    async (fileInfo) => {
      try {
        const result = await uploadFile(fileInfo);
        
        if (result.status === 'uploaded') {
          uploaded++;
          uploadedBytes += result.size;
        } else if (result.status === 'skipped') {
          skipped++;
        }
        
        const total = uploaded + skipped + failed;
        const percent = Math.round((total / files.length) * 100);
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = uploadedBytes / elapsed;
        
        process.stdout.write(
          `\r[${percent.toString().padStart(3)}%] ✅ ${uploaded} uploaded | ⏭️ ${skipped} skipped | ❌ ${failed} failed | ${formatBytes(rate)}/s    `
        );
        
        return result;
      } catch (err) {
        failed++;
        failedFiles.push({ path: fileInfo.localPath, error: err.message });
        return { status: 'failed', path: fileInfo.localPath, error: err.message };
      }
    },
    CONFIG.concurrency
  );
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const avgSpeed = formatBytes(uploadedBytes / parseFloat(duration));
  
  console.log(`\n\n${'═'.repeat(55)}`);
  console.log('📊 Upload Complete!');
  console.log('═'.repeat(55));
  console.log(`   ✅ Uploaded:  ${uploaded.toLocaleString()} files (${formatBytes(uploadedBytes)})`);
  console.log(`   ⏭️  Skipped:   ${skipped.toLocaleString()} files`);
  console.log(`   ❌ Failed:    ${failed.toLocaleString()} files`);
  console.log(`   ⏱️  Duration:  ${duration}s (avg ${avgSpeed}/s)`);
  console.log('═'.repeat(55));
  
  if (uploaded > 0 || skipped > 0) {
    console.log('\n🌐 Your images are now available at:');
    console.log(`   https://YOUR_CUSTOM_DOMAIN/${CONFIG.uploadPrefix}<path>`);
    console.log('\n📝 Next steps:');
    console.log('   1. Connect a custom domain to your R2 bucket');
    console.log('   2. Set VITE_CDN_URL in your .env file');
    console.log('   3. Rebuild your app');
  }
  
  // Log failed files for retry
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
