import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { saveScrollPosition, restoreScrollPosition, setupLinkInterception, setRestoring, isRestoring } from "../utils/scrollRestoration";

export default function ScrollToTop() {
  const { pathname } = useLocation();
  const navType = useNavigationType();
  const prevPathnameRef = useRef(pathname);

  // Setup link click interception to save scroll position before navigation
  useEffect(() => {
    const cleanup = setupLinkInterception();
    return cleanup;
  }, []);

  // Main scroll restoration logic
  useEffect(() => {
    const prevPath = prevPathnameRef.current;
    const pathChanged = prevPath !== pathname;

    if (navType === "POP") {
      // Back/forward navigation - restore scroll position
      // restoreScrollPosition will set the restoring flag internally
      restoreScrollPosition(pathname, 150);
    } else if (pathChanged) {
      // Forward navigation (PUSH/REPLACE)
      // Ensure we're not in a restoring state
      setRestoring(false);
      
      // Save previous page's scroll position (if not already saved by click handler)
      if (prevPath) {
        const currentScroll = window.scrollY || window.pageYOffset || 0;
        // Only save if we have a meaningful scroll position
        if (currentScroll > 0) {
          saveScrollPosition(prevPath);
        }
      }

      // Scroll to top for new pages, but NOT for product pages (they handle it themselves)
      const isProductPage = pathname.startsWith('/product/');
      if (!isProductPage && !isRestoring()) {
        // Small delay to ensure we're not interfering with restoration
        requestAnimationFrame(() => {
          if (!isRestoring()) {
            window.scrollTo({ top: 0, left: 0, behavior: "auto" });
          }
        });
      }
    }

    // Update previous pathname
    prevPathnameRef.current = pathname;

    // Move focus to main content for accessibility (but don't scroll)
    const main = document.getElementById("main-content");
    if (main && !isRestoring()) {
      const prevTabIndex = main.getAttribute("tabindex");
      main.setAttribute("tabindex", "-1");
      main.focus({ preventScroll: true });
      if (prevTabIndex === null) main.removeAttribute("tabindex");
    }
  }, [pathname, navType]);

  // Continuously save scroll position as user scrolls
  useEffect(() => {
    let timeoutId;
    let rafId;
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
      if (rafId) cancelAnimationFrame(rafId);

      // Save after scroll stops (debounced)
      timeoutId = setTimeout(() => {
        rafId = requestAnimationFrame(saveScroll);
      }, 100);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    
    // Also save on initial mount
    saveScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (timeoutId) clearTimeout(timeoutId);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [pathname]);

  return null;
}
