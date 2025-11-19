import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();
  const navType = useNavigationType();
  const prevPathnameRef = useRef(pathname);

  useEffect(() => {
    const scrollKey = `scroll_${pathname}`;
    const prevPath = prevPathnameRef.current;

    if (navType === "POP") {
      // Restore scroll position on back/forward navigation
      // DO NOT scroll to top on back navigation
      const savedScroll = sessionStorage.getItem(scrollKey);
      if (savedScroll) {
        const scrollPos = parseInt(savedScroll, 10);
        if (!isNaN(scrollPos) && scrollPos >= 0) {
          // Use requestAnimationFrame + timeout to ensure DOM is fully ready
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              // Double RAF ensures layout is complete, then add small delay for content rendering
              setTimeout(() => {
                // Only restore if we're still on the same page (prevent race conditions)
                if (window.location.pathname === pathname) {
                  window.scrollTo({ top: scrollPos, left: 0, behavior: "auto" });
                }
              }, 100);
            });
          });
        }
      } else {
        // If no saved scroll position, don't scroll to top - let the page stay where it is
        // This prevents unwanted scroll-to-top on back navigation
      }
    } else {
      // Save scroll position of the previous page BEFORE navigating away
      // This must happen before any scrolling occurs
      if (prevPath && prevPath !== pathname) {
        const prevScrollKey = `scroll_${prevPath}`;
        // Get scroll position immediately - it's still from the previous page
        const currentScroll = window.scrollY;
        // Only save if we have a valid scroll position (not already at top due to other effects)
        if (currentScroll > 0 || !sessionStorage.getItem(prevScrollKey)) {
          sessionStorage.setItem(prevScrollKey, currentScroll.toString());
        }
      }

      // Scroll to top for new navigation (PUSH/REPLACE) - but only if not a product page
      // Product pages handle their own scroll-to-top logic
      const isProductPage = pathname.startsWith('/product/');
      if (!isProductPage) {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }
    }

    // Update previous pathname for next navigation (do this last)
    prevPathnameRef.current = pathname;

    // Move focus to main content for keyboard/screen-reader users (but don't scroll)
    const main = document.getElementById("main-content");
    if (main) {
      const prevTabIndex = main.getAttribute("tabindex");
      main.setAttribute("tabindex", "-1");
      main.focus({ preventScroll: true });
      if (prevTabIndex === null) main.removeAttribute("tabindex");
    }
  }, [pathname, navType]);

  // Save scroll position on scroll events (debounced) for more reliable saving
  // Also save immediately when pathname changes to catch navigation events
  useEffect(() => {
    // Save current scroll position immediately when pathname changes (before navigation completes)
    const currentPath = window.location.pathname;
    const scrollKey = `scroll_${currentPath}`;
    const currentScroll = window.scrollY;
    if (currentScroll >= 0) {
      sessionStorage.setItem(scrollKey, currentScroll.toString());
    }

    // Also save on scroll events (debounced) for continuous updates
    let timeoutId;
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const currentPath = window.location.pathname;
        const scrollKey = `scroll_${currentPath}`;
        sessionStorage.setItem(scrollKey, window.scrollY.toString());
      }, 150);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timeoutId);
    };
  }, [pathname]);

  return null;
}
