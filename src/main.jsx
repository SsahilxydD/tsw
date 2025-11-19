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
  // Simplified - restore immediately without waiting for content
  const restoreOnLoad = () => {
    const navType = sessionStorage.getItem('__nav_type__');
    if (navType === 'back') {
      const currentPath = window.location.pathname;
      const savedPos = sessionStorage.getItem(`scroll_${currentPath}`);
      if (savedPos) {
        const pos = parseInt(savedPos, 10);
        if (!isNaN(pos) && pos >= 0) {
          // Restore immediately - React Router will handle component mounting
          const restore = () => {
            window.scrollTo({ top: pos, left: 0, behavior: 'auto' });
            
            // Verify after a short delay and retry once if needed
            setTimeout(() => {
              const actualPos = window.scrollY || window.pageYOffset || 0;
              if (Math.abs(actualPos - pos) > 50) {
                requestAnimationFrame(() => {
                  window.scrollTo({ top: pos, left: 0, behavior: 'auto' });
                });
              }
            }, 100);
          };
          
          // Wait for DOM to be ready, then restore
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', restore);
          } else {
            requestAnimationFrame(() => {
              requestAnimationFrame(restore);
            });
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



