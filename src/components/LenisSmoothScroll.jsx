// src/components/LenisSmoothScroll.jsx
import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import { useLocation } from 'react-router-dom';

/**
 * LenisSmoothScroll - Provides smooth scrolling throughout the site
 * Integrates with React Router and existing scroll restoration
 * Uses lerp: 0.8 for smooth scrolling speed as specified in PRD
 */
const LenisSmoothScroll = () => {
  const location = useLocation();
  const lenisRef = useRef(null);

  useEffect(() => {
    // Initialize Lenis with 0.8 scroll speed (lerp: 0.8)
    // lerp controls the smoothness: 0.8 = 80% of the way to target each frame
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      smoothTouch: false, // Disable on touch devices for better performance and native feel
      touchMultiplier: 2,
      infinite: false,
      lerp: 0.8, // 0.8 scroll speed as specified in PRD
    });

    lenisRef.current = lenis;

    // Animation frame loop
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // Cleanup
    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Handle route changes - temporarily stop Lenis during scroll restoration
  useEffect(() => {
    if (!lenisRef.current) return;

    // Stop Lenis to allow scroll restoration to work
    lenisRef.current.stop();

    // Re-enable after scroll restoration completes
    // The scroll restoration system typically completes within 200-300ms
    const timer = setTimeout(() => {
      if (lenisRef.current) {
        lenisRef.current.start();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return null; // This component doesn't render anything
};

export default LenisSmoothScroll;

