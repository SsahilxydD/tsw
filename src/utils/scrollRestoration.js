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
  
  // Debug logging (remove in production)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[ScrollRestore] Saved scroll position for ${pathname}: ${scrollY}px`);
  }
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

  // Save scroll position on every location change (most reliable)
  const saveCurrentScroll = () => {
    const currentPath = window.location.pathname;
    const currentScroll = window.scrollY || window.pageYOffset || 0;
    if (currentScroll >= 0) {
      saveScrollPosition(currentPath);
    }
  };

  const handleClick = (e) => {
    // Find the closest link element
    let target = e.target;
    let linkElement = null;
    
    // Traverse up to find a link (React Router Link renders as <a>)
    while (target && target !== document.body) {
      // Check for anchor tag with href
      if (target.tagName === 'A' && target.hasAttribute('href')) {
        const href = target.getAttribute('href');
        // Check if it's an internal link (starts with / but not //)
        if (href && href.startsWith('/') && !href.startsWith('//')) {
          linkElement = target;
          break;
        }
      }
      target = target.parentElement;
    }

    if (linkElement) {
      // Save current scroll position immediately before navigation
      // Use both sync and async to ensure it's saved
      saveCurrentScroll();
      
      // Also save after a microtask to catch any late scroll changes
      Promise.resolve().then(() => {
        saveCurrentScroll();
      });
    }
  };

  // Use capture phase to catch clicks early, before React Router handles them
  document.addEventListener('click', handleClick, true);
  
  // Save on visibility change (when user switches tabs/windows)
  const handleVisibilityChange = () => {
    if (!document.hidden) {
      saveCurrentScroll();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Save on page unload as final fallback
  const handleBeforeUnload = () => {
    saveCurrentScroll();
  };
  window.addEventListener('beforeunload', handleBeforeUnload);
  
  // Save on popstate (back/forward navigation start)
  const handlePopState = () => {
    // Don't save on popstate - we want to restore, not save
  };
  window.addEventListener('popstate', handlePopState);
  
  // Initial save
  saveCurrentScroll();
  
  return () => {
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.removeEventListener('popstate', handlePopState);
  };
};

