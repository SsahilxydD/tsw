// Scroll restoration utility - Simple and reliable
// Single source of truth for scroll position management

const SCROLL_STORAGE_PREFIX = 'scroll_';

// Module-local flag avoids polluting the window namespace
let _scrollRestoring = false;

// Global flag to indicate scroll restoration is in progress
export const setRestoring = (value) => {
  _scrollRestoring = Boolean(value);
};

export const isRestoring = () => {
  return _scrollRestoring;
};

/**
 * Save scroll position for a given pathname
 */
export const saveScrollPosition = (pathname, visibleCount = null) => {
  if (typeof window === 'undefined') return;
  const scrollY = window.scrollY || window.pageYOffset || 0;
  const key = `${SCROLL_STORAGE_PREFIX}${pathname}`;
  sessionStorage.setItem(key, scrollY.toString());
  
  // Also save visibleCount if provided (for infinite scroll pages)
  if (visibleCount !== null && visibleCount !== undefined) {
    sessionStorage.setItem(`${key}_visibleCount`, visibleCount.toString());
  }
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
 * Get saved visibleCount for a given pathname (for infinite scroll)
 */
export const getVisibleCount = (pathname) => {
  if (typeof window === 'undefined') return null;
  const key = `${SCROLL_STORAGE_PREFIX}${pathname}_visibleCount`;
  const saved = sessionStorage.getItem(key);
  if (saved) {
    const count = parseInt(saved, 10);
    return isNaN(count) ? null : count;
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
      // Try to get visibleCount from the page (for infinite scroll pages)
      let visibleCount = null;
      try {
        // Check if we're on a category/collection page with infinite scroll
        // TODO: This selector is fragile — the product grid should use a data attribute (e.g. data-product-grid) instead
        const productGrid = document.querySelector('.grid.grid-cols-2, .grid.grid-cols-3');
        if (productGrid && productGrid.children.length > 0) {
          // Estimate visibleCount based on rendered products
          visibleCount = productGrid.children.length;
        }
      } catch {
        // Ignore errors
      }

      saveScrollPosition(currentPath, visibleCount);
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

  // Intercept link clicks to save scroll position BEFORE navigation
  const handleLinkClick = (e) => {
    // Find the closest link element
    let target = e.target;
    while (target && target !== document.body) {
      if (target.tagName === 'A' && target.hasAttribute('href')) {
        const href = target.getAttribute('href');
        // Check if it's an internal link (starts with / but not //)
        if (href && href.startsWith('/') && !href.startsWith('//')) {
          // Save scroll position immediately before navigation
          const currentPath = window.location.pathname;
          const currentScroll = window.scrollY || window.pageYOffset || 0;
          
          // Try to get visibleCount from the page (for infinite scroll pages)
          let visibleCount = null;
          try {
            // TODO: This selector is fragile — the product grid should use a data attribute (e.g. data-product-grid) instead
            const productGrid = document.querySelector('.grid.grid-cols-2, .grid.grid-cols-3');
            if (productGrid && productGrid.children.length > 0) {
              visibleCount = productGrid.children.length;
            }
          } catch {
            // Ignore errors
          }
          
          saveScrollPosition(currentPath, visibleCount);
          // Also update lastSaved to prevent duplicate saves
          lastSaved = currentScroll;
          break;
        }
      }
      target = target.parentElement;
    }
  };

  window.addEventListener("scroll", handleScroll, { passive: true });
  // Use capture phase to catch clicks before React Router handles them
  document.addEventListener("click", handleLinkClick, true);
  
  // Initial save
  saveScroll();

  return () => {
    window.removeEventListener("scroll", handleScroll);
    document.removeEventListener("click", handleLinkClick, true);
    if (timeoutId) clearTimeout(timeoutId);
  };
};
