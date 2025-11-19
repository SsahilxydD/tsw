import { useEffect } from "react";
import { setupScrollSaving } from "../utils/scrollRestoration";

/**
 * ScrollToTop - Handles continuous scroll position saving
 * The actual restoration is handled by ScrollRouter
 * This component only sets up the scroll event listener
 */
export default function ScrollToTop() {
  // Setup continuous scroll position saving
  useEffect(() => {
    const cleanup = setupScrollSaving();
    return cleanup;
  }, []);

  // Move focus to main content for accessibility (but don't scroll)
  useEffect(() => {
    const main = document.getElementById("main-content");
    if (main) {
      const prevTabIndex = main.getAttribute("tabindex");
      main.setAttribute("tabindex", "-1");
      main.focus({ preventScroll: true });
      if (prevTabIndex === null) main.removeAttribute("tabindex");
    }
  }, []); // Only run once on mount

  return null;
}
