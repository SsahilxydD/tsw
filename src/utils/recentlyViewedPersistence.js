// src/utils/recentlyViewedPersistence.js
/**
 * Recently Viewed Products Persistence Utility
 * Handles recently viewed products data persistence with validation and expiration
 */

import { safeLocalStorage } from './errorHandler';

const RECENTLY_VIEWED_STORAGE_KEY = 'recentlyViewed.v1';
const RECENTLY_VIEWED_VERSION = 1;
const RECENTLY_VIEWED_EXPIRY_DAYS = 30; // Recently viewed expires after 30 days
const MAX_RECENTLY_VIEWED = 20; // Maximum number of recently viewed products to store

/**
 * Validate recently viewed data structure
 */
export const validateRecentlyViewedData = (recentlyViewedData) => {
  if (!recentlyViewedData || typeof recentlyViewedData !== 'object') {
    return { valid: false, error: 'Invalid recently viewed data structure' };
  }

  // Recently viewed should be an array of objects with productId and timestamp
  if (!Array.isArray(recentlyViewedData)) {
    return { valid: false, error: 'Recently viewed must be an array' };
  }

  // Validate each item has productId and timestamp
  for (const item of recentlyViewedData) {
    if (typeof item !== 'object' || !item) {
      return { valid: false, error: 'Invalid item in recently viewed' };
    }
    if (typeof item.productId !== 'string' || !item.productId) {
      return { valid: false, error: 'Invalid product ID in recently viewed' };
    }
    if (typeof item.timestamp !== 'number' || item.timestamp <= 0) {
      return { valid: false, error: 'Invalid timestamp in recently viewed' };
    }
  }

  return { valid: true };
};

/**
 * Clean recently viewed data - remove invalid entries
 */
export const cleanRecentlyViewedData = (recentlyViewedData) => {
  if (!recentlyViewedData || !Array.isArray(recentlyViewedData)) {
    return [];
  }

  return recentlyViewedData
    .filter(item => 
      item &&
      typeof item === 'object' &&
      typeof item.productId === 'string' &&
      item.productId.length > 0 &&
      typeof item.timestamp === 'number' &&
      item.timestamp > 0
    )
    .sort((a, b) => b.timestamp - a.timestamp) // Sort by most recent first
    .slice(0, MAX_RECENTLY_VIEWED); // Limit to max items
};

/**
 * Get recently viewed metadata (version, timestamp)
 */
export const getRecentlyViewedMetadata = () => {
  try {
    const metadataStr = safeLocalStorage.getItem('recentlyViewed.metadata');
    if (!metadataStr) return null;
    return JSON.parse(metadataStr);
  } catch {
    return null;
  }
};

/**
 * Set recently viewed metadata
 */
export const setRecentlyViewedMetadata = (metadata = {}) => {
  try {
    const fullMetadata = {
      version: RECENTLY_VIEWED_VERSION,
      timestamp: Date.now(),
      ...metadata,
    };
    safeLocalStorage.setItem('recentlyViewed.metadata', JSON.stringify(fullMetadata));
    return true;
  } catch {
    return false;
  }
};

/**
 * Check if recently viewed has expired
 */
export const isRecentlyViewedExpired = () => {
  const metadata = getRecentlyViewedMetadata();
  if (!metadata || !metadata.timestamp) {
    return false; // No timestamp means it's new
  }

  const expiryTime = metadata.timestamp + (RECENTLY_VIEWED_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  return Date.now() > expiryTime;
};

/**
 * Load recently viewed from localStorage with validation
 */
export const loadRecentlyViewed = () => {
  try {
    // Check if recently viewed has expired
    if (isRecentlyViewedExpired()) {
      clearRecentlyViewed();
      return [];
    }

    const raw = safeLocalStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const recentlyViewedData = JSON.parse(raw);
    
    // Validate recently viewed data
    const validation = validateRecentlyViewedData(recentlyViewedData);
    if (!validation.valid) {
      const cleaned = cleanRecentlyViewedData(recentlyViewedData);
      saveRecentlyViewed(cleaned);
      return cleaned;
    }

    // Clean recently viewed data (remove any invalid entries, sort, limit)
    const cleaned = cleanRecentlyViewedData(recentlyViewedData);
    
    // If cleaned data differs from original, save the cleaned version
    if (JSON.stringify(cleaned) !== JSON.stringify(recentlyViewedData)) {
      saveRecentlyViewed(cleaned);
    }

    return cleaned;
  } catch {
    // If there's an error, try to recover by clearing corrupted data
    try {
      safeLocalStorage.removeItem(RECENTLY_VIEWED_STORAGE_KEY);
      safeLocalStorage.removeItem('recentlyViewed.metadata');
    } catch { /* storage cleanup failed - ignore */ }
    return [];
  }
};

/**
 * Save recently viewed to localStorage with metadata
 */
export const saveRecentlyViewed = (recentlyViewedData) => {
  try {
    // Validate before saving
    const validation = validateRecentlyViewedData(recentlyViewedData);
    if (!validation.valid) {
      return false;
    }

    // Clean recently viewed data before saving
    const cleaned = cleanRecentlyViewedData(recentlyViewedData);

    // Save recently viewed data
    const saved = safeLocalStorage.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify(cleaned));
    
    if (saved) {
      // Update metadata
      setRecentlyViewedMetadata({ itemCount: cleaned.length });
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

/**
 * Add a product to recently viewed
 */
export const addToRecentlyViewed = (productId) => {
  if (!productId || typeof productId !== 'string') {
    return false;
  }

  try {
    const current = loadRecentlyViewed();
    
    // Remove existing entry for this product (if any) to avoid duplicates
    const filtered = current.filter(item => item.productId !== productId);
    
    // Add new entry at the beginning
    const updated = [
      { productId, timestamp: Date.now() },
      ...filtered
    ];

    // Limit to max items
    const limited = updated.slice(0, MAX_RECENTLY_VIEWED);

    return saveRecentlyViewed(limited);
  } catch {
    return false;
  }
};

/**
 * Get recently viewed product IDs (most recent first)
 */
export const getRecentlyViewedProductIds = () => {
  const recentlyViewed = loadRecentlyViewed();
  return recentlyViewed.map(item => item.productId);
};

/**
 * Clear recently viewed from localStorage
 */
export const clearRecentlyViewed = () => {
  try {
    safeLocalStorage.removeItem(RECENTLY_VIEWED_STORAGE_KEY);
    safeLocalStorage.removeItem('recentlyViewed.metadata');
    return true;
  } catch {
    return false;
  }
};

/**
 * Setup storage event listener for cross-tab sync
 */
export const setupRecentlyViewedSync = (onRecentlyViewedChange) => {
  if (typeof window === 'undefined') return () => {};

  const handleStorageChange = (e) => {
    if (e.key === RECENTLY_VIEWED_STORAGE_KEY && e.newValue !== e.oldValue) {
      try {
        const newRecentlyViewedData = e.newValue ? JSON.parse(e.newValue) : [];
        onRecentlyViewedChange(newRecentlyViewedData);
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

