// src/components/LenisSmoothScroll.jsx
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * LenisSmoothScroll - Provides smooth scrolling throughout the site
 * Integrates with React Router and existing scroll restoration
 * Uses lerp: 0.8 for smooth scrolling speed as specified in PRD
 */
const LenisSmoothScroll = () => {
  const location = useLocation();
  const lenisRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    // Defer + disable on mobile/touch/reduced-motion to avoid early main-thread work (helps PSI forced reflow).
    if (typeof window === 'undefined') return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const maxTouch = Number(navigator?.maxTouchPoints || 0);
    const isTouch = maxTouch > 0 || window.matchMedia?.('(pointer: coarse)')?.matches;
    const isSmall = window.matchMedia?.('(max-width: 767px)')?.matches;
    if (reduceMotion || isTouch || isSmall) return;

    let cancelled = false;
    let timerId = null;
    let started = false;

    const start = async () => {
      try {
        // Dynamic import so Lenis doesn't land in the critical homepage bundle.
        const mod = await import('lenis');
        const Lenis = mod?.default || mod;
        if (cancelled) return;

        // Initialize Lenis with 0.8 scroll speed (lerp: 0.8)
        const lenis = new Lenis({
          duration: 1.2,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
          orientation: 'vertical',
          gestureOrientation: 'vertical',
          smoothWheel: true,
          wheelMultiplier: 1,
          smoothTouch: false,
          touchMultiplier: 2,
          infinite: false,
          lerp: 0.8,
        });

        lenisRef.current = lenis;

        const raf = (time) => {
          if (cancelled) return;
          try { lenis.raf(time); } catch { }
          rafRef.current = requestAnimationFrame(raf);
        };
        rafRef.current = requestAnimationFrame(raf);
      } catch {
        // If Lenis fails, fall back to native scrolling silently.
      }
    };

    // IMPORTANT: Avoid PSI "chained critical requests" by not fetching Lenis during initial navigation.
    // Only load after a real user interaction (wheel/keyboard scroll) or a long timeout.
    const triggerStart = () => {
      if (started || cancelled) return;
      started = true;
      cleanupListeners();
      start();
    };

    const onWheel = () => triggerStart();
    const onKey = (e) => {
      const k = e?.key || '';
      if (k === 'PageDown' || k === 'PageUp' || k === ' ' || k.startsWith('Arrow')) triggerStart();
    };

    const cleanupListeners = () => {
      try { window.removeEventListener('wheel', onWheel); } catch {}
      try { window.removeEventListener('keydown', onKey); } catch {}
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKey);
    timerId = window.setTimeout(triggerStart, 8000);

    return () => {
      cancelled = true;
      try { if (timerId) window.clearTimeout(timerId); } catch { }
      cleanupListeners();
      try { if (rafRef.current) cancelAnimationFrame(rafRef.current); } catch { }
      try { lenisRef.current?.destroy?.(); } catch { }
      lenisRef.current = null;
      rafRef.current = 0;
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

