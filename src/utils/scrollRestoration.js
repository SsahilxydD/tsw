// Scroll restoration utility - Simple and reliable
// Single source of truth for scroll position management

const SCROLL_STORAGE_PREFIX = 'scroll_';
const RESTORING_FLAG = '__scroll_restoring__';

// Global flag to indicate scroll restoration is in progress
export const setRestoring = (value) => {
  if (typeof window !== 'undefined') {
    window[RESTORING_FLAG] = value;
  }
};

export const isRestoring = () => {
  if (typeof window !== 'undefined') {
    return window[RESTORING_FLAG] === true;
  }
  return false;
};

/**
 * Save scroll position for a given pathname
 */
export const saveScrollPosition = (pathname) => {
  if (typeof window === 'undefined') return;
  const scrollY = window.scrollY || window.pageYOffset || 0;
  const key = `${SCROLL_STORAGE_PREFIX}${pathname}`;
  sessionStorage.setItem(key, scrollY.toString());
};

/**
 * Get saved scroll position for a given pathname
 */
export const getScrollPosition = (pathname) => {
  if (typeof window === 'undefined') return null;
  const key = `${SCROLL_STORAGE_PREFIX}${pathname}`;
  const saved = sessionStorage.getItem(key);
  if (saved) {
    const pos = parseInt(saved, 10);
    return isNaN(pos) ? null : pos;
  }
  return null;
};

/**
 * Continuously save scroll position as user scrolls
 * Call this once on app mount
 */
export const setupScrollSaving = () => {
  if (typeof window === 'undefined') return () => {};

  let timeoutId;
  let lastSaved = 0;

  const saveScroll = () => {
    const currentPath = window.location.pathname;
    const currentScroll = window.scrollY || window.pageYOffset || 0;
    
    // Only save if scroll position changed significantly (avoid unnecessary saves)
    if (Math.abs(currentScroll - lastSaved) > 50 || currentScroll === 0) {
      saveScrollPosition(currentPath);
      lastSaved = currentScroll;
    }
  };

  const handleScroll = () => {
    // Cancel any pending save
    if (timeoutId) clearTimeout(timeoutId);

    // Save after scroll stops (debounced)
    timeoutId = setTimeout(() => {
      saveScroll();
    }, 100);
  };

  window.addEventListener("scroll", handleScroll, { passive: true });
  
  // Initial save
  saveScroll();

  return () => {
    window.removeEventListener("scroll", handleScroll);
    if (timeoutId) clearTimeout(timeoutId);
  };
};
