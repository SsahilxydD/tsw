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

  useEffect(() => {
    const currentPath = location.pathname;
    const prevPath = prevPathnameRef.current;
    const pathChanged = prevPath !== currentPath;

    // Skip on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevPathnameRef.current = currentPath;
      return;
    }

    if (navType === "POP") {
      // Back/forward navigation - restore scroll position
      const savedPos = getScrollPosition(currentPath);
      
      if (savedPos !== null && savedPos >= 0) {
        setRestoring(true);
        
        // Restore with proper timing - wait for DOM to be ready
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(() => {
              // Verify we're still on the same page
              if (window.location.pathname === currentPath) {
                window.scrollTo({ top: savedPos, left: 0, behavior: 'auto' });
                
                // Verify restoration worked and clear flag
                setTimeout(() => {
                  const actualPos = window.scrollY || window.pageYOffset || 0;
                  if (Math.abs(actualPos - savedPos) > 50) {
                    // Retry if restoration didn't work
                    window.scrollTo({ top: savedPos, left: 0, behavior: 'auto' });
                  }
                  
                  setTimeout(() => {
                    setRestoring(false);
                  }, 100);
                }, 50);
              } else {
                setRestoring(false);
              }
            }, 150);
          });
        });
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

