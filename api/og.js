// Vercel Serverless Function for Product Page Meta Tags
const https = require('https');

// Helper to fetch URL content
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    // Don't let a hung upstream hold the socket open indefinitely.
    req.setTimeout(8000, () => req.destroy(new Error('fetchUrl timeout')));
  });
}

module.exports = async (req, res) => {
  const { id } = req.query;

  // Validate id parameter
  if (!id || !/^[a-zA-Z0-9_-]{1,150}$/.test(id)) {
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(400).send('Invalid product ID');
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

    // Build absolute image URL. Only when the product actually has an image —
    // otherwise this would produce "https://thesolowardrobe.com/undefined" and
    // break the link preview on Facebook/WhatsApp/Twitter.
    const baseUrl = 'https://thesolowardrobe.com';
    const imageUrl = productImage
      ? (String(productImage).startsWith('http')
          ? productImage
          : `${baseUrl}${String(productImage).startsWith('/') ? productImage : `/${productImage}`}`)
      : null;

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
    <link rel="canonical" href="${escapeHtml(productUrl)}" />

    <!-- Open Graph -->
    <meta property="og:title" content="${escapeHtml(productName)} – Solo Wardrobe" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(productUrl)}" />
    <meta property="og:type" content="product" />
    ${imageUrl ? `<meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="1200" />
    <meta property="og:image:type" content="image/jpeg" />` : ''}
    <meta property="og:site_name" content="Solo Wardrobe" />
    <meta property="product:price:amount" content="${product.price || 0}" />
    <meta property="product:price:currency" content="INR" />

    <!-- Twitter -->
    <meta name="twitter:card" content="${imageUrl ? 'summary_large_image' : 'summary'}" />
    <meta name="twitter:title" content="${escapeHtml(productName)} – Solo Wardrobe" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    ${imageUrl ? `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />` : ''}
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
    return res.status(500).send('Internal server error');
  }
};
