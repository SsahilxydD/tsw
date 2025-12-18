// Vercel Serverless Function for Product Page Meta Tags
const https = require('https');

// Helper to fetch URL content
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    }).on('error', reject);
  });
}

module.exports = async (req, res) => {
  const { id } = req.query;

  // If no ID, return error
  if (!id) {
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(400).send('Product ID required');
  }

  try {
    // Fetch products from live URL
    const productsUrl = 'https://thesolowardrobe.com/data/products.json';
    const productsJson = await fetchUrl(productsUrl);
    const productsData = JSON.parse(productsJson);

    // Find the product
    const product = productsData.find(p =>
      String(p._id || p.slug) === String(id) ||
      String(p.slug) === String(id)
    );

    if (!product) {
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.status(404).send('Product not found');
    }

    // Extract product details
    const productName = product.name || product.title || 'Product';
    const productImage = Array.isArray(product.images)
      ? product.images[0]
      : (Array.isArray(product.image) ? product.image[0] : product.image);

    // Build absolute image URL
    const baseUrl = 'https://thesolowardrobe.com';
    const imageUrl = productImage?.startsWith('http')
      ? productImage
      : `${baseUrl}${productImage?.startsWith('/') ? productImage : `/${productImage}`}`;

    // Generate description
    const brand = product.brand ? ` by ${product.brand}` : '';
    const category = product.category ? ` in ${product.category}` : '';
    const priceText = product.price ? ` for ₹${Number(product.price).toLocaleString('en-IN')}` : '';
    let description = `Shop ${productName}${brand}${category}${priceText} at Solo Wardrobe.`;

    if (product.mrp && product.price && product.mrp > product.price) {
      const discount = Math.round(((product.mrp - product.price) / product.mrp) * 100);
      description += ` Save ${discount}%!`;
    }

    if (description.length > 160) {
      description = description.substring(0, 157) + '...';
    }

    const productUrl = `${baseUrl}/product/${id}`;

    // Fetch the base index.html
    const html = await fetchUrl(`${baseUrl}/index.html`);

    // Helper to escape HTML
    const escapeHtml = (text) => {
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };
      return String(text).replace(/[&<>"']/g, m => map[m]);
    };

    // Create meta tags
    const metaTags = `
    <title>${escapeHtml(productName)} – Solo Wardrobe</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${productUrl}" />

    <!-- Open Graph -->
    <meta property="og:title" content="${escapeHtml(productName)} – Solo Wardrobe" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${productUrl}" />
    <meta property="og:type" content="product" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:secure_url" content="${imageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="1200" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:site_name" content="Solo Wardrobe" />
    <meta property="product:price:amount" content="${product.price || 0}" />
    <meta property="product:price:currency" content="INR" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(productName)} – Solo Wardrobe" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${imageUrl}" />
    `;

    // Remove existing title and description tags, then inject new meta tags
    let modifiedHtml = html.replace(/<title>.*?<\/title>/i, '');
    modifiedHtml = modifiedHtml.replace(/<meta\s+name=["']description["'][^>]*>/gi, '');
    modifiedHtml = modifiedHtml.replace('</head>', `${metaTags}\n</head>`);

    // Return HTML with proper headers
    // Cache OG meta tags for 15 minutes (900 seconds) since product data doesn't change frequently
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=600');
    return res.status(200).send(modifiedHtml);

  } catch (error) {
    console.error('Error in OG function:', error);
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(500).send(`Error: ${error.message}`);
  }
};
