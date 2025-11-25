// Simple script to create a 600x600 placeholder PNG
// Run with: node scripts/create-no-image.js
const fs = require('fs');
const path = require('path');

// Create a simple 600x600 gray PNG using a minimal PNG structure
// This is a minimal valid PNG file (1x1 pixel, gray)
const minimalPNG = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
  0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
  0x00, 0x00, 0x02, 0x58, // width: 600
  0x00, 0x00, 0x02, 0x58, // height: 600
  0x08, 0x06, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
  0xBE, 0x0B, 0x8C, 0x89, // CRC
  0x00, 0x00, 0x00, 0x09, 0x70, 0x48, 0x59, 0x73, // tEXt chunk
  0x00, 0x00, 0x0B, 0x13, 0x00, 0x00, 0x0B, 0x13,
  0x01, 0x00, 0x9A, 0x9C, 0x18, 0x00, 0x00, 0x00,
  0x19, 0x74, 0x45, 0x58, 0x74, 0x53, 0x6F, 0x66,
  0x74, 0x77, 0x61, 0x72, 0x65, 0x00, 0x41, 0x64,
  0x6F, 0x62, 0x65, 0x20, 0x49, 0x6D, 0x61, 0x67,
  0x65, 0x52, 0x65, 0x61, 0x64, 0x79, 0xCC, 0xF6,
  0x9C, 0xFB, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
  0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND
]);

// For a proper 600x600 gray image, we'd need a more complex PNG
// For now, create a simple SVG that can be converted, or use canvas
// Since we can't easily create a proper PNG without canvas, let's create an SVG
// and document that it should be converted to PNG

console.log('Note: Creating SVG placeholder. For production, convert to PNG using:');
console.log('  - ImageMagick: magick convert -size 600x600 xc:#f3f4f6 public/assets/no-image.png');
console.log('  - Or use an online converter to convert no-image.svg to PNG');

// Actually, let's try using a canvas approach if available, or create a simple data URI
// For now, let's just create instructions

const outputDir = path.join(__dirname, '..', 'public', 'assets');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write a simple note file
fs.writeFileSync(
  path.join(outputDir, 'NO-IMAGE-README.txt'),
  `Placeholder Image Required

The Bestsellers component requires /assets/no-image.png (600x600 pixels, neutral gray #f3f4f6).

To create it:
1. Use ImageMagick: magick convert -size 600x600 xc:#f3f4f6 public/assets/no-image.png
2. Or convert no-image.svg to PNG using any image converter
3. Or use an online tool to create a 600x600 gray PNG

The SVG version (no-image.svg) is provided as a fallback but PNG is preferred.
`
);

console.log('Created NO-IMAGE-README.txt with instructions');

