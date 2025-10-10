// Vercel Serverless Function for Product Page Meta Tags

module.exports = async (req, res) => {
  const { id } = req.query;

  // If no ID, serve default page
  if (!id) {
    return res.status(400).send('Product ID required');
  }

  try {
    // Fetch products from live URL
    const productsUrl = 'https://thesolowardrobe.com/data/products.json';
    const productsResponse = await fetch(productsUrl);

    if (!productsResponse.ok) {
      console.error('Failed to fetch products');
      return res.status(500).send('Error loading products');
    }

    const productsData = await productsResponse.json();

    // Find the product
    const product = productsData.find(p =>
      String(p._id || p.slug) === String(id) ||
      String(p.slug) === String(id)
    );

    if (!product) {
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
    const htmlResponse = await fetch(`${baseUrl}/index.html`);
    let html = await htmlResponse.text();

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
    html = html.replace(/<title>.*?<\/title>/i, '');
    html = html.replace(/<meta\s+name=["']description["'][^>]*>/gi, '');
    html = html.replace('</head>', `${metaTags}\n</head>`);

    // Return HTML with proper headers
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(html);

  } catch (error) {
    console.error('Error in OG function:', error);
    return res.status(500).send('Internal server error');
  }
};
