// src/App.jsx
import React, { lazy, Suspense, useContext } from "react";
import { useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import SearchBar from "./components/SearchBar";
import ScrollProgress from "./components/ScrollProgress";
import ScrollEffects from "./components/ScrollEffects";
import Footer from "./components/Footer";
import WhatsAppCTA from "./components/WhatsAppCTA";
import Notice from "./components/Notice";
import ErrorBoundary from "./components/ErrorBoundary";
import Loading from "./components/Loading";
import DelayedFallback from "./components/DelayedFallback";
import ScrollToTop from "./components/ScrollToTop";
import CachedRoutes from "./components/CachedRoutes";
import SkipLink from "./components/SkipLink";
import LenisSmoothScroll from "./components/LenisSmoothScroll";
import BottomDock from "./components/BottomDock";
import { ShopContext } from "./context/ShopContext";

// Lazy load CartDrawer (uses framer-motion) - only loads when cart opens
const CartDrawer = lazy(() => import("./components/CartDrawer"));

// Home is eagerly loaded (LCP). Everything else is lazy to reduce unused JS on the homepage.
import Home from "./pages/Home";
const Category = lazy(() => import("./pages/Category"));
const Collection = lazy(() => import("./pages/Collection"));
const Product = lazy(() => import("./pages/Product"));
const Cart = lazy(() => import("./pages/Cart"));
const Address = lazy(() => import("./pages/Address"));
const Payment = lazy(() => import("./pages/Payment"));
const NotFound = lazy(() => import("./pages/NotFound"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Orders = lazy(() => import("./pages/Orders"));
const Login = lazy(() => import("./pages/Login"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const CategoriesPage = lazy(() => import("./pages/CategoriesPage"));

// Route configuration for caching
const routes = [
  { path: "/", element: <Home /> },
  { path: "/categories", element: <CategoriesPage /> },
  { path: "/collection", element: <Collection /> },
  { path: "/category/:cat", element: <Category /> },
  { path: "/product/:id", element: <Product /> },
  { path: "/about", element: <About /> },
  { path: "/contact", element: <Contact /> },
  { path: "/cart", element: <Cart /> },
  { path: "/wishlist", element: <Wishlist /> },
  { path: "/address", element: <Address /> },
  { path: "/payment", element: <Payment /> },
  { path: "/orders", element: <Orders /> },
  { path: "/login", element: <Login /> },
  { path: "*", element: <NotFound /> },
];

export default function App() {
  const location = useLocation();
  const { isCartOpen } = useContext(ShopContext);
  const isHome = location.pathname === "/";
  const isCheckout = location.pathname === "/address";

  return (
    <ErrorBoundary>
      <LenisSmoothScroll />
      <SkipLink />
      <ScrollToTop />

      <Navbar />
      {/* Only mount CartDrawer when needed so framer-motion doesn't download on the homepage */}
      {isCartOpen && (
        <Suspense fallback={null}>
          <CartDrawer />
        </Suspense>
      )}
      <SearchBar />
      <ScrollProgress />
      <ScrollEffects />

      {/* Spacer for fixed navbar on non-home pages */}
      {!isHome && (
        <div className={
          /^(?:\/category\/discounted)(?:\/|$)/i.test(location.pathname)
            ? "h-16 sm:h-14"
            : "h-[100px] sm:h-[92px]"
        } />
      )}

      <main id="main-content" className="min-h-[60vh]">
        <div className="animate-page">
          <Suspense
            fallback={
              <DelayedFallback delayMs={150}>
                <div className="flex items-center justify-center min-h-[60vh]">
                  <Loading size="lg" message="Loading page..." />
                </div>
              </DelayedFallback>
            }
          >
            <CachedRoutes routes={routes} />
          </Suspense>
        </div>
      </main>

      {/* Hide footer on checkout page to avoid blocking the sticky CTA */}
      {!isCheckout && <Footer />}

      {/* Mobile bottom dock navigation — hidden on checkout to give the sticky Place Order CTA room */}
      {!isCheckout && <BottomDock />}

      {/* Floating WhatsApp CTA (site-wide) */}
      <WhatsAppCTA
        phone={import.meta.env.VITE_WHATSAPP_PHONE || "+919933778870"}
        message="Hello!"
        iconOnly
      />
      {/* Lightweight in-app notices (add/remove, validation, etc.) */}
      <Notice />
    </ErrorBoundary>
  );
}
