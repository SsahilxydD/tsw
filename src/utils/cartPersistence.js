// src/utils/cartPersistence.js
/**
 * Cart Persistence Utility
 * Handles cart data persistence with versioning, validation, and expiration
 */

import { safeLocalStorage } from './errorHandler';

const CART_STORAGE_KEY = 'cart.v1';
const CART_VERSION = 1;
const CART_EXPIRY_DAYS = 30; // Cart expires after 30 days

/**
 * Validate cart data structure
 */
export const validateCartData = (cartData) => {
  if (!cartData || typeof cartData !== 'object') {
    return { valid: false, error: 'Invalid cart data structure' };
  }

  // Check if cart data is an object with product IDs as keys
  for (const productId in cartData) {
    if (typeof productId !== 'string' || !productId) {
      return { valid: false, error: 'Invalid product ID in cart' };
    }

    const sizes = cartData[productId];
    if (!sizes || typeof sizes !== 'object') {
      return { valid: false, error: 'Invalid size data for product' };
    }

    for (const size in sizes) {
      const quantity = sizes[size];
      if (typeof quantity !== 'number' || quantity < 0 || !Number.isInteger(quantity)) {
        return { valid: false, error: 'Invalid quantity in cart' };
      }
    }
  }

  return { valid: true };
};

/**
 * Clean cart data - remove invalid entries
 */
export const cleanCartData = (cartData) => {
  if (!cartData || typeof cartData !== 'object') {
    return {};
  }

  const cleaned = {};
  for (const productId in cartData) {
    if (typeof productId !== 'string' || !productId) {
      continue;
    }

    const sizes = cartData[productId];
    if (!sizes || typeof sizes !== 'object') {
      continue;
    }

    const cleanedSizes = {};
    for (const size in sizes) {
      const quantity = sizes[size];
      if (typeof quantity === 'number' && quantity > 0 && Number.isInteger(quantity)) {
        cleanedSizes[size] = quantity;
      }
    }

    if (Object.keys(cleanedSizes).length > 0) {
      cleaned[productId] = cleanedSizes;
    }
  }

  return cleaned;
};

/**
 * Get cart metadata (version, timestamp)
 */
export const getCartMetadata = () => {
  try {
    const metadataStr = safeLocalStorage.getItem('cart.metadata');
    if (!metadataStr) return null;
    return JSON.parse(metadataStr);
  } catch {
    return null;
  }
};

/**
 * Set cart metadata
 */
export const setCartMetadata = (metadata = {}) => {
  try {
    const fullMetadata = {
      version: CART_VERSION,
      timestamp: Date.now(),
      ...metadata,
    };
    safeLocalStorage.setItem('cart.metadata', JSON.stringify(fullMetadata));
    return true;
  } catch {
    return false;
  }
};

/**
 * Check if cart has expired
 */
export const isCartExpired = () => {
  const metadata = getCartMetadata();
  if (!metadata || !metadata.timestamp) {
    return false; // No timestamp means it's a new cart
  }

  const expiryTime = metadata.timestamp + (CART_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  return Date.now() > expiryTime;
};

/**
 * Load cart from localStorage with validation and migration
 */
export const loadCart = () => {
  try {
    // Check if cart has expired
    if (isCartExpired()) {
      clearCart();
      return {};
    }

    const raw = safeLocalStorage.getItem(CART_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const cartData = JSON.parse(raw);
    
    // Validate cart data
    const validation = validateCartData(cartData);
    if (!validation.valid) {
      const cleaned = cleanCartData(cartData);
      saveCart(cleaned);
      return cleaned;
    }

    // Clean cart data (remove any invalid entries)
    const cleaned = cleanCartData(cartData);
    
    // If cleaned data differs from original, save the cleaned version
    if (JSON.stringify(cleaned) !== JSON.stringify(cartData)) {
      saveCart(cleaned);
    }

    return cleaned;
  } catch {
    // If there's an error, try to recover by clearing corrupted data
    try {
      safeLocalStorage.removeItem(CART_STORAGE_KEY);
      safeLocalStorage.removeItem('cart.metadata');
    } catch { /* storage cleanup failed - ignore */ }
    return {};
  }
};

/**
 * Save cart to localStorage with metadata
 */
export const saveCart = (cartData) => {
  try {
    // Validate before saving
    const validation = validateCartData(cartData);
    if (!validation.valid) {
      return false;
    }

    // Clean cart data before saving
    const cleaned = cleanCartData(cartData);

    // Save cart data
    const saved = safeLocalStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cleaned));
    
    if (saved) {
      // Update metadata
      setCartMetadata({ itemCount: getCartItemCount(cleaned) });
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

/**
 * Clear cart from localStorage
 */
export const clearCart = () => {
  try {
    safeLocalStorage.removeItem(CART_STORAGE_KEY);
    safeLocalStorage.removeItem('cart.metadata');
    return true;
  } catch {
    return false;
  }
};

/**
 * Get cart item count
 */
export const getCartItemCount = (cartData) => {
  if (!cartData || typeof cartData !== 'object') {
    return 0;
  }

  let count = 0;
  for (const productId in cartData) {
    const sizes = cartData[productId];
    if (sizes && typeof sizes === 'object') {
      for (const size in sizes) {
        const quantity = sizes[size];
        if (typeof quantity === 'number' && quantity > 0) {
          count += quantity;
        }
      }
    }
  }

  return count;
};

/**
 * Setup storage event listener for cross-tab sync
 */
export const setupCartSync = (onCartChange) => {
  if (typeof window === 'undefined') return () => {};

  const handleStorageChange = (e) => {
    if (e.key === CART_STORAGE_KEY && e.newValue !== e.oldValue) {
      try {
        const newCartData = e.newValue ? JSON.parse(e.newValue) : {};
        onCartChange(newCartData);
      } catch {
        // Silently handle sync errors
      }
    }
  };

  window.addEventListener('storage', handleStorageChange);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
};

