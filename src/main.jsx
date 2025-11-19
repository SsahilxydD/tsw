import React from 'react';
import * as ReactDOMClient from 'react-dom/client';
import ReactDOM from 'react-dom';
import App from './App.jsx';
import { HelmetProvider } from 'react-helmet-async';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import ShopContextProvider from './context/ShopContext.jsx';

const container = document.getElementById('root');
const app = (
  <HelmetProvider>
    <BrowserRouter>
      <ShopContextProvider>
        <App />
      </ShopContextProvider>
    </BrowserRouter>
  </HelmetProvider>
);

if (ReactDOMClient && typeof ReactDOMClient.createRoot === 'function') {
  const root = ReactDOMClient.createRoot(container);
  root.render(app);
} else {
  // Fallback for environments with older ReactDOM
  ReactDOM.render(app, container);
}

// Enable browser's native scroll restoration
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'auto';
}

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



