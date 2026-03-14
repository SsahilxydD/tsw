/**
 * Update products.json with Cloudflare Images URLs
 * 
 * This script reads the image mapping file created by upload-to-cloudflare-images.js
 * and updates your products.json file with the new Cloudflare Images URLs.
 * 
 * Usage:
 *   node scripts/update-products-json.js [path-to-products.json]
 * 
 * Default: Updates /data/products.json (relative to project root)
 */

const fs = require('fs');
const path = require('path');

// ============= CONFIGURATION =============
const CONFIG = {
  // Path to the mapping file created by upload script
  mappingFile: path.join(__dirname, 'cloudflare-images-mapping.json'),
  
  // Path to products.json (default: /data/products.json in project root)
  productsJsonPath: process.argv[2] || path.join(__dirname, '..', 'public', 'data', 'products.json'),
  
  // Backup original file before updating
  createBackup: true,
  
  // Dry run mode (don't actually update, just show what would change)
  dryRun: process.argv.includes('--dry-run'),
};
// ==========================================

// Load image mapping
function loadMapping() {
  if (!fs.existsSync(CONFIG.mappingFile)) {
    console.error(`❌ Mapping file not found: ${CONFIG.mappingFile}`);
    console.error('   Run upload-to-cloudflare-images.js first to create the mapping file.');
    process.exit(1);
  }
  
  try {
    const content = fs.readFileSync(CONFIG.mappingFile, 'utf8');
    const mapping = JSON.parse(content);
    if (typeof mapping !== 'object' || Array.isArray(mapping) || mapping === null) {
      throw new Error('Mapping file must be a JSON object');
    }
    return mapping;
  } catch (err) {
    console.error(`❌ Error reading mapping file: ${err.message}`);
    process.exit(1);
  }
}

