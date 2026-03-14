// Generate OG Image for products
export default async function handler(req, res) {
  const { id } = req.query;

  if (!id || !/^[a-zA-Z0-9_-]{1,150}$/.test(id)) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(400).send('Invalid product ID');
  }

  try {
    // Fetch product data
    const productsResponse = await fetch('https://thesolowardrobe.com/data/products.json');
    const products = await productsResponse.json();

    const product = products.find(p =>
      String(p._id || p.slug) === String(id) ||
      String(p.slug) === String(id)
    );

    if (!product || !product.images?.[0]) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.status(404).send('Product not found');
    }

    // Redirect to the product's actual image
    const imageUrl = product.images[0].startsWith('http')
      ? product.images[0]
      : `https://thesolowardrobe.com${product.images[0]}`;

    // Cache image redirects for 15 minutes (900 seconds)
    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=600');
    return res.redirect(302, imageUrl);
  } catch (error) {
    console.error('Error in OG image function:', error);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(500).send('Internal server error');
  }
}
