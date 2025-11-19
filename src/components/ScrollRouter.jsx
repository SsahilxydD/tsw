import { useEffect, useRef } from "react";
import { BrowserRouter, useLocation, useNavigationType } from "react-router-dom";
import { saveScrollPosition, getScrollPosition, setRestoring } from "../utils/scrollRestoration";

/**
 * ScrollRouterContent - Handles scroll restoration logic
 * Must be inside BrowserRouter to use React Router hooks
 */
function ScrollRouterContent({ children }) {
  const location = useLocation();
  const navType = useNavigationType();
  const prevPathnameRef = useRef(location.pathname);
  const isInitialMount = useRef(true);
  const restorationAttempted = useRef(false);

  useEffect(() => {
    const currentPath = location.pathname;
    const prevPath = prevPathnameRef.current;
    const pathChanged = prevPath !== currentPath;

    // Skip on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevPathnameRef.current = currentPath;
      
      // Check if this is a page load after back navigation
      const navType = sessionStorage.getItem('__nav_type__');
      if (navType === 'back') {
        restorationAttempted.current = true;
        const savedPos = getScrollPosition(currentPath);
        if (savedPos !== null && savedPos >= 0) {
          setRestoring(true);
          // Restore after a delay to ensure DOM is ready
          setTimeout(() => {
            window.scrollTo({ top: savedPos, left: 0, behavior: 'auto' });
            setTimeout(() => {
              const actualPos = window.scrollY || window.pageYOffset || 0;
              if (Math.abs(actualPos - savedPos) > 50) {
                window.scrollTo({ top: savedPos, left: 0, behavior: 'auto' });
              }
              setRestoring(false);
            }, 50);
          }, 200);
        }
        sessionStorage.removeItem('__nav_type__');
      }
      return;
    }

    if (navType === "POP") {
      // Back/forward navigation - restore scroll position
      const savedPos = getScrollPosition(currentPath);
      
      if (savedPos !== null && savedPos >= 0) {
        setRestoring(true);
        
        // Restore scroll position with multiple attempts, waiting for content to load
        const attemptRestore = (attempt = 0) => {
          if (attempt > 10) {
            setRestoring(false);
            return;
          }
          
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setTimeout(() => {
                // Verify we're still on the same page
                if (window.location.pathname === currentPath) {
                  // Check if page content is ready
                  const body = document.body;
                  const mainContent = document.getElementById('main-content');
                  const hasContent = body && body.offsetHeight > 500;
                  
                  // For category/collection pages, wait for product grid
                  const productGrid = document.querySelector('.grid.grid-cols-2, .grid.grid-cols-3');
                  const hasProducts = !productGrid || productGrid.children.length > 0;
                  
                  // Check if we need to wait for more products to load (infinite scroll)
                  const savedVisibleCount = sessionStorage.getItem(`scroll_${currentPath}_visibleCount`);
                  let hasEnoughProducts = true;
                  if (savedVisibleCount && productGrid) {
                    const requiredCount = parseInt(savedVisibleCount, 10);
                    const currentCount = productGrid.children.length;
                    // Wait until we have at least the required number of products (but don't wait forever)
                    // If we have at least 12 products, that's good enough to restore scroll
                    hasEnoughProducts = currentCount >= Math.min(requiredCount, 48) || currentCount >= 12;
                  }
                  
                  // Only restore if content is ready
                  if (hasContent && hasProducts && hasEnoughProducts) {
                    const currentScroll = window.scrollY || window.pageYOffset || 0;
                    
                    // Only restore if we're not already at the right position
                    if (Math.abs(currentScroll - savedPos) > 10) {
                      window.scrollTo({ top: savedPos, left: 0, behavior: 'auto' });
                      
                      // Verify it worked
                      setTimeout(() => {
                        const actualPos = window.scrollY || window.pageYOffset || 0;
                        const diff = Math.abs(actualPos - savedPos);
                        
                        if (diff > 50 && attempt < 5) {
                          // Retry if restoration didn't work
                          attemptRestore(attempt + 1);
                        } else {
                          setRestoring(false);
                        }
                      }, 100);
                    } else {
                      setRestoring(false);
                    }
                  } else if (attempt < 10) {
                    // Content not ready yet, wait and retry
                    attemptRestore(attempt + 1);
                  } else {
                    // Max attempts, restore anyway
                    window.scrollTo({ top: savedPos, left: 0, behavior: 'auto' });
                    setRestoring(false);
                  }
                } else {
                  setRestoring(false);
                }
              }, 100 + (attempt * 50)); // Increase delay with each attempt
            });
          });
        };
        
        // Start restoration after initial delay
        setTimeout(() => attemptRestore(), 100);
      } else {
        setRestoring(false);
      }
    } else if (pathChanged) {
      // Forward navigation (PUSH/REPLACE) - scroll position should already be saved by click handler
      setRestoring(false);
      
      // Double-check: save previous page's scroll position if not already saved
      // (This is a fallback in case click handler didn't fire)
      if (prevPath) {
        const saved = getScrollPosition(prevPath);
        if (saved === null) {
          // Not saved yet, save it now (though it might already be 0)
          const currentScroll = window.scrollY || window.pageYOffset || 0;
          saveScrollPosition(prevPath);
        }
      }

      // Scroll to top for new pages (except product pages handle their own)
      const isProductPage = currentPath.startsWith('/product/');
      if (!isProductPage) {
        requestAnimationFrame(() => {
          window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        });
      }
    }

    // Update previous pathname
    prevPathnameRef.current = currentPath;
  }, [location.pathname, navType]);

  return <>{children}</>;
}

/**
 * ScrollRouter - Wraps BrowserRouter with scroll restoration
 * This component wraps BrowserRouter and provides scroll restoration functionality
 */
export default function ScrollRouter({ children }) {
  return (
    <BrowserRouter>
      <ScrollRouterContent>{children}</ScrollRouterContent>
    </BrowserRouter>
  );
}