// Normalize image path for matching
function normalizePath(imagePath) {
  if (!imagePath) return '';
  
  // Remove leading slash and /data prefix if present
  let normalized = String(imagePath)
    .replace(/^\/+/, '')
    .replace(/^data\//, '');
  
  // Handle both /images/... and images/... formats
  if (normalized.startsWith('images/')) {
    return normalized;
  }
  
  // If it's already a full URL, extract the path
  if (imagePath.startsWith('http')) {
    // Try to extract path from URL
    try {
      const url = new URL(imagePath);
      const urlPath = url.pathname.replace(/^\/+/, '').replace(/^data\//, '');
      return urlPath;
    } catch {
      return normalized;
    }
  }
  
  return normalized;
}

// Find matching Cloudflare Images URL
function findCloudflareUrl(imagePath, mapping) {
  if (!imagePath) return null;
  
  // If already a Cloudflare Images URL, check if it's correct
  if (imagePath.includes('imagedelivery.net')) {
    // Check if URL has filename instead of account hash (needs fixing)
    // Pattern: https://imagedelivery.net/{filename}/{image_id}/public
    const urlMatch = imagePath.match(/^https:\/\/imagedelivery\.net\/([^\/]+)\/([^\/]+)\/([^\/]+)$/);
    if (urlMatch) {
      const [, firstPart, imageId] = urlMatch;
      // If first part looks like a filename (has extension), try to find correct URL
      if (firstPart.match(/\.(webp|jpg|jpeg|png|gif|svg|avif)$/i)) {
        // Try to find in mapping by image ID
        for (const [key, value] of Object.entries(mapping)) {
          if (value.includes(`/${imageId}/`)) {
            return value; // Return correct URL from mapping
          }
        }
        // If not found in mapping, return null to keep old URL (or could fix it)
        return null;
      }
    }
    // URL looks correct, return as-is
    return imagePath;
  }
  
  const normalized = normalizePath(imagePath);
  
  // Strategy 1: Exact match
  if (mapping[normalized]) {
    return mapping[normalized];
  }
  
  // Strategy 2: Try with/without images/ prefix
  if (normalized.startsWith('images/')) {
    const withoutPrefix = normalized.replace(/^images\//, '');
    if (mapping[withoutPrefix]) {
      return mapping[withoutPrefix];
    }
  } else {
    const withPrefix = `images/${normalized}`;
    if (mapping[withPrefix]) {
      return mapping[withPrefix];
    }
  }
  
  // Strategy 3: Match by filename (for nested folder structures)
  // e.g., if products.json has "/images/product-slug/image.jpg"
  // and mapping has "product-slug/image.jpg"
  const filename = normalized.split('/').pop(); // Get just the filename
  const dirname = normalized.substring(0, normalized.lastIndexOf('/')); // Get directory part
  
  // Try to find by matching the last part of the path
  // This handles cases like: "/images/product-slug/image.jpg" -> "product-slug/image.jpg"
  for (const [key, value] of Object.entries(mapping)) {
    // Match if the key ends with the same filename and directory structure
    if (key.endsWith(normalized)) {
      return value;
    }
    // Match if normalized ends with key (reverse match)
    if (normalized.endsWith(key)) {
      return value;
    }
    // Match by filename if directory structure matches
    if (key.includes('/') && key.endsWith(`/${filename}`)) {
      const keyDir = key.substring(0, key.lastIndexOf('/'));
      if (normalized.includes(keyDir) || dirname.includes(keyDir)) {
        return value;
      }
    }
  }
  
  // Strategy 4: Match by filename only (last resort)
  // Only use this if we have a unique filename match
  const filenameMatches = Object.entries(mapping).filter(([key]) => 
    key.endsWith(`/${filename}`) || key === filename
  );
  
  if (filenameMatches.length === 1) {
    // Only use if there's exactly one match (unique filename)
    return filenameMatches[0][1];
  }
  
  return null;
}

// Update product images
function updateProductImages(product, mapping, stats) {
  let updated = false;
  
  // Handle images array
  if (Array.isArray(product.images)) {
    const newImages = product.images.map(img => {
      const cloudflareUrl = findCloudflareUrl(img, mapping);
      if (cloudflareUrl && cloudflareUrl !== img) {
        stats.updated++;
        updated = true;
        return cloudflareUrl;
      }
      return img;
    });
    if (updated) {
      product.images = newImages;
    }
  }
  
  // Handle single image field
  if (product.image && !Array.isArray(product.image)) {
    const cloudflareUrl = findCloudflareUrl(product.image, mapping);
    if (cloudflareUrl && cloudflareUrl !== product.image) {
      product.image = cloudflareUrl;
      stats.updated++;
      updated = true;
    }
  }
  
  // Handle image as array
  if (Array.isArray(product.image)) {
    const newImageArray = product.image.map(img => {
      const cloudflareUrl = findCloudflareUrl(img, mapping);
      if (cloudflareUrl && cloudflareUrl !== img) {
        stats.updated++;
        updated = true;
        return cloudflareUrl;
      }
      return img;
    });
    if (updated) {
      product.image = newImageArray;
    }
  }
  
  if (updated) {
    stats.productsUpdated++;
  } else {
    stats.productsSkipped++;
  }
  
  return updated;
}

// Main function
function main() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║   Update products.json with Cloudflare Images      ║');
  console.log('╚════════════════════════════════════════════════════╝\n');
  
  // Load mapping
  console.log('📋 Loading image mappings...');
  const mapping = loadMapping();
  console.log(`   Found ${Object.keys(mapping).length} image mappings\n`);
  
  // Load products.json
  if (!fs.existsSync(CONFIG.productsJsonPath)) {
    console.error(`❌ Products JSON not found: ${CONFIG.productsJsonPath}`);
    console.error('   Specify the path as an argument:');
    console.error('   node scripts/update-products-json.js /path/to/products.json');
    process.exit(1);
  }
  
  console.log(`📄 Loading products.json...`);
  console.log(`   Path: ${CONFIG.productsJsonPath}\n`);
  
  let products;
  try {
    const content = fs.readFileSync(CONFIG.productsJsonPath, 'utf8');
    products = JSON.parse(content);
  } catch (err) {
    console.error(`❌ Error reading products.json: ${err.message}`);
    process.exit(1);
  }
  
  if (!Array.isArray(products)) {
    console.error('❌ products.json must be an array');
    process.exit(1);
  }
  
  console.log(`   Found ${products.length} products\n`);
  
  // Create backup
  if (CONFIG.createBackup && !CONFIG.dryRun) {
    const backupPath = CONFIG.productsJsonPath + '.backup.' + Date.now();
    fs.copyFileSync(CONFIG.productsJsonPath, backupPath);
    console.log(`💾 Backup created: ${backupPath}\n`);
  }
  
  // Update products
  console.log('🔄 Updating product images...\n');
  
  const stats = {
    productsUpdated: 0,
    productsSkipped: 0,
    updated: 0,
    notFound: 0,
  };
  
  const notFoundImages = new Set(); // Use Set to avoid duplicates
  
  products.forEach((product, index) => {
    updateProductImages(product, mapping, stats);
    
    // Track images that couldn't be mapped
    const productImages = Array.isArray(product.images) 
      ? product.images 
      : (Array.isArray(product.image) ? product.image : [product.image]);
    
    productImages.forEach(img => {
      if (img && !img.includes('imagedelivery.net') && !findCloudflareUrl(img, mapping)) {
        notFoundImages.add(img);
        stats.notFound++;
      }
    });
    
    // Progress update every 50 products for better feedback
    if (index % 50 === 0 && index > 0) {
      const percent = Math.round((index / products.length) * 100);
      process.stdout.write(`\r   [${percent}%] Processed ${index.toLocaleString()}/${products.length.toLocaleString()} products...`);
    }
  });
  
  const percent = Math.round((products.length / products.length) * 100);
  console.log(`\r   [${percent}%] Processed ${products.length.toLocaleString()}/${products.length.toLocaleString()} products\n`);
  
  // Save updated products.json
  if (!CONFIG.dryRun) {
    console.log('💾 Saving updated products.json...');
    fs.writeFileSync(
      CONFIG.productsJsonPath,
      JSON.stringify(products, null, 2),
      'utf8'
    );
    console.log('   ✅ Saved!\n');
  } else {
    console.log('🔍 DRY RUN - No changes saved\n');
  }
  
  // Print statistics
  console.log('═'.repeat(55));
  console.log('📊 Update Statistics');
  console.log('═'.repeat(55));
  console.log(`   ✅ Products updated:  ${stats.productsUpdated}`);
  console.log(`   ⏭️  Products skipped: ${stats.productsSkipped}`);
  console.log(`   🖼️  Images updated:    ${stats.updated}`);
  console.log(`   ❓ Images not found:  ${stats.notFound}`);
  console.log('═'.repeat(55));
  
  if (stats.notFound > 0) {
    const notFoundArray = Array.from(notFoundImages);
    console.log(`\n⚠️  ${notFoundArray.length} unique images couldn't be mapped to Cloudflare Images.`);
    console.log('   These images will keep their original URLs.');
    console.log('   Make sure all images were uploaded successfully.\n');
    
    if (notFoundArray.length <= 20) {
      console.log('   Unmapped images:');
      notFoundArray.forEach(img => {
        console.log(`     - ${img}`);
      });
    } else {
      console.log('   First 20 unmapped images:');
      notFoundArray.slice(0, 20).forEach(img => {
        console.log(`     - ${img}`);
      });
      console.log(`     ... and ${notFoundArray.length - 20} more`);
      
      // Save full list to file
      const notFoundFile = path.join(__dirname, 'unmapped-images.json');
      fs.writeFileSync(notFoundFile, JSON.stringify(notFoundArray, null, 2));
      console.log(`\n   Full list saved to: ${notFoundFile}`);
    }
  }
  
  if (!CONFIG.dryRun && stats.productsUpdated > 0) {
    console.log(`\n🎉 Successfully updated ${stats.productsUpdated} products!`);
    console.log('   Your products.json now uses Cloudflare Images URLs.');
    console.log('   Rebuild your app to see the changes.\n');
  }
}

main();

