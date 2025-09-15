const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');

function loadProducts() {
  try {
    if (fs.existsSync(PRODUCTS_FILE)) {
      const raw = fs.readFileSync(PRODUCTS_FILE, 'utf8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
      if (list && Array.isArray(list.products)) return list.products;
    }
  } catch (e) {
    console.error('Failed to load products:', e.message);
  }
  return [];
}

function getProduct(id) {
  const list = loadProducts();
  return list.find((p) => String(p.id) === String(id)) || null;
}

module.exports = { loadProducts, getProduct };

