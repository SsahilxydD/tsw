// src/utils/wishlistPersistence.js
/**
 * Wishlist Persistence Utility
 * Handles wishlist data persistence with validation and expiration
 */

import { safeLocalStorage } from './errorHandler';

const WISHLIST_STORAGE_KEY = 'wishlist.v1';
const WISHLIST_VERSION = 1;
const WISHLIST_EXPIRY_DAYS = 90; // Wishlist expires after 90 days

/**
 * Validate wishlist data structure
 */
export const validateWishlistData = (wishlistData) => {
  if (!wishlistData || typeof wishlistData !== 'object') {
    return { valid: false, error: 'Invalid wishlist data structure' };
  }

  // Wishlist should be an array of product IDs
  if (!Array.isArray(wishlistData)) {
    return { valid: false, error: 'Wishlist must be an array' };
  }

  // Validate each item is a string (product ID)
  for (const item of wishlistData) {
    if (typeof item !== 'string' || !item) {
      return { valid: false, error: 'Invalid product ID in wishlist' };
    }
  }

  return { valid: true };
};

/**
 * Clean wishlist data - remove invalid entries
 */
export const cleanWishlistData = (wishlistData) => {
  if (!wishlistData || !Array.isArray(wishlistData)) {
    return [];
  }

  return wishlistData.filter(item => 
    typeof item === 'string' && item.length > 0
  );
};

/**
 * Get wishlist metadata (version, timestamp)
 */
export const getWishlistMetadata = () => {
  try {
    const metadataStr = safeLocalStorage.getItem('wishlist.metadata');
    if (!metadataStr) return null;
    return JSON.parse(metadataStr);
  } catch {
    return null;
  }
};

/**
 * Set wishlist metadata
 */
export const setWishlistMetadata = (metadata = {}) => {
  try {
    const fullMetadata = {
      version: WISHLIST_VERSION,
      timestamp: Date.now(),
      ...metadata,
    };
    safeLocalStorage.setItem('wishlist.metadata', JSON.stringify(fullMetadata));
    return true;
  } catch {
    return false;
  }
};

/**
 * Check if wishlist has expired
 */
export const isWishlistExpired = () => {
  const metadata = getWishlistMetadata();
  if (!metadata || !metadata.timestamp) {
    return false; // No timestamp means it's a new wishlist
  }

  const expiryTime = metadata.timestamp + (WISHLIST_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  return Date.now() > expiryTime;
};

/**
 * Load wishlist from localStorage with validation
 */
export const loadWishlist = () => {
  try {
    // Check if wishlist has expired
    if (isWishlistExpired()) {
      clearWishlist();
      return [];
    }

    const raw = safeLocalStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const wishlistData = JSON.parse(raw);
    
    // Validate wishlist data
    const validation = validateWishlistData(wishlistData);
    if (!validation.valid) {
      const cleaned = cleanWishlistData(wishlistData);
      saveWishlist(cleaned);
      return cleaned;
    }

    // Clean wishlist data (remove any invalid entries)
    const cleaned = cleanWishlistData(wishlistData);
    
    // If cleaned data differs from original, save the cleaned version
    if (JSON.stringify(cleaned) !== JSON.stringify(wishlistData)) {
      saveWishlist(cleaned);
    }

    return cleaned;
  } catch {
    // If there's an error, try to recover by clearing corrupted data
    try {
      safeLocalStorage.removeItem(WISHLIST_STORAGE_KEY);
      safeLocalStorage.removeItem('wishlist.metadata');
    } catch {}
    return [];
  }
};

/**
 * Save wishlist to localStorage with metadata
 */
export const saveWishlist = (wishlistData) => {
  try {
    // Validate before saving
    const validation = validateWishlistData(wishlistData);
    if (!validation.valid) {
      return false;
    }

    // Clean wishlist data before saving
    const cleaned = cleanWishlistData(wishlistData);

    // Remove duplicates
    const unique = [...new Set(cleaned)];

    // Save wishlist data
    const saved = safeLocalStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(unique));
    
    if (saved) {
      // Update metadata
      setWishlistMetadata({ itemCount: unique.length });
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

/**
 * Clear wishlist from localStorage
 */
export const clearWishlist = () => {
  try {
    safeLocalStorage.removeItem(WISHLIST_STORAGE_KEY);
    safeLocalStorage.removeItem('wishlist.metadata');
    return true;
  } catch {
    return false;
  }
};

/**
 * Setup storage event listener for cross-tab sync
 */
export const setupWishlistSync = (onWishlistChange) => {
  if (typeof window === 'undefined') return () => {};

  const handleStorageChange = (e) => {
    if (e.key === WISHLIST_STORAGE_KEY && e.newValue !== e.oldValue) {
      try {
        const newWishlistData = e.newValue ? JSON.parse(e.newValue) : [];
        onWishlistChange(newWishlistData);
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

