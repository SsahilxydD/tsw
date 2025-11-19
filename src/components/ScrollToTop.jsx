import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    // If the user clicked "Back" (POP), let the browser restore scroll position.
    // Otherwise (PUSH/REPLACE), scroll to top.
    if (navType !== "POP") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }

    // Move focus to main content for keyboard/screen-reader users
    const main = document.getElementById("main-content");
    if (main) {
      // Ensure it's focusable, then focus
      const prevTabIndex = main.getAttribute("tabindex");
      main.setAttribute("tabindex", "-1");
      main.focus({ preventScroll: true });
      // Restore any previous state (keep -1 if already -1)
      if (prevTabIndex === null) main.removeAttribute("tabindex");
    }
  }, [pathname, navType]);

  return null;
}
