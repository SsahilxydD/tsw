// src/utils/filterProducts.js
/**
 * Product filtering utilities
 */

/**
 * Filter products by price range
 */
export const filterByPrice = (products, minPrice, maxPrice) => {
  if (!Array.isArray(products)) return [];
  if (!minPrice && !maxPrice) return products;
  
  const min = Number(minPrice) || 0;
  const max = Number(maxPrice) || Infinity;
  
  return products.filter(product => {
    if (!product || typeof product !== 'object') return false;
    const price = Number(product.price) || 0;
    if (min && price < min) return false;
    if (max !== Infinity && price > max) return false;
    return true;
  });
};

/**
 * Filter products by sizes
 */
export const filterBySizes = (products, selectedSizes, normalizeSizesFn) => {
  if (!Array.isArray(products)) return [];
  if (!Array.isArray(selectedSizes) || selectedSizes.length === 0) return products;
  if (typeof normalizeSizesFn !== 'function') return products;

  return products.filter(product => {
    if (!product || typeof product !== 'object') return false;
    try {
      const productSizes = new Set(normalizeSizesFn(product).map(String));
      return selectedSizes.some(size => productSizes.has(String(size)));
    } catch {
      return false;
    }
  });
};

/**
 * Filter products by brands
 */
export const filterByBrands = (products, selectedBrands) => {
  if (!Array.isArray(products)) return [];
  if (!Array.isArray(selectedBrands) || selectedBrands.length === 0) return products;

  return products.filter(product => {
    if (!product || typeof product !== 'object') return false;
    const brand = String(product.brand || '').trim().toLowerCase();
    return selectedBrands.some(selected => 
      brand === String(selected).trim().toLowerCase()
    );
  });
};

/**
 * Filter products by categories
 */
export const filterByCategories = (products, selectedCategories) => {
  if (!Array.isArray(products)) return [];
  if (!Array.isArray(selectedCategories) || selectedCategories.length === 0) return products;

  return products.filter(product => {
    if (!product || typeof product !== 'object') return false;
    const category = String(product.category || product.categoryRaw || '').trim().toLowerCase();
    return selectedCategories.some(selected => 
      category === String(selected).trim().toLowerCase()
    );
  });
};

/**
 * Filter products by colors
 */
export const filterByColors = (products, selectedColors) => {
  if (!Array.isArray(products)) return [];
  if (!Array.isArray(selectedColors) || selectedColors.length === 0) return products;

  return products.filter(product => {
    if (!product || typeof product !== 'object') return false;
    // Handle both array and single color values
    const productColors = Array.isArray(product.color) 
      ? product.color.map(c => String(c).trim().toLowerCase())
      : product.color 
        ? [String(product.color).trim().toLowerCase()]
        : [];
    
    if (productColors.length === 0) return false;
    
    return selectedColors.some(selected => 
      productColors.includes(String(selected).trim().toLowerCase())
    );
  });
};

/**
 * Get unique brands from products
 */
export const getUniqueBrands = (products) => {
  if (!Array.isArray(products)) return [];
  const brands = new Set();
  products.forEach(product => {
    if (!product || typeof product !== 'object') return;
    const brand = String(product.brand || '').trim();
    if (brand) brands.add(brand);
  });
  return Array.from(brands).sort();
};

/**
 * Get unique categories from products
 */
export const getUniqueCategories = (products) => {
  if (!Array.isArray(products)) return [];
  const categories = new Set();
  products.forEach(product => {
    if (!product || typeof product !== 'object') return;
    const cat = product.categoryRaw || product.category;
    if (cat) {
      const normalized = String(cat).trim().toLowerCase();
      categories.add(normalized);
    }
  });
  return Array.from(categories).sort();
};

/**
 * Get price range from products (min and max)
 */
export const getPriceRange = (products) => {
  if (!products || products.length === 0) {
    return { min: 0, max: 0 };
  }

  const prices = products
    .map(p => Number(p.price) || 0)
    .filter(p => p > 0);

  if (prices.length === 0) {
    return { min: 0, max: 0 };
  }

  return {
    min: Math.min(...prices),
    max: Math.max(...prices)
  };
};

/**
 * Apply all filters to products
 * 
 * @param {Array} products - Array of products to filter
 * @param {Object} filters - Filter object with the following structure:
 *   - priceRange: { min: number, max: number } (from FilterSidebar)
 *   - OR priceMin/priceMax: number (legacy format, for backward compatibility)
 *   - sizes: Array<string> - Selected sizes
 *   - brands: Array<string> - Selected brands
 *   - categories: Array<string> - Selected categories
 *   - colors: Array<string> - Selected colors
 * @param {Function} normalizeSizesFn - Function to normalize sizes for a product
 * @returns {Array} Filtered products array
 */
export const applyFilters = (products, filters, normalizeSizesFn) => {
  if (!Array.isArray(products)) return [];
  if (!filters || typeof filters !== 'object') return products;

  let filtered = [...products];

  // Price filter - support both priceRange (new) and priceMin/priceMax (legacy)
  if (filters.priceRange && typeof filters.priceRange === 'object') {
    const { min, max } = filters.priceRange;
    if (min !== undefined || max !== undefined) {
      filtered = filterByPrice(filtered, min, max);
    }
  } else if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    // Legacy format support
    filtered = filterByPrice(filtered, filters.priceMin, filters.priceMax);
  }

  // Size filter
  if (filters.sizes && Array.isArray(filters.sizes) && filters.sizes.length > 0) {
    if (normalizeSizesFn && typeof normalizeSizesFn === 'function') {
      filtered = filterBySizes(filtered, filters.sizes, normalizeSizesFn);
    }
  }

  // Brand filter
  if (filters.brands && Array.isArray(filters.brands) && filters.brands.length > 0) {
    filtered = filterByBrands(filtered, filters.brands);
  }

  // Category filter
  if (filters.categories && Array.isArray(filters.categories) && filters.categories.length > 0) {
    filtered = filterByCategories(filtered, filters.categories);
  }

  // Color filter
  if (filters.colors && Array.isArray(filters.colors) && filters.colors.length > 0) {
    filtered = filterByColors(filtered, filters.colors);
  }

  return filtered;
};

