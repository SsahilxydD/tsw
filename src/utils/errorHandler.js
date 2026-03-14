// src/utils/errorHandler.js
/**
 * Global Error Handler Utility
 * Provides centralized error handling, logging, and user-friendly error messages
 */

// Error types
export const ErrorTypes = {
  NETWORK: 'NETWORK_ERROR',
  API: 'API_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  STORAGE: 'STORAGE_ERROR',
  PARSE: 'PARSE_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  TIMEOUT: 'TIMEOUT_ERROR',
};

// User-friendly error messages
const ErrorMessages = {
  [ErrorTypes.NETWORK]: {
    title: 'Connection Problem',
    message: 'Unable to connect to the server. Please check your internet connection and try again.',
    action: 'Retry',
  },
  [ErrorTypes.API]: {
    title: 'Service Unavailable',
    message: 'We\'re having trouble loading data. Please try again in a moment.',
    action: 'Retry',
  },
  [ErrorTypes.VALIDATION]: {
    title: 'Invalid Input',
    message: 'Please check your input and try again.',
    action: 'OK',
  },
  [ErrorTypes.STORAGE]: {
    title: 'Storage Error',
    message: 'Unable to save data locally. Your browser may have storage restrictions.',
    action: 'OK',
  },
  [ErrorTypes.PARSE]: {
    title: 'Data Error',
    message: 'Unable to process the data. Please refresh the page.',
    action: 'Refresh',
  },
  [ErrorTypes.NOT_FOUND]: {
    title: 'Not Found',
    message: 'The requested resource could not be found.',
    action: 'Go Home',
  },
  [ErrorTypes.TIMEOUT]: {
    title: 'Request Timeout',
    message: 'The request took too long. Please try again.',
    action: 'Retry',
  },
  [ErrorTypes.UNKNOWN]: {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
    action: 'Retry',
  },
};

/**
 * Classify error type from error object
 */
export const classifyError = (error) => {
  if (!error) return ErrorTypes.UNKNOWN;

  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return ErrorTypes.NETWORK;
  }
  if (error.name === 'NetworkError' || error.name === 'TypeError') {
    return ErrorTypes.NETWORK;
  }
  if (error.message?.includes('network') || error.message?.includes('fetch')) {
    return ErrorTypes.NETWORK;
  }

  // API errors
  if (error.status || error.statusCode) {
    if (error.status === 404 || error.statusCode === 404) {
      return ErrorTypes.NOT_FOUND;
    }
    if (error.status === 408 || error.statusCode === 408) {
      return ErrorTypes.TIMEOUT;
    }
    return ErrorTypes.API;
  }

  // Parse errors
  if (error instanceof SyntaxError || error.name === 'SyntaxError') {
    return ErrorTypes.PARSE;
  }

  // Storage errors
  if (error.name === 'QuotaExceededError' || error.message?.includes('storage')) {
    return ErrorTypes.STORAGE;
  }

  // Validation errors
  if (error.name === 'ValidationError' || error.message?.includes('validation')) {
    return ErrorTypes.VALIDATION;
  }

  return ErrorTypes.UNKNOWN;
};

/**
 * Get user-friendly error message
 */
export const getErrorMessage = (error, customMessage = null) => {
  if (customMessage) {
    return {
      title: 'Error',
      message: customMessage,
      action: 'OK',
    };
  }

  const errorType = classifyError(error);
  return ErrorMessages[errorType] || ErrorMessages[ErrorTypes.UNKNOWN];
};

/**
 * Log error for debugging (can be extended to send to error tracking service)
 */
export const logError = (error, context = {}) => {
  const errorInfo = {
    message: error?.message || 'Unknown error',
    stack: error?.stack,
    name: error?.name,
    type: classifyError(error),
    context,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : 'N/A',
  };

  // Log to console in development
  if (import.meta.env.DEV) {
    console.error('Error logged:', errorInfo);
  }

  // In production, you could send to error tracking service (e.g., Sentry, LogRocket)
  // if (import.meta.env.PROD) {
  //   errorTrackingService.captureException(error, { extra: errorInfo });
  // }

  return errorInfo;
};

/**
 * Handle error with logging and return user-friendly message
 */
export const handleError = (error, context = {}) => {
  const errorInfo = logError(error, context);
  return getErrorMessage(error);
};

/**
 * Safe async wrapper with error handling
 */
export const safeAsync = async (asyncFn, errorHandler = null) => {
  try {
    return await asyncFn();
  } catch (error) {
    const errorMessage = handleError(error);
    if (errorHandler) {
      errorHandler(errorMessage, error);
    }
    throw error;
  }
};

/**
 * Retry mechanism for failed requests
 */
export const retry = async (fn, maxRetries = 3, delay = 1000) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  throw lastError;
};

/**
 * Safe localStorage operations
 */
export const safeLocalStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      logError(error, { operation: 'localStorage.getItem', key });
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      logError(error, { operation: 'localStorage.setItem', key });
      return false;
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      logError(error, { operation: 'localStorage.removeItem', key });
      return false;
    }
  },
};

/**
 * Safe fetch with timeout and retry
 */
export const safeFetch = async (url, options = {}, retries = 2) => {
  const timeout = options.timeout || 10000; // 10 seconds default

  const fetchWithTimeout = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  };

  return retry(fetchWithTimeout, retries);
};

/**
 * Safe fetch with timeout and retry — returns the raw Response without throwing on non-OK status.
 * Use this when the caller needs to inspect the status code itself (e.g. ZIP lookup, feature checks).
 * For most cases, prefer safeFetch which throws on non-OK responses.
 */
export const safeFetchRaw = async (url, options = {}, retries = 2) => {
  const timeout = options.timeout || 10000; // 10 seconds default

  const fetchWithTimeout = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      // Return the response regardless of ok status — let the caller decide
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  };

  return retry(fetchWithTimeout, retries);
};
