/**
 * Fix Cloudflare Images URLs in mapping file
 * 
 * This script fixes incorrect URLs in the mapping file by replacing
 * the filename-based account hash with the correct account hash.
 * 
 * Usage: node scripts/fix-mapping-urls.cjs
 */

const fs = require('fs');
const path = require('path');

const ACCOUNT_HASH = 'Ysm_SanI713eaOY5mRhkPQ';
const MAPPING_FILE = path.join(__dirname, 'cloudflare-images-mapping.json');
const BACKUP_FILE = MAPPING_FILE + '.backup.' + Date.now();

console.log('🔧 Fixing Cloudflare Images URLs in mapping file...\n');

// Load mapping file
if (!fs.existsSync(MAPPING_FILE)) {
  console.error('❌ Mapping file not found:', MAPPING_FILE);
  process.exit(1);
}

console.log('📋 Loading mapping file...');
const mapping = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf8'));

// Create backup
console.log('💾 Creating backup...');
fs.copyFileSync(MAPPING_FILE, BACKUP_FILE);
console.log(`   Backup saved: ${BACKUP_FILE}\n`);

// Fix URLs
console.log('🔄 Fixing URLs...');
let fixed = 0;
let unchanged = 0;

const fixedMapping = {};

for (const [key, url] of Object.entries(mapping)) {
  // Check if URL needs fixing (has filename instead of account hash)
  // Pattern: https://imagedelivery.net/{filename}/{image_id}/public
  const urlMatch = url.match(/^https:\/\/imagedelivery\.net\/([^\/]+)\/([^\/]+)\/([^\/]+)$/);
  
  if (urlMatch) {
    const [, firstPart, imageId, variant] = urlMatch;
    
    // If first part looks like a filename (has extension), fix it
    if (firstPart.match(/\.(webp|jpg|jpeg|png|gif|svg|avif)$/i)) {
      // Replace with correct account hash
      const fixedUrl = `https://imagedelivery.net/${ACCOUNT_HASH}/${imageId}/${variant}`;
      fixedMapping[key] = fixedUrl;
      fixed++;
    } else {
      // Already correct or different format
      fixedMapping[key] = url;
      unchanged++;
    }
  } else {
    // URL format doesn't match, keep as-is
    fixedMapping[key] = url;
    unchanged++;
  }
}

// Save fixed mapping
console.log('💾 Saving fixed mapping...');
fs.writeFileSync(MAPPING_FILE, JSON.stringify(fixedMapping, null, 2));

console.log('\n' + '═'.repeat(55));
console.log('✅ Fix Complete!');
console.log('═'.repeat(55));
console.log(`   🔧 Fixed:    ${fixed.toLocaleString()} URLs`);
console.log(`   ✅ Unchanged: ${unchanged.toLocaleString()} URLs`);
console.log(`   💾 Backup:    ${BACKUP_FILE}`);
console.log('═'.repeat(55));
console.log('\n📝 Next step: Run update-products-json script to update products.json');
console.log('   node scripts/update-products-json.cjs\n');

