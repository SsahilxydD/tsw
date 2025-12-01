// src/App.jsx
import React, { lazy, Suspense } from "react";
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
import PageLoader from "./components/PageLoader";

// Eagerly load Home for fastest LCP (critical path)
import Home from "./pages/Home";

// Lazy load all other pages - each becomes a separate chunk
const Category = lazy(() => import("./pages/Category"));
const Collection = lazy(() => import("./pages/Collection"));
const Product = lazy(() => import("./pages/Product"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Cart = lazy(() => import("./pages/Cart"));
const Address = lazy(() => import("./pages/Address"));
const Payment = lazy(() => import("./pages/Payment"));
const PlaceOrder = lazy(() => import("./pages/PlaceOrder"));
const Orders = lazy(() => import("./pages/Orders"));
const Login = lazy(() => import("./pages/Login"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Route configuration for caching
const routes = [
  { path: "/", element: <Home /> },
  { path: "/collection", element: <Collection /> },
  { path: "/category/:cat", element: <Category /> },
  { path: "/product/:id", element: <Product /> },
  { path: "/about", element: <About /> },
  { path: "/contact", element: <Contact /> },
  { path: "/cart", element: <Cart /> },
  { path: "/address", element: <Address /> },
  { path: "/payment", element: <Payment /> },
  { path: "/place-order", element: <PlaceOrder /> },
  { path: "/orders", element: <Orders /> },
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
          <Suspense fallback={<PageLoader />}>
            <CachedRoutes routes={routes} />
          </Suspense>
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
