// src/App.jsx
import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import WhatsAppCTA from "./components/WhatsAppCTA";

import Home from "./pages/Home";
import Category from "./pages/Category";
import Collection from "./pages/Collection";
import Product from "./pages/Product";

// Scroll to top on route change (uses React Router hook safely)
function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />

      <Navbar />

      <main className="min-h-[60vh]">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/category/:cat" element={<Category />} />
          <Route path="/product/:id" element={<Product />} />
          {/* Fallback */}
          <Route path="*" element={<Home />} />
        </Routes>
      </main>

      <Footer />

      {/* Floating WhatsApp CTA (site-wide) */}
      <WhatsAppCTA
        phone="+919876543210"
        walinkId="abcd12" // optional; remove if you don't use wa.link
        message="Hi! I’d like to know about a product."
        // iconSrc="/src/assets/whatsapp.png" // optional custom icon
      />
    </>
  );
}
