// Vercel Serverless Function for Product Listing
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
  const { category, limit = 10 } = req.query;

  if (!category) {
    res.setHeader('Content-Type', 'application/json');
    // Don't cache error responses
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(400).json({ error: 'Category parameter required' });
  }

  try {
    // Fetch products from live URL
    const productsUrl = 'https://thesolowardrobe.com/data/products.json';
    const productsJson = await fetchUrl(productsUrl);
    const productsData = JSON.parse(productsJson);

    // Filter products by category (check both category and categoryRaw fields)
    const categoryLower = String(category).toLowerCase().trim();
    const filtered = productsData.filter(p => {
      const pCategory = String(p.category || '').toLowerCase().trim();
      const pCategoryRaw = String(p.categoryRaw || '').toLowerCase().trim();
      return pCategory === categoryLower || pCategoryRaw === categoryLower;
    });

    // Limit results
    const limited = filtered.slice(0, parseInt(limit, 10));

    // Format products for the slider
    const formatted = limited.map(item => {
      const images = Array.isArray(item.images) ? item.images : [];
      const image = images[0] || item.image || (Array.isArray(item.image) ? item.image[0] : '') || '';
      
      // Build image URL
      let imageUrl = image;
      if (image && !image.startsWith('http')) {
        imageUrl = image.startsWith('/') ? `https://thesolowardrobe.com${image}` : `https://thesolowardrobe.com/${image}`;
      }

      return {
        _id: item._id || item.slug || item.slug_name || '',
        title: item.title || item.name || item.slug_name || 'Product',
        price: Number(item.price || 0),
        mrp: Number(item.mrp || 0),
        image: imageUrl,
        slug: item.slug || item.slug_name || ''
      };
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Cache API responses for 10 minutes (600 seconds)
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=300');
    return res.status(200).json(formatted);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.setHeader('Content-Type', 'application/json');
    // Don't cache error responses
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(500).json({ error: 'Failed to fetch products: ' + error.message });
  }
};

