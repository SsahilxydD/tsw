// src/utils/coupons.js
/**
 * Coupon System Utility
 * Handles coupon validation, discount calculation, and coupon management
 */

/**
 * @typedef {Object} Coupon
 * @property {string} code - Coupon code (uppercase)
 * @property {string} type - Discount type: 'percentage' or 'fixed'
 * @property {number} value - Discount value (percentage 0-100 or fixed amount)
 * @property {number} minOrder - Minimum order amount required (optional)
 * @property {number} maxDiscount - Maximum discount amount (for percentage coupons, optional)
 * @property {string} startDate - Start date (ISO string, optional)
 * @property {string} endDate - End date (ISO string, optional)
 * @property {number} usageLimit - Maximum number of times coupon can be used (optional)
 * @property {number} usageCount - Current usage count (optional)
 * @property {string[]} applicableCategories - Categories this coupon applies to (optional, empty = all)
 * @property {boolean} active - Whether coupon is active
 */

/**
 * Predefined coupons database
 * In a real application, this would come from a backend API
 */
// WARNING: These codes are visible in the client bundle. Move to server-side validation for production use.
const COUPONS_DB = [
  {
    code: 'WELCOME10',
    type: 'percentage',
    value: 10,
    minOrder: 500,
    maxDiscount: 500,
    startDate: '2024-01-01',
    endDate: '2027-12-31',
    usageLimit: 1000,
    usageCount: 0,
    applicableCategories: [],
    active: true,
    description: '10% off on orders above ₹500'
  },
  {
    code: 'SAVE20',
    type: 'percentage',
    value: 20,
    minOrder: 1000,
    maxDiscount: 1000,
    startDate: '2024-01-01',
    endDate: '2027-12-31',
    usageLimit: 500,
    usageCount: 0,
    applicableCategories: [],
    active: true,
    description: '20% off on orders above ₹1000'
  },
  {
    code: 'FLAT500',
    type: 'fixed',
    value: 500,
    minOrder: 2000,
    startDate: '2024-01-01',
    endDate: '2027-12-31',
    usageLimit: 200,
    usageCount: 0,
    applicableCategories: [],
    active: true,
    description: 'Flat ₹500 off on orders above ₹2000'
  },
  {
    code: 'FIRST50',
    type: 'fixed',
    value: 50,
    minOrder: 0,
    startDate: '2024-01-01',
    endDate: '2027-12-31',
    usageLimit: 10000,
    usageCount: 0,
    applicableCategories: [],
    active: true,
    description: '₹50 off on your first order'
  }
];

/**
 * Get coupon by code
 * @param {string} code - Coupon code
 * @returns {Coupon|null} - Coupon object or null if not found
 */
export const getCouponByCode = (code) => {
  if (!code || typeof code !== 'string') return null;
  const normalizedCode = code.trim().toUpperCase();
  return COUPONS_DB.find(coupon => coupon.code === normalizedCode) || null;
};

/**
 * Validate coupon
 * @param {string} code - Coupon code
 * @param {number} cartAmount - Current cart subtotal
 * @param {Array} cartItems - Cart items array (for category checking)
 * @returns {{valid: boolean, coupon: Coupon|null, error: string|null}}
 */
export const validateCoupon = (code, cartAmount = 0, cartItems = []) => {
  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    return { valid: false, coupon: null, error: 'Please enter a coupon code' };
  }

  const coupon = getCouponByCode(code);
  if (!coupon) {
    return { valid: false, coupon: null, error: 'Invalid coupon code' };
  }

  if (!coupon.active) {
    return { valid: false, coupon: null, error: 'This coupon is not active' };
  }

  // Check date validity
  const now = new Date();
  if (coupon.startDate) {
    const startDate = new Date(coupon.startDate);
    if (now < startDate) {
      return { valid: false, coupon: null, error: 'This coupon is not yet valid' };
    }
  }
  if (coupon.endDate) {
    const endDate = new Date(coupon.endDate);
    endDate.setHours(23, 59, 59, 999); // End of day
    if (now > endDate) {
      return { valid: false, coupon: null, error: 'This coupon has expired' };
    }
  }

  // Check minimum order amount
  if (coupon.minOrder && cartAmount < coupon.minOrder) {
    return {
      valid: false,
      coupon: null,
      error: `Minimum order amount of ${coupon.minOrder} required for this coupon`
    };
  }

  // Check usage limit
  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    return { valid: false, coupon: null, error: 'This coupon has reached its usage limit' };
  }

  // Check applicable categories (if specified)
  if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
    const cartCategories = new Set();
    cartItems.forEach(item => {
      if (item.category) cartCategories.add(item.category);
      if (item.categoryRaw) cartCategories.add(item.categoryRaw);
    });
    const hasApplicableCategory = coupon.applicableCategories.some(cat =>
      cartCategories.has(cat)
    );
    if (!hasApplicableCategory) {
      return {
        valid: false,
        coupon: null,
        error: 'This coupon is not applicable to items in your cart'
      };
    }
  }

  return { valid: true, coupon, error: null };
};

/**
 * Calculate discount amount
 * @param {Coupon} coupon - Valid coupon object
 * @param {number} cartAmount - Cart subtotal
 * @returns {number} - Discount amount
 */
export const calculateDiscount = (coupon, cartAmount) => {
  if (!coupon || !coupon.active) return 0;

  let discount = 0;

  if (coupon.type === 'percentage') {
    discount = (cartAmount * coupon.value) / 100;
    // Apply maximum discount cap if specified
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }
  } else if (coupon.type === 'fixed') {
    discount = coupon.value;
    // Don't allow discount to exceed cart amount
    if (discount > cartAmount) {
      discount = cartAmount;
    }
  }

  // Round to 2 decimal places
  return Math.round(discount * 100) / 100;
};

/**
 * Get all available coupons (for display purposes)
 * @returns {Coupon[]} - Array of active coupons
 */
export const getAvailableCoupons = () => {
  const now = new Date();
  return COUPONS_DB.filter(coupon => {
    if (!coupon.active) return false;
    if (coupon.startDate && now < new Date(coupon.startDate)) return false;
    if (coupon.endDate) {
      const endDate = new Date(coupon.endDate);
      endDate.setHours(23, 59, 59, 999);
      if (now > endDate) return false;
    }
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) return false;
    return true;
  });
};

