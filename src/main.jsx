import React from 'react';
import * as ReactDOMClient from 'react-dom/client';
import ReactDOM from 'react-dom';
import App from './App.jsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import ShopContextProvider from './context/ShopContext.jsx';

const container = document.getElementById('root');
const app = (
  <BrowserRouter>
    <ShopContextProvider>
      <App />
    </ShopContextProvider>
  </BrowserRouter>
);

if (ReactDOMClient && typeof ReactDOMClient.createRoot === 'function') {
  const root = ReactDOMClient.createRoot(container);
  root.render(app);
} else {
  // Fallback for environments with older ReactDOM
  ReactDOM.render(app, container);
}

// Prevent double-tap to zoom globally (app-like behavior on iOS Safari)
// Retains normal scrolling and click behavior.
(() => {
  let lastTouch = 0;
  function onTouchEnd(e) {
    const now = Date.now();
    if (now - lastTouch <= 300) {
      try { e.preventDefault(); } catch {}
    }
    lastTouch = now;
  }
  window.addEventListener('touchend', onTouchEnd, { passive: false });
})();

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



