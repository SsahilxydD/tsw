// src/App.jsx
import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import SearchBar from "./components/SearchBar";
import ScrollProgress from "./components/ScrollProgress";
import ScrollEffects from "./components/ScrollEffects";
import Footer from "./components/Footer";
import WhatsAppCTA from "./components/WhatsAppCTA";
import Notice from "./components/Notice";
import { ToastContainer, Slide } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ScrollToTop from "./components/ScrollToTop";
import CartDrawer from "./components/CartDrawer";
import CachedRoutes from "./components/CachedRoutes";

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

// Route configuration for caching
const routes = [
  { path: "/", element: <Home /> },
  { path: "/collection", element: <Collection /> },
  { path: "/category/:cat", element: <Category /> },
  { path: "/product/:id", element: <Product /> },
  { path: "/about", element: <About /> },
  { path: "/contact", element: <Contact /> },
  { path: "/cart", element: <Cart /> },
  { path: "/place-order", element: <PlaceOrder /> },
  { path: "/login", element: <Login /> },
  { path: "*", element: <NotFound /> },
];

export default function App() {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <>
      <ScrollToTop />

      <Navbar />
      <CartDrawer />
      <SearchBar />
      <ScrollProgress />
      <ScrollEffects />

      {/* Spacer for fixed navbar on non-home pages */}
      {!isHome && <div className="h-[100px] sm:h-[92px]" />}

      <main id="main-content" className="min-h-[60vh]">
        <div className="animate-page">
          <CachedRoutes routes={routes} />
        </div>
      </main>

      <Footer />



      {/* Floating WhatsApp CTA (site-wide) */}
      <WhatsAppCTA
        phone="+919933778870"
        //walinkId="https://wa.me/message/NFOO5QIA4N27L1" // optional; remove if you don't use wa.link
        message="Hello!"
        iconOnly
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
