// Generate OG Image for products
export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).send('Product ID required');
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
      return res.status(404).send('Product not found');
    }

    // Redirect to the product's actual image
    const imageUrl = product.images[0].startsWith('http')
      ? product.images[0]
      : `https://thesolowardrobe.com${product.images[0]}`;

    return res.redirect(302, imageUrl);
  } catch (error) {
    return res.status(500).send('Error: ' + error.message);
  }
}
