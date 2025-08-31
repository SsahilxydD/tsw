import React, { useContext, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { assets } from "../assets/assets";
import { ShopContext } from "../context/ShopContext";

const Navbar = () => {
  const { search, setSearch, showSearch, setShowSearch, getCartCount } = useContext(ShopContext);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  // Enable search button ONLY on /collection and /category/* routes
  const enableSearch = /^\/(collection|category)(\/|$)/.test(location.pathname);

  // Close search + clear query on route change
  useEffect(() => {
    setShowSearch(false);
    setSearch("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Subtle shadow after small scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const inputRef = useRef(null);
  useEffect(() => {
    if (!showSearch) return;
    const onKey = (e) => { if (e.key === 'Escape') setShowSearch(false); };
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => { try { inputRef.current?.focus(); } catch {} }, 0);
    return () => { document.removeEventListener('keydown', onKey); clearTimeout(t); };
  }, [showSearch, setShowSearch]);

  const count = getCartCount();
  const prevRef = useRef(count);
  const [bump, setBump] = useState(false);
  useEffect(() => {
    const prev = prevRef.current;
    if (count > prev) {
      setBump(true);
      prevRef.current = count;
      const t = setTimeout(() => setBump(false), 450);
      return () => clearTimeout(t);
    }
    prevRef.current = count;
  }, [count]);

  return (
    <header
      className={`sticky top-0 z-30 bg-white/95 backdrop-blur border-b ${
        scrolled ? "shadow-sm" : ""
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand: logo only */}
        <Link to="/" className="flex items-center gap-3" aria-label="Go to homepage">
          {assets.logo && (
            <img
              src={assets.logo}
              alt="Solo Wardrobe"
              className="h-10 sm:h-14 w-auto object-contain"
            />
          )}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:block" aria-label="Primary">
          <ul className="flex items-center gap-8 text-sm">
            <li><Link to="/" className="hover:underline">Home</Link></li>
            <li><Link to="/about" className="hover:underline">About</Link></li>
            <li><Link to="/contact" className="hover:underline">Contact</Link></li>
          </ul>
        </nav>

        {/* Right controls: cart only (search moved to page toolbars) */}
        <div className="flex items-center gap-2">
          <Link id="cart-anchor" to="/cart" aria-label="Cart" className="relative p-2 rounded hover:bg-gray-100 pressable">
            {assets.cart_icon ? (
              <img src={assets.cart_icon} alt="" className="w-5 h-5" />
            ) : (
              <span className="text-sm">Cart</span>
            )}
            {count > 0 && (
              <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] text-[10px] leading-[18px] text-white bg-black rounded-full text-center px-[4px] transition-transform ${bump ? 'scale-110' : 'scale-100'}`}>
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile nav links */}
      <nav className="md:hidden border-t bg-white">
        <div className="max-w-6xl mx-auto px-4 py-2">
          <ul className="flex items-center justify-center gap-6 text-sm text-gray-700">
            <li><Link to="/" className="py-1.5 px-1 hover:underline">Home</Link></li>
            <li><Link to="/about" className="py-1.5 px-1 hover:underline">About</Link></li>
            <li><Link to="/contact" className="py-1.5 px-1 hover:underline">Contact</Link></li>
          </ul>
        </div>
      </nav>

      {/* Revealable search bar (only on listing routes) */}
      {enableSearch && showSearch && (
        <div className="border-t bg-white">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              ref={inputRef}
              className="flex-1 h-10 border rounded px-3 outline-none focus:ring-2 focus:ring-black/20"
            />
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setShowSearch(false);
              }}
              className="h-10 px-3 border rounded pressable"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
