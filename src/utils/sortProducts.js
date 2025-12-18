// src/utils/sortProducts.js
/**
 * Product Sorting Utility
 * Provides functions to sort products by various criteria
 */

import { getProductRating } from './reviewPersistence';

/**
 * Sort products by the specified criteria
 * @param {Array} products - Array of products to sort
 * @param {string} sortBy - Sort criteria: 'featured', 'price-low-high', 'price-high-low', 'newest', 'popularity', 'rating'
 * @param {Object} options - Additional options for sorting
 * @param {Function} options.scrambleFn - Function to scramble products for 'featured' sort
 * @param {string} options.salt - Salt for scrambling (for featured sort)
 * @returns {Array} Sorted array of products
 */
export const sortProducts = (products, sortBy = 'featured', options = {}) => {
  if (!Array.isArray(products)) {
    return [];
  }

  // Create a copy to avoid mutating the original array
  let sorted = [...products];

  switch (sortBy) {
    case 'price-low-high':
      sorted.sort((a, b) => {
        const priceA = Number(a.price) || 0;
        const priceB = Number(b.price) || 0;
        return priceA - priceB;
      });
      break;

    case 'price-high-low':
      sorted.sort((a, b) => {
        const priceA = Number(a.price) || 0;
        const priceB = Number(b.price) || 0;
        return priceB - priceA;
      });
      break;

    case 'newest':
      sorted.sort((a, b) => {
        const dateA = Number(a.date) || 0;
        const dateB = Number(b.date) || 0;
        return dateB - dateA; // Newest first (higher timestamp = newer)
      });
      break;

    case 'popularity':
      sorted.sort((a, b) => {
        // Prioritize bestseller products
        const bestsellerA = Boolean(a.bestseller);
        const bestsellerB = Boolean(b.bestseller);
        
        if (bestsellerA && !bestsellerB) return -1;
        if (!bestsellerA && bestsellerB) return 1;
        
        // If both or neither are bestsellers, sort by date (newer first)
        const dateA = Number(a.date) || 0;
        const dateB = Number(b.date) || 0;
        return dateB - dateA;
      });
      break;

    case 'rating':
      // Sort by average rating (highest first), then by number of reviews
      sorted.sort((a, b) => {
        const ratingA = getProductRating(String(a._id || a.id || ''));
        const ratingB = getProductRating(String(b._id || b.id || ''));
        
        // Compare average ratings
        if (ratingB.average !== ratingA.average) {
          return ratingB.average - ratingA.average;
        }
        
        // If ratings are equal, sort by number of reviews (more reviews = higher)
        if (ratingB.count !== ratingA.count) {
          return ratingB.count - ratingA.count;
        }
        
        // If both are equal, maintain original order
        return 0;
      });
      break;

    case 'featured':
    default:
      // Use scramble function if provided, otherwise maintain original order
      if (options.scrambleFn && typeof options.scrambleFn === 'function') {
        sorted = options.scrambleFn(sorted, {
          seed: options.seed,
          blockSize: options.blockSize || 1,
          salt: options.salt || '',
        });
      }
      break;
  }

  return sorted;
};

/**
 * Get sort option label
 * @param {string} sortBy - Sort criteria
 * @returns {string} Human-readable label
 */
export const getSortLabel = (sortBy) => {
  const labels = {
    'featured': 'Featured',
    'price-low-high': 'Price: Low to High',
    'price-high-low': 'Price: High to Low',
    'newest': 'Newest',
    'popularity': 'Popularity',
    'rating': 'Rating',
  };
  
  return labels[sortBy] || 'Featured';
};

/**
 * Get all available sort options
 * @returns {Array} Array of { value, label } objects
 */
export const getSortOptions = () => {
  return [
    { value: 'featured', label: 'Featured' },
    { value: 'price-low-high', label: 'Price: Low to High' },
    { value: 'price-high-low', label: 'Price: High to Low' },
    { value: 'newest', label: 'Newest' },
    { value: 'popularity', label: 'Popularity' },
    { value: 'rating', label: 'Rating' },
  ];
};

