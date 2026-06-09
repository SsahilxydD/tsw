// Cloudflare Worker for OG Meta Tags
// 100% free, no servers needed, deploy in 2 minutes
//
// Bundled by wrangler/esbuild, so this import is inlined at deploy time.
import { computeDisplayPrice } from './src/utils/pricing.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Only handle product pages
    const productMatch = url.pathname.match(/^\/product\/([^\/]+)$/);

    if (!productMatch) {
      // Not a product page, fetch normally from Pages origin
      return fetch(request);
    }

    // Check if it's a bot/crawler (Facebook uses 'facebookexternalhit' and 'Facebot')
    // Cap the length before running any regex over this attacker-controlled header.
    const userAgent = (request.headers.get('User-Agent') || '').slice(0, 512);
    const isBot = /bot|crawler|spider|facebook|facebookexternalhit|facebot|whatsapp|twitter|linkedin|slack|telegram|pinterest|googlebot|bingbot/i.test(userAgent);
    
    // Also check for Facebook's specific crawler headers
    const isFacebookBot = userAgent.includes('facebookexternalhit') || userAgent.includes('Facebot');

    if (!isBot && !isFacebookBot) {
      // Regular user, serve normally
      return fetch(request);
    }

    // It's a bot on a product page - inject meta tags
    const productId = productMatch[1];
    
    console.log('Bot detected on product page:', userAgent, 'Product ID:', productId);

    try {
      // Get origin URL once for all fetches (ensures we fetch from Cloudflare Pages, not old VPS)
      const originUrl = new URL(request.url);
      const origin = `${originUrl.protocol}//${originUrl.host}`;
      
      // Fetch products data from Pages origin
      const productsUrl = `${origin}/data/products.json`;
      const productsResponse = await fetch(productsUrl);
      
      if (!productsResponse.ok) {
        console.error('Failed to fetch products.json:', productsResponse.status);
        return fetch(request);
      }
      
      const products = await productsResponse.json();

      if (!Array.isArray(products)) {
        console.error('products.json was not an array');
        return fetch(request);
      }

      // Find product
      const product = products.find(p =>
        String(p._id || p.slug) === String(productId) ||
        String(p.slug) === String(productId)
      );

      if (!product) {
        console.log('Product not found for ID:', productId);
        return fetch(request);
      }
      
      console.log('Product found:', product.name || product.title);

      // Extract product details
      const productName = product.name || product.title || product.slug_name || 'Product';
      
      // Get product image - try multiple sources
      let productImage = null;
      if (Array.isArray(product.images) && product.images.length > 0) {
        productImage = product.images[0];
      } else if (Array.isArray(product.image) && product.image.length > 0) {
        productImage = product.image[0];
      } else if (product.image) {
        productImage = product.image;
      }

      // Build absolute image URL - handle all cases and optimize for OG
      let imageUrl = null;
      if (productImage) {
        const imgStr = String(productImage).trim();
        let baseImageUrl = null;
        
        if (imgStr.startsWith('http://') || imgStr.startsWith('https://')) {
          // Already absolute URL
          baseImageUrl = imgStr;
        } else if (imgStr.startsWith('/')) {
          // Absolute path - use origin
          baseImageUrl = `${origin}${imgStr}`;
        } else {
          // Relative path
          baseImageUrl = `${origin}/${imgStr}`;
        }
        
        // OPTIMIZE FOR OG: Resize and optimize image for social media
        // Facebook/WhatsApp prefer 1200x630 (1.91:1), but 1200x1200 works well too
        if (baseImageUrl.includes('imagedelivery.net')) {
          // Cloudflare Images: Add optimization parameters
          // Format: https://imagedelivery.net/{account_hash}/{image_id}/{variant}
          try {
            const url = new URL(baseImageUrl);
            const pathParts = url.pathname.split('/').filter(Boolean);
            
            if (pathParts.length >= 2) {
              const accountHash = pathParts[0];
              const imageId = pathParts[1];
              
              // Build optimized OG image URL with:
              // - w=1200: width 1200px (Facebook/WhatsApp optimal)
              // - h=1200: height 1200px (square format works well)
              // - q=85: quality 85% (good balance of quality/size)
              // - f=auto: auto format (WebP/AVIF when supported, falls back to JPEG)
              // - fit=cover: cover the dimensions (cropping if needed)
              imageUrl = `https://imagedelivery.net/${accountHash}/${imageId}/w=1200,h=1200,q=85,f=auto,fit=cover`;
            } else {
              imageUrl = baseImageUrl;
            }
          } catch (e) {
            // If URL parsing fails, use original
            console.warn('Failed to parse Cloudflare Images URL:', e);
            imageUrl = baseImageUrl;
          }
        } else {
          // For images on your own domain, use Cloudflare's image resizing service
          // This requires Cloudflare Image Resizing to be enabled
          // Format: https://yourdomain.com/cdn-cgi/image/{options}/{path}
          try {
            const baseUrlObj = new URL(baseImageUrl);
            const originObj = new URL(origin);
            
            // Check if image is on the same domain as origin
            if (baseUrlObj.hostname === originObj.hostname) {
              const imagePath = baseUrlObj.pathname + baseUrlObj.search + baseUrlObj.hash;
              imageUrl = `${origin}/cdn-cgi/image/width=1200,height=1200,quality=85,format=auto,fit=cover${imagePath}`;
            } else {
              // For other domains, use as-is
              imageUrl = baseImageUrl;
            }
          } catch (e) {
            // If URL parsing fails, use original
            console.warn('Failed to parse image URL for CDN optimization:', e);
            imageUrl = baseImageUrl;
          }
        }
      }
      
      // Only set imageUrl if we have a valid product image
      if (!imageUrl) {
        console.warn('No product image found for product:', productId);
        // Don't set fallback - let imageUrl be null so we don't include invalid og:image
      } else {
        console.log('Product image URL (optimized for OG):', imageUrl);
      }

      // Category hints for the description opening + size processing below.
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

      // Display price/mrp from the shared pricing module (src/utils/pricing.js) so
      // social-preview prices stay identical to what the storefront shows. mrp is
      // kept raw (no markup) to match ShopContext's discount math.
      const displayPrice = computeDisplayPrice(product);
      const displayMrp = product.mrp ? Math.max(0, Number(product.mrp)) : null;

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

      const productUrl = `${origin}/product/${productId}`;

      // Fetch the base HTML from Pages origin (reuse origin from above)
      const htmlUrl = `${origin}/index.html`;
      const htmlResponse = await fetch(htmlUrl);
      if (!htmlResponse.ok) {
        // Don't inject meta tags into an origin error page and cache it for 15 min.
        console.error('Failed to fetch index.html:', htmlResponse.status);
        return fetch(request);
      }
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
    ${imageUrl ? `<meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="1200" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:alt" content="${escapeHtml(productName)}" />` : ''}
    <meta property="og:site_name" content="Solo Wardrobe" />
    <meta property="product:price:amount" content="${displayPrice || 0}" />
    <meta property="product:price:currency" content="INR" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(productName)} – Solo Wardrobe" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    ${imageUrl ? `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />` : ''}
    `;

      // Remove existing OG tags and meta tags before injecting new ones
      html = html.replace(/<title>.*?<\/title>/i, '');
      html = html.replace(/<meta\s+name=["']description["'][^>]*>/gi, '');
      // Remove all existing OG tags
      html = html.replace(/<meta\s+property=["']og:[^>]*>/gi, '');
      html = html.replace(/<meta\s+name=["']twitter:[^>]*>/gi, '');
      // Remove canonical link if exists
      html = html.replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '');
      // Inject new meta tags
      html = html.replace('</head>', `${metaTags}\n</head>`);

      return new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          // Cache OG meta tags for 15 minutes (900 seconds) since product data doesn't change frequently
          'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=600',
        },
      });

    } catch (error) {
      console.error('Worker error:', error);
      return fetch(request);
    }
  },
};
