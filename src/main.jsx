import React from 'react';
import * as ReactDOMClient from 'react-dom/client';
import ReactDOM from 'react-dom';
import App from './App.jsx';
import { HelmetProvider } from 'react-helmet-async';
import './index.css';
import ScrollRouter from './components/ScrollRouter';
import ShopContextProvider from './context/ShopContext.jsx';

const container = document.getElementById('root');
const app = (
  <HelmetProvider>
    <ScrollRouter>
      <ShopContextProvider>
        <App />
      </ShopContextProvider>
    </ScrollRouter>
  </HelmetProvider>
);

if (ReactDOMClient && typeof ReactDOMClient.createRoot === 'function') {
  const root = ReactDOMClient.createRoot(container);
  root.render(app);
} else {
  // Fallback for environments with older ReactDOM
  ReactDOM.render(app, container);
}

// Disable browser's native scroll restoration - we handle it manually
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

// Handle scroll restoration on page load (for full page reloads)
// This runs before React Router initializes
(function() {
  if (typeof window === 'undefined') return;
  
  let isNavigatingAway = false;
  
  // Save scroll position before page unload (for full reloads)
  const handleBeforeUnload = () => {
    if (!isNavigatingAway) {
      const currentPath = window.location.pathname;
      const currentScroll = window.scrollY || window.pageYOffset || 0;
      if (currentScroll >= 0) {
        sessionStorage.setItem(`scroll_${currentPath}`, currentScroll.toString());
      }
    }
  };
  
  // Handle popstate (back/forward button) - mark as back navigation
  const handlePopState = (e) => {
    // Mark that this is a back navigation
    sessionStorage.setItem('__nav_type__', 'back');
    const currentPath = window.location.pathname;
    const savedPos = sessionStorage.getItem(`scroll_${currentPath}`);
    if (savedPos) {
      const pos = parseInt(savedPos, 10);
      if (!isNaN(pos) && pos >= 0) {
        // Try to restore immediately (before React Router processes it)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(() => {
              window.scrollTo({ top: pos, left: 0, behavior: 'auto' });
            }, 50);
          });
        });
      }
    }
  };
  
  // Restore scroll position on page load if it was a back navigation
  const restoreOnLoad = () => {
    const navType = sessionStorage.getItem('__nav_type__');
    if (navType === 'back') {
      const currentPath = window.location.pathname;
      const savedPos = sessionStorage.getItem(`scroll_${currentPath}`);
      if (savedPos) {
        const pos = parseInt(savedPos, 10);
        if (!isNaN(pos) && pos >= 0) {
          // Wait for page to be fully loaded and content rendered
          const doRestore = () => {
            let attempts = 0;
            const maxAttempts = 20; // More attempts for slow-loading content
            
            const tryRestore = () => {
              attempts++;
              
              // Check if page is ready and has content
              const body = document.body;
              const hasContent = body && body.offsetHeight > 500; // Page has substantial content
              const isReady = document.readyState === 'complete';
              
              // For category/collection pages, wait for product grid to be visible
              const productGrid = document.querySelector('.grid.grid-cols-2, .grid.grid-cols-3');
              const hasProducts = !productGrid || productGrid.children.length > 0;
              
              // Check if we need to wait for more products to load (infinite scroll)
              // But don't wait too long - if we have 12+ products, that's enough
              const savedVisibleCount = sessionStorage.getItem(`scroll_${currentPath}_visibleCount`);
              let hasEnoughProducts = true;
              if (savedVisibleCount && productGrid && attempts < 8) {
                // Only wait for products in first few attempts
                const requiredCount = parseInt(savedVisibleCount, 10);
                const currentCount = productGrid.children.length;
                // Wait until we have at least the required number of products (capped at 48)
                hasEnoughProducts = currentCount >= Math.min(requiredCount, 48) || currentCount >= 12;
              }
              
              if (isReady && hasContent && hasProducts && (hasEnoughProducts || attempts >= 8)) {
                // Page is ready, restore scroll position
                window.scrollTo({ top: pos, left: 0, behavior: 'auto' });
                
                // Verify it worked after a short delay
                setTimeout(() => {
                  const actualPos = window.scrollY || window.pageYOffset || 0;
                  const diff = Math.abs(actualPos - pos);
                  
                  if (diff > 50 && attempts < maxAttempts) {
                    // Retry if not accurate enough
                    tryRestore();
                  }
                }, 100);
              } else if (attempts < maxAttempts) {
                // Page not ready yet, wait and retry
                setTimeout(tryRestore, 150);
              } else {
                // Max attempts reached, restore anyway
                window.scrollTo({ top: pos, left: 0, behavior: 'auto' });
              }
            };
            
            // Start restoration attempts after initial delay
            setTimeout(tryRestore, 200);
          };
          
          // Wait for page to be interactive
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
              setTimeout(doRestore, 200);
            });
          } else {
            setTimeout(doRestore, 200);
          }
        }
      }
      // Clear the nav type flag after a delay
      setTimeout(() => {
        sessionStorage.removeItem('__nav_type__');
      }, 2000);
    }
  };
  
  // Intercept link clicks to mark as forward navigation
  document.addEventListener('click', (e) => {
    let target = e.target;
    while (target && target !== document.body) {
      if (target.tagName === 'A' && target.hasAttribute('href')) {
        const href = target.getAttribute('href');
        if (href && href.startsWith('/') && !href.startsWith('//')) {
          isNavigatingAway = true;
          // Save current scroll position
          const currentPath = window.location.pathname;
          const currentScroll = window.scrollY || window.pageYOffset || 0;
          sessionStorage.setItem(`scroll_${currentPath}`, currentScroll.toString());
          sessionStorage.setItem('__nav_type__', 'forward');
          break;
        }
      }
      target = target.parentElement;
    }
  }, true);
  
  window.addEventListener('beforeunload', handleBeforeUnload);
  window.addEventListener('popstate', handlePopState);
  
  // Restore on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreOnLoad);
  } else {
    restoreOnLoad();
  }
})();

// Remove anti-zoom handler to improve accessibility and SEO signals

// Set a CSS variable for reliable viewport height across iOS/Android
// Use as var(--rvh) = 1% of the real innerHeight
(() => {
  const update = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--rvh', `${vh}px`);
  };
  update();
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);
})();



