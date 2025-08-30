// src/App.jsx
import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import ScrollProgress from "./components/ScrollProgress";
import Footer from "./components/Footer";
import WhatsAppCTA from "./components/WhatsAppCTA";
import Notice from "./components/Notice";
import { ToastContainer, Slide } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ScrollToTop from "./components/ScrollToTop";

import Home from "./pages/Home";
import Category from "./pages/Category";
import Collection from "./pages/Collection";
import Product from "./pages/Product";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Cart from "./pages/Cart";
import Address from "./pages/Address";
import Payment from "./pages/Payment";
import PlaceOrder from "./pages/PlaceOrder";
import Orders from "./pages/Orders";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

export default function App() {
  const location = useLocation();
  return (
    <>
      <ScrollToTop />

      <Navbar />
      <ScrollProgress />

      <main id="main-content" className="min-h-[60vh]">
        <div key={location.pathname} className="animate-page">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/category/:cat" element={<Category />} />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/address" element={<Address />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/place-order" element={<PlaceOrder />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/login" element={<Login />} />
          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </div>
      </main>

      <Footer />

      {/* Floating WhatsApp CTA (site-wide) */}
      <WhatsAppCTA
        phone="+919933778870"
        //walinkId="https://wa.me/message/NFOO5QIA4N27L1" // optional; remove if you don't use wa.link
        message="Hello!"
        iconSrc="/src/assets/whatsapp.png"          // your icon path
        iconOnly                                    // <- icon-only mode
        // iconSrc="/src/assets/whatsapp.png" // optional custom icon
      />
      {/* Lightweight in-app notices (add/remove, validation, etc.) */}
      <Notice />
      <ToastContainer
        position="bottom-center"
        autoClose={1100}
        hideProgressBar
        closeOnClick
        pauseOnHover={false}
        pauseOnFocusLoss={false}
        draggable={false}
        newestOnTop={false}
        closeButton={false}
        icon={false}
        limit={1}
        theme="dark"
        transition={Slide}
        toastClassName={() => "toast-min"}
        bodyClassName={() => "toast-min-body"}
        containerStyle={{ paddingBottom: '72px' }}
      />
    </>
  );
}
