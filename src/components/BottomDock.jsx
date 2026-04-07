import React, { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { ShopContext } from "../context/ShopContext";

const BottomDock = () => {
  const { getWishlistCount, getCartCount, setIsCartOpen } = useContext(ShopContext);
  const location = useLocation();
  const wishlistCount = getWishlistCount();
  const cartCount = getCartCount();

  const isActive = (path) => location.pathname === path;
  const isCategory = location.pathname === "/categories" || location.pathname.startsWith("/category/");
  const isSearch = location.pathname === "/collection";

  const iconClass = (active) =>
    `flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1 transition-colors ${active ? "text-primary" : "text-gray-500"}`;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[58] bg-white border-t border-gray-200 safe-area-bottom md:hidden"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-[56px]">
        {/* Home */}
        <Link to="/" className={iconClass(isActive("/"))}>
          <svg className="w-5 h-5" fill={isActive("/") ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
          </svg>
          <span className="text-[10px] font-medium">Home</span>
        </Link>

        {/* Categories → dedicated categories page */}
        <Link to="/categories" className={iconClass(isCategory)}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <span className="text-[10px] font-medium">Shop</span>
        </Link>

        {/* Search → collection page with search auto-opened */}
        <Link to="/collection?search=1" className={iconClass(isSearch)}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-[10px] font-medium">Search</span>
        </Link>

        {/* Cart */}
        <button onClick={() => setIsCartOpen(true)} className={`${iconClass(false)} relative`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          {cartCount > 0 && (
            <span className="absolute -top-0.5 right-1 min-w-[16px] h-[16px] text-[9px] font-bold text-white bg-black rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          )}
          <span className="text-[10px] font-medium">Cart</span>
        </button>

        {/* Wishlist */}
        <Link to="/wishlist" className={`${iconClass(isActive("/wishlist"))} relative`}>
          <svg className="w-5 h-5" fill={isActive("/wishlist") ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          {wishlistCount > 0 && (
            <span className="absolute -top-0.5 right-1 min-w-[16px] h-[16px] text-[9px] font-bold text-white bg-red-500 rounded-full flex items-center justify-center">
              {wishlistCount}
            </span>
          )}
          <span className="text-[10px] font-medium">Wishlist</span>
        </Link>
      </div>
    </nav>
  );
};

export default BottomDock;
