// Scroll restoration utility
// Saves scroll position before navigation and restores on back navigation

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

export const saveScrollPosition = (pathname) => {
  if (typeof window === 'undefined') return;
  const scrollY = window.scrollY || window.pageYOffset || 0;
  const key = `${SCROLL_STORAGE_PREFIX}${pathname}`;
  sessionStorage.setItem(key, scrollY.toString());
};

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

export const restoreScrollPosition = (pathname, delay = 100) => {
  if (typeof window === 'undefined') return;
  const pos = getScrollPosition(pathname);
  if (pos !== null && pos >= 0) {
    // Set restoring flag to prevent other components from scrolling
    setRestoring(true);
    
    // Use multiple requestAnimationFrames and timeout for reliable restoration
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          // Double check we're still on the same page
          if (window.location.pathname === pathname) {
            window.scrollTo({ top: pos, left: 0, behavior: 'auto' });
            
            // Clear restoring flag after a delay to allow other operations
            setTimeout(() => {
              setRestoring(false);
            }, 200);
          } else {
            setRestoring(false);
          }
        }, delay);
      });
    });
  } else {
    setRestoring(false);
  }
};

// Intercept React Router Link clicks to save scroll position before navigation
export const setupLinkInterception = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  const handleClick = (e) => {
    // Find the closest link element
    let target = e.target;
    let linkElement = null;
    let href = null;
    
    // Traverse up to find a link (React Router Link renders as <a>)
    while (target && target !== document.body) {
      // Check for anchor tag with href
      if (target.tagName === 'A' && target.hasAttribute('href')) {
        href = target.getAttribute('href');
        // Check if it's an internal link (starts with / but not //)
        if (href && href.startsWith('/') && !href.startsWith('//')) {
          linkElement = target;
          break;
        }
      }
      // Also check for React Router Link components (they might have data attributes)
      if (target.getAttribute && (
        target.getAttribute('data-router-link') !== null ||
        target.closest && target.closest('[data-router-link]')
      )) {
        linkElement = target;
        break;
      }
      target = target.parentElement;
    }

    if (linkElement) {
      // Save current scroll position immediately before navigation
      const currentPath = window.location.pathname;
      const currentScroll = window.scrollY || window.pageYOffset || 0;
      
      // Save synchronously to ensure it happens before React Router navigates
      saveScrollPosition(currentPath);
      
      // Also save to sessionStorage directly as backup
      const key = `scroll_${currentPath}`;
      sessionStorage.setItem(key, currentScroll.toString());
    }
  };

  // Use capture phase to catch clicks early, before React Router handles them
  document.addEventListener('click', handleClick, true);
  
  // Also listen for beforeunload as a fallback
  const handleBeforeUnload = () => {
    const currentPath = window.location.pathname;
    saveScrollPosition(currentPath);
  };
  
  window.addEventListener('beforeunload', handleBeforeUnload);
  
  return () => {
    document.removeEventListener('click', handleClick, true);
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
};

