import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    const scrollKey = `scroll_${pathname}`;

    if (navType === "POP") {
      // Restore scroll position on back/forward navigation
      const savedScroll = sessionStorage.getItem(scrollKey);
      if (savedScroll) {
        const scrollPos = parseInt(savedScroll, 10);
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
          window.scrollTo({ top: scrollPos, left: 0, behavior: "auto" });
        }, 0);
      }
    } else {
      // Save current scroll position before navigating away
      const currentPath = window.location.pathname;
      const currentScrollKey = `scroll_${currentPath}`;
      sessionStorage.setItem(currentScrollKey, window.scrollY.toString());

      // Scroll to top for new navigation (PUSH/REPLACE)
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }

    // Move focus to main content for keyboard/screen-reader users
    const main = document.getElementById("main-content");
    if (main) {
      const prevTabIndex = main.getAttribute("tabindex");
      main.setAttribute("tabindex", "-1");
      main.focus({ preventScroll: true });
      if (prevTabIndex === null) main.removeAttribute("tabindex");
    }
  }, [pathname, navType]);

  return null;
}
