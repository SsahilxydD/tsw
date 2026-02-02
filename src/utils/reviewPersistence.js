// src/utils/reviewPersistence.js
/**
 * Review Persistence Utility
 * Handles review data persistence with validation
 */

import { safeLocalStorage } from './errorHandler';

const REVIEWS_STORAGE_KEY = 'reviews.v1';
const REVIEWS_VERSION = 1;

/**
 * @typedef {Object} Review
 * @property {string} id - Unique review ID
 * @property {string} productId - Product ID this review belongs to
 * @property {number} rating - Rating from 1 to 5
 * @property {string} title - Review title
 * @property {string} comment - Review comment/body
 * @property {string} authorName - Reviewer name
 * @property {string} authorEmail - Reviewer email (optional, for moderation)
 * @property {string} date - ISO date string
 * @property {number} helpfulCount - Number of helpful votes
 * @property {boolean} verified - Whether review is verified (e.g., from purchase)
 * @property {string} status - Review status: 'pending', 'approved', 'rejected'
 */

/**
 * Validate review data structure
 */
export const validateReview = (review) => {
  if (!review || typeof review !== 'object') {
    return { valid: false, error: 'Invalid review data structure' };
  }

  // Required fields
  if (!review.id || typeof review.id !== 'string') {
    return { valid: false, error: 'Review must have a valid ID' };
  }

  if (!review.productId || typeof review.productId !== 'string') {
    return { valid: false, error: 'Review must have a valid productId' };
  }

  if (typeof review.rating !== 'number' || review.rating < 1 || review.rating > 5) {
    return { valid: false, error: 'Rating must be a number between 1 and 5' };
  }

  if (!review.title || typeof review.title !== 'string' || review.title.trim().length === 0) {
    return { valid: false, error: 'Review must have a title' };
  }

  if (!review.comment || typeof review.comment !== 'string' || review.comment.trim().length === 0) {
    return { valid: false, error: 'Review must have a comment' };
  }

  if (!review.authorName || typeof review.authorName !== 'string' || review.authorName.trim().length === 0) {
    return { valid: false, error: 'Review must have an author name' };
  }

  if (!review.date || typeof review.date !== 'string') {
    return { valid: false, error: 'Review must have a valid date' };
  }

  // Optional fields validation
  if (review.helpfulCount !== undefined && (typeof review.helpfulCount !== 'number' || review.helpfulCount < 0)) {
    return { valid: false, error: 'helpfulCount must be a non-negative number' };
  }

  if (review.status && !['pending', 'approved', 'rejected'].includes(review.status)) {
    return { valid: false, error: 'Invalid review status' };
  }

  return { valid: true };
};

/**
 * Clean review data - remove invalid entries
 */
export const cleanReview = (review) => {
  if (!review || typeof review !== 'object') return null;

  // Ensure all required fields are present and valid
  const cleaned = {
    id: String(review.id || ''),
    productId: String(review.productId || ''),
    rating: Math.max(1, Math.min(5, Math.round(Number(review.rating) || 1))),
    title: String(review.title || '').trim(),
    comment: String(review.comment || '').trim(),
    authorName: String(review.authorName || '').trim(),
    authorEmail: review.authorEmail ? String(review.authorEmail).trim() : '',
    date: review.date ? String(review.date) : new Date().toISOString(),
    helpfulCount: Math.max(0, Math.round(Number(review.helpfulCount) || 0)),
    verified: Boolean(review.verified),
    status: review.status && ['pending', 'approved', 'rejected'].includes(review.status) 
      ? review.status 
      : 'approved', // Default to approved for client-side reviews
  };

  // Validate cleaned review
  const validation = validateReview(cleaned);
  if (!validation.valid) {
    return null;
  }

  return cleaned;
};

/**
 * Load all reviews from localStorage
 */
export const loadReviews = () => {
  try {
    const raw = safeLocalStorage.getItem(REVIEWS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const reviews = JSON.parse(raw);
    if (!Array.isArray(reviews)) {
      safeLocalStorage.removeItem(REVIEWS_STORAGE_KEY);
      return [];
    }

    // Clean and validate all reviews
    const cleaned = reviews
      .map(cleanReview)
      .filter(Boolean);

    // If some reviews were invalid, save the cleaned version
    if (cleaned.length !== reviews.length) {
      saveReviews(cleaned);
    }

    return cleaned;
  } catch {
    try {
      safeLocalStorage.removeItem(REVIEWS_STORAGE_KEY);
    } catch {}
    return [];
  }
};

/**
 * Save reviews to localStorage
 */
export const saveReviews = (reviews) => {
  try {
    if (!Array.isArray(reviews)) {
      return false;
    }

    // Clean all reviews before saving
    const cleaned = reviews
      .map(cleanReview)
      .filter(Boolean);

    const saved = safeLocalStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(cleaned));
    return saved;
  } catch {
    return false;
  }
};

/**
 * Add a new review
 */
export const addReview = (review) => {
  const cleaned = cleanReview(review);
  if (!cleaned) {
    return { success: false, error: 'Invalid review data' };
  }

  const reviews = loadReviews();
  
  // Check if review with same ID already exists
  if (reviews.some(r => r.id === cleaned.id)) {
    return { success: false, error: 'Review with this ID already exists' };
  }

  // Add new review
  reviews.push(cleaned);
  const saved = saveReviews(reviews);

  if (saved) {
    return { success: true, review: cleaned };
  } else {
    return { success: false, error: 'Failed to save review' };
  }
};

/**
 * Get reviews for a specific product
 */
export const getProductReviews = (productId) => {
  const reviews = loadReviews();
  return reviews.filter(review => 
    review.productId === String(productId) && 
    review.status === 'approved'
  );
};

/**
 * Get average rating for a product
 */
export const getProductRating = (productId) => {
  const reviews = getProductReviews(productId);
  if (reviews.length === 0) {
    return { average: 0, count: 0 };
  }

  const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
  const average = sum / reviews.length;
  
  return {
    average: Math.round(average * 10) / 10, // Round to 1 decimal place
    count: reviews.length
  };
};

/**
 * Update helpful count for a review
 */
export const markReviewHelpful = (reviewId) => {
  const reviews = loadReviews();
  const review = reviews.find(r => r.id === reviewId);
  
  if (!review) {
    return { success: false, error: 'Review not found' };
  }

  review.helpfulCount = (review.helpfulCount || 0) + 1;
  const saved = saveReviews(reviews);

  if (saved) {
    return { success: true, review };
  } else {
    return { success: false, error: 'Failed to update review' };
  }
};

/**
 * Generate a unique review ID
 */
export const generateReviewId = () => {
  return `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

