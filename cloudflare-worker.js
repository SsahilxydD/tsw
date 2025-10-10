// Cloudflare Worker for OG Meta Tags
// 100% free, no servers needed, deploy in 2 minutes

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Only handle product pages
    const productMatch = url.pathname.match(/^\/product\/([^\/]+)$/);

    if (!productMatch) {
      // Not a product page, fetch normally
      return fetch(request);
    }

    // Check if it's a bot/crawler
    const userAgent = request.headers.get('User-Agent') || '';
    const isBot = /bot|crawler|spider|facebook|whatsapp|twitter|linkedin|slack|telegram/i.test(userAgent);

    if (!isBot) {
      // Regular user, serve normally
      return fetch(request);
    }

    // It's a bot on a product page - inject meta tags
    const productId = productMatch[1];

    try {
      // Fetch products data
      const productsResponse = await fetch('https://thesolowardrobe.com/data/products.json');
      const products = await productsResponse.json();

      // Find product
      const product = products.find(p =>
        String(p._id || p.slug) === String(productId) ||
        String(p.slug) === String(productId)
      );

      if (!product) {
        return fetch(request);
      }

      // Extract product details
      const productName = product.name || product.title || 'Product';
      const productImage = Array.isArray(product.images)
        ? product.images[0]
        : (Array.isArray(product.image) ? product.image[0] : product.image);

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

      const productUrl = `${baseUrl}/product/${productId}`;

      // Fetch the base HTML
      const htmlResponse = await fetch(`${baseUrl}/index.html`);
      let html = await htmlResponse.text();

      // Helper to escape HTML
      const escapeHtml = (text) => {
        return String(text)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
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

      // Inject meta tags
      html = html.replace(/<title>.*?<\/title>/i, '');
      html = html.replace(/<meta\s+name=["']description["'][^>]*>/gi, '');
      html = html.replace('</head>', `${metaTags}\n</head>`);

      return new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
        },
      });

    } catch (error) {
      console.error('Worker error:', error);
      return fetch(request);
    }
  },
};
