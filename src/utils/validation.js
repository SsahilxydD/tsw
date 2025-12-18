// src/utils/validation.js
/**
 * Reusable validation functions for form inputs
 * Follows PRD.md requirements for form validation
 */

/**
 * Validates email format
 */
export const validateEmail = (email) => {
  if (!email) return null; // Optional field
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim()) ? null : "Please enter a valid email address";
};

/**
 * Validates phone number (Indian format)
 */
export const validatePhone = (phone) => {
  if (!phone) return "Phone number is required";
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return "Phone number must be at least 10 digits";
  if (digits.length > 15) return "Phone number is too long";
  return null;
};

/**
 * Validates required field
 */
export const validateRequired = (value, fieldName = "This field") => {
  if (!value || !value.trim()) {
    return `${fieldName} is required`;
  }
  return null;
};

/**
 * Validates minimum length
 */
export const validateMinLength = (value, minLength, fieldName = "This field") => {
  if (!value) return null; // Let validateRequired handle empty
  if (value.trim().length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`;
  }
  return null;
};

/**
 * Validates maximum length
 */
export const validateMaxLength = (value, maxLength, fieldName = "This field") => {
  if (!value) return null;
  if (value.trim().length > maxLength) {
    return `${fieldName} must be no more than ${maxLength} characters`;
  }
  return null;
};

/**
 * Validates name (first or last name)
 */
export const validateName = (name, fieldName = "Name") => {
  if (!name || !name.trim()) return null; // Name can be optional if other name field exists
  if (name.trim().length < 2) return `${fieldName} must be at least 2 characters`;
  if (name.trim().length > 50) return `${fieldName} is too long`;
  if (!/^[a-zA-Z\s'-]+$/.test(name.trim())) {
    return `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`;
  }
  return null;
};

/**
 * Validates at least one name field (first or last)
 */
export const validateNameRequired = (firstName, lastName) => {
  if ((!firstName || !firstName.trim()) && (!lastName || !lastName.trim())) {
    return "First name or last name is required";
  }
  return null;
};

/**
 * Validates PIN/ZIP code (Indian format - 6 digits)
 */
export const validateZip = (zip) => {
  if (!zip) return "PIN code is required";
  const digits = zip.replace(/\D/g, '');
  if (digits.length !== 6) return "PIN code must be 6 digits";
  return null;
};

/**
 * Validates password strength
 */
export const validatePassword = (password, isSignUp = false) => {
  if (!password) return "Password is required";
  if (isSignUp) {
    if (password.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
    if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter";
    if (!/[0-9]/.test(password)) return "Password must contain at least one number";
  }
  return null;
};

/**
 * Validates address line
 */
export const validateAddress = (address, fieldName = "Address") => {
  if (!address || !address.trim()) return `${fieldName} is required`;
  if (address.trim().length < 5) return `${fieldName} must be at least 5 characters`;
  if (address.trim().length > 200) return `${fieldName} is too long`;
  return null;
};

/**
 * Validates city/locality
 */
export const validateCity = (city, fieldName = "City") => {
  if (!city || !city.trim()) return `${fieldName} is required`;
  if (city.trim().length < 2) return `${fieldName} must be at least 2 characters`;
  if (city.trim().length > 100) return `${fieldName} is too long`;
  return null;
};

/**
 * Validates state
 */
export const validateState = (state) => {
  if (!state || !state.trim()) return "State is required";
  if (state.trim().length < 2) return "State must be at least 2 characters";
  return null;
};

/**
 * Validates message/textarea
 */
export const validateMessage = (message, fieldName = "Message", minLength = 10) => {
  if (!message || !message.trim()) return `${fieldName} is required`;
  if (message.trim().length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`;
  }
  if (message.trim().length > 2000) return `${fieldName} is too long`;
  return null;
};

/**
 * Generic validation runner - validates an object against rules
 * @param {Object} data - Form data object
 * @param {Object} rules - Validation rules object { fieldName: [validationFunctions] }
 * @returns {Object} - Errors object { fieldName: errorMessage }
 */
export const validateForm = (data, rules) => {
  const errors = {};
  
  for (const [field, fieldRules] of Object.entries(rules)) {
    const value = data[field];
    
    for (const rule of fieldRules) {
      if (typeof rule === 'function') {
        const error = rule(value, field);
        if (error) {
          errors[field] = error;
          break; // Stop at first error for this field
        }
      } else if (typeof rule === 'object' && rule.validator) {
        const error = rule.validator(value, field);
        if (error) {
          errors[field] = error;
          break;
        }
      }
    }
  }
  
  return errors;
};

