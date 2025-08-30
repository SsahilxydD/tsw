import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import ShopContextProvider from './context/ShopContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ShopContextProvider>
      <App />
    </ShopContextProvider>
  </BrowserRouter>
)

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
