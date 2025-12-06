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

      // Images are served from /data/images/* path
      let imageUrl = productImage;
      if (productImage?.startsWith('http')) {
        imageUrl = productImage;
      } else if (productImage?.startsWith('/images/')) {
        // Need to add /data prefix
        imageUrl = `${baseUrl}/data${productImage}`;
      } else if (productImage?.startsWith('/')) {
        imageUrl = `${baseUrl}${productImage}`;
      } else {
        imageUrl = `${baseUrl}/${productImage}`;
      }

      // Apply same price adjustments as ShopContext
      const basePrice = Number(product.price || 0);
      const originalCategory = product.category || '';
      const title = product.title || product.slug_name || '';
      const normalize = (s) => String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[_]/g, ' ')
        .replace(/[–—]/g, '-')
        .replace(/\s+/g, ' ')
        .trim();
      const hint = normalize(`${originalCategory} ${product.subCategory || ''} ${title}`);

      // Category detection (same logic as ShopContext)
      const any = (regexes) => regexes.some(r => r.test(hint));
      const isBelt = any([/\bbelts?\b/i, /waist\s*belt/i]);
      const isCap = any([/\bcaps?\b/i, /\bhat(s)?\b/i, /\bbeanie\b/i]);
      const isFlipFlop = any([/(flip\s*-?\s*flops?)/i, /\bslides?\b/i, /\bslippers?\b/i, /\bclogs?\b/i, /\bsandals?\b/i]);
      const isHoodie = any([/\bhoodies?\b/i, /hooded\s+sweatshirt/i, /zip\s*hoodie/i]);
      const isHandbag = any([/(hand\s*bags?)/i, /\bhandbag\b/i, /\btote\b/i]);
      const isJacket = any([/\bjackets?\b/i, /\bwindcheaters?\b/i, /\bblazers?\b/i]);
      const isShirt = any([/\bshirts?\b/i, /formal\s+shirt/i, /casual\s+shirt/i, /linen\s+shirt/i]);
      const isSunglasses = any([/(sunglass|sunglasses|shades)\b/i, /\bgoggles\b/i, /\bspectacles\b/i, /\bspecs\b/i, /\baviators?\b/i]);
      const isSweatshirt = any([/\bsweat\s*-?\s*shirts?\b/i, /\bsweatshirt\b/i]);
      const isTShirt = any([/(t\s*-?\s*shirts?|t-?shirts?|tshirt|t\s*shirt)\b/i, /\btees?\b/i, /crew\s*neck/i, /round\s*neck/i]);
      const isTrackPant = any([/(track\s*-?\s*pants?|trackpants?)\b/i, /\bjoggers?\b/i, /\btracks?\b/i]);
      const isTracksuit = any([/\btrack\s*-?\s*suits?\b/i, /\btracksuits?\b/i]);
      const isWallet = any([/\bwallets?\b/i, /card\s*holder/i]);
      const isWomensWatch = any([/(women['']s?\s+watch|lad(?:y|ies)\s+watch)/i]);
      const isMensWatch = /\bwatch\b/i.test(hint) && !isWomensWatch;
      const isWomensPerfume = any([
        /(women['']s?\s+perfume|pour\s+femme)/i,
        /\bfragrance\b/i,
        /\bwomen\s*perfume\b/i,
        /\bwomens\s*perfume\b/i,
        /\bwomens?perfume\b/i
      ]);
      const isMensPerfume = any([
        /(men['']s?\s+perfume|pour\s+homme)/i,
        /\bmen\s*perfume\b/i,
        /\bmens\s*perfume\b/i,
        /\bmenperfume\b/i
      ]) || (/\b(edp|edt|eau\s+de\s+parfum|eau\s+de\s+toilette)\b/i.test(hint) && !isWomensPerfume);
      const isDiscounted = /\b(discounted|sale)\b/i.test((originalCategory || '').toLowerCase());
      const isJeans = any([/\bjeans?\b/i, /\bdenim\b/i]);
      const isShoe = any([/\bshoes?\b/i, /\bsneakers?\b/i, /\bfootwear\b/i, /\bboots?\b/i, /\bsandals?\b/i]);

      // Calculate price adjustment (same logic as ShopContext)
      let priceAdj = 0;
      if (isDiscounted) {
        priceAdj = 0;
      } else if (isBelt) {
        priceAdj = 200;
      } else if (isCap) {
        priceAdj = 200;
      } else if (isFlipFlop) {
        priceAdj = 150;
      } else if (isHoodie) {
        priceAdj = 150;
      } else if (isHandbag) {
        priceAdj = 100;
      } else if (isJacket) {
        priceAdj = 150;
      } else if (isJeans) {
        priceAdj = 100;
      } else if (isWomensWatch) {
        priceAdj = 150;
      } else if (isMensPerfume) {
        priceAdj = 150;
      } else if (isShirt) {
        priceAdj = 200;
      } else if (isSunglasses) {
        priceAdj = 250;
      } else if (isSweatshirt) {
        priceAdj = 200;
      } else if (isTShirt) {
        priceAdj = 150;
      } else if (isTrackPant) {
        priceAdj = 200;
      } else if (isTracksuit) {
        priceAdj = 150;
      } else if (isWallet) {
        priceAdj = 150;
      } else if (isMensWatch) {
        priceAdj = 150;
      } else if (isWomensPerfume) {
        priceAdj = 150;
      } else if (isShoe) {
        priceAdj = 550;
      }

      const displayPrice = Math.max(0, basePrice + priceAdj);
      const displayMrp = product.mrp ? Math.max(0, Number(product.mrp) + priceAdj) : null;

      // Process sizes (same logic as ProductItem.jsx)
      const processSizes = (product) => {
        let sizes = Array.isArray(product.sizes) ? product.sizes : [];
        if (sizes.length === 0) return [];

        // Helper functions for size processing
        const toUKLabel = (raw) => {
          if (!raw) return null;
          const s = String(raw).toUpperCase().trim();

          // UK format: "UK 7", "UK-7", etc.
          let m = s.match(/\bUK\s*[-:]?\s*(\d{1,2}(?:\.5)?)\b/);
          if (m) return `UK-${m[1]}`;

          // M-7 format
          m = s.match(/^M[-\s]?(\d{1,2}(?:\.5)?)$/);
          if (m) return `UK-${m[1]}`;

          // Bare number: 5-12 assumed UK shoe sizes
          m = s.match(/^(\d{1,2})(?:\.5)?$/);
          if (m) {
            const n = parseFloat(m[1]);
            if (n >= 5 && n <= 12) return `UK-${n}`;
          }

          return null;
        };

        const normalizeJeansSize = (raw) => {
          const s = String(raw).toUpperCase().trim();
          const m = s.match(/\b(\d{2})\b/);
          if (!m) return null;
          const n = parseInt(m[1], 10);
          if (n >= 26 && n <= 48) return String(n);
          return null;
        };

        // Process based on category
        let processed = [];
        if (isShoe) {
          // Footwear: convert to UK sizes and filter 5-12
          for (const sz of sizes) {
            const uk = toUKLabel(sz);
            if (uk) {
              const n = parseFloat(uk.replace(/[^0-9.]/g, ''));
              if (n >= 5 && n <= 12) processed.push(uk);
            }
          }
          processed.sort((a, b) => {
            const na = parseFloat(a.replace(/[^0-9.]/g, ''));
            const nb = parseFloat(b.replace(/[^0-9.]/g, ''));
            return na - nb;
          });
        } else if (isJeans) {
          // Jeans: extract waist sizes
          for (const sz of sizes) {
            const waist = normalizeJeansSize(sz);
            if (waist) processed.push(waist);
          }
          processed.sort((a, b) => parseInt(a) - parseInt(b));
        } else {
          // Regular clothing: filter out placeholder sizes
          processed = sizes.map(s => String(s).trim()).filter(Boolean);
        }

        // Remove "onesize", "std", "os" placeholders
        const bad = /^(one\s?size|onesize|os|std)$/i;
        processed = processed.filter(s => !bad.test(s));

        // Remove duplicates (case-insensitive)
        const seen = new Set();
        const unique = [];
        for (const s of processed) {
          const key = s.toUpperCase();
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(s);
          }
        }

        return unique;
      };

      const availableSizes = processSizes(product);

      // Generate engaging description with better context
      const category = product.category || '';

      // Create a compelling opening based on category
      let opening = '✨ Premium Fashion';
      if (isShoe) opening = '👟 Step Up Your Style';
      else if (isTShirt) opening = '👕 Essential Wardrobe Staple';
      else if (isJeans) opening = '👖 Perfect Fit Denim';
      else if (isSunglasses) opening = '🕶️ Elevate Your Look';
      else if (isWallet) opening = '💼 Everyday Essential';
      else if (isHoodie || isSweatshirt) opening = '🔥 Cozy & Stylish';
      else if (isBelt) opening = '⚡ Complete Your Outfit';

      // Build size availability text
      let sizeInfo = '';
      if (availableSizes.length > 0) {
        const sizesToShow = availableSizes.slice(0, 4);
        const formattedSizes = sizesToShow.map(s => s.replace(/^UK-/, '')).join(', ');
        sizeInfo = `Sizes: ${formattedSizes}`;
        if (availableSizes.length > 4) {
          sizeInfo += ` +${availableSizes.length - 4} more`;
        }
        sizeInfo = ` | ${sizeInfo}`;
      }

      // Discount badge
      let discountBadge = '';
      if (displayMrp && displayPrice && displayMrp > displayPrice) {
        const discount = Math.round(((displayMrp - displayPrice) / displayMrp) * 100);
        discountBadge = ` | 🏷️ ${discount}% OFF`;
      }

      // Price info
      const priceInfo = displayPrice ? ` | ₹${displayPrice.toLocaleString('en-IN')}` : '';

      // Category breadcrumb
      const categoryBreadcrumb = category ? ` in ${category}` : '';

      let description = `${opening} - ${productName}${categoryBreadcrumb}${priceInfo}${sizeInfo}${discountBadge} | Free Shipping | COD Available | Easy Returns`;

      if (description.length > 200) {
        description = description.substring(0, 197) + '...';
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
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:site_name" content="Solo Wardrobe" />
    <meta property="product:price:amount" content="${displayPrice}" />
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
