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
      const savedScroll = sessionStorage.getItem(scrollKey);
      if (savedScroll) {
        const scrollPos = parseInt(savedScroll, 10);
        // Use requestAnimationFrame + timeout to ensure DOM is fully ready
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Double RAF ensures layout is complete, then add small delay for content rendering
            setTimeout(() => {
              window.scrollTo({ top: scrollPos, left: 0, behavior: "auto" });
            }, 50);
          });
        });
      }
    } else {
      // Save scroll position of the previous page before navigating away
      if (prevPath && prevPath !== pathname) {
        const prevScrollKey = `scroll_${prevPath}`;
        sessionStorage.setItem(prevScrollKey, window.scrollY.toString());
      }

      // Scroll to top for new navigation (PUSH/REPLACE)
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }

    // Update previous pathname for next navigation
    prevPathnameRef.current = pathname;

    // Move focus to main content for keyboard/screen-reader users
    const main = document.getElementById("main-content");
    if (main) {
      const prevTabIndex = main.getAttribute("tabindex");
      main.setAttribute("tabindex", "-1");
      main.focus({ preventScroll: true });
      if (prevTabIndex === null) main.removeAttribute("tabindex");
    }
  }, [pathname, navType]);

  // Save scroll position on scroll events (debounced) for more reliable saving
  useEffect(() => {
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
  }, []);

  return null;
}
