// Simple Express server for OG meta tags
// Run this on your VPS: node og-server.js
// Then proxy /product/* requests through this before serving the SPA

const express = require('express');
const https = require('https');

const app = express();
app.disable('x-powered-by');
const PORT = 3001;

// Request timeout middleware
app.use((req, res, next) => { req.setTimeout(10000, () => res.status(408).send('Request Timeout')); next(); });

// Helper to fetch URL
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => res.statusCode === 200 ? resolve(data) : reject(new Error(`HTTP ${res.statusCode}`)));
    });
    req.on('error', reject);
    // Don't let a hung upstream hold the socket open indefinitely.
    req.setTimeout(8000, () => req.destroy(new Error('fetchUrl timeout')));
  });
}

app.get('/product/:id', async (req, res) => {
  const { id } = req.params;

  if (!id || !/^[a-zA-Z0-9_-]{1,150}$/.test(id)) {
    return res.status(400).send('Invalid product ID');
  }

  try {
    // Fetch products
    const productsJson = await fetchUrl('https://thesolowardrobe.com/data/products.json');
    const products = JSON.parse(productsJson);

    // Find product
    const product = products.find(p =>
      String(p._id || p.slug) === String(id) ||
      String(p.slug) === String(id)
    );

    if (!product) {
      return res.status(404).send('Product not found');
    }

    // Extract details
    const productName = product.name || product.title || 'Product';
    const productImage = Array.isArray(product.images)
      ? product.images[0]
      : (product.image?.[0] || product.image);

    const baseUrl = 'https://thesolowardrobe.com';
    // Only build an image URL when the product has an image, otherwise we'd emit
    // "https://thesolowardrobe.com/undefined" and break the link preview.
    const imageUrl = productImage
      ? (String(productImage).startsWith('http')
          ? productImage
          : `${baseUrl}${String(productImage).startsWith('/') ? productImage : `/${productImage}`}`)
      : null;

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

    // Fetch base HTML
    const html = await fetchUrl(`${baseUrl}/index.html`);

    const escapeHtml = (text) => String(text).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

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

    let modifiedHtml = html.replace(/<title>.*?<\/title>/i, '');
    modifiedHtml = modifiedHtml.replace(/<meta\s+name=["']description["'][^>]*>/gi, '');
    modifiedHtml = modifiedHtml.replace('</head>', `${metaTags}\n</head>`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(modifiedHtml);

  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal server error');
  }
});

app.listen(PORT, () => {
  console.log(`OG server running on port ${PORT}`);
  console.log('Configure your Nginx to proxy /product/* requests to this server');
});
