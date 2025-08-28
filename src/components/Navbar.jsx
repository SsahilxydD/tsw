import React, { useContext, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { assets } from "../assets/assets";
import { ShopContext } from "../context/ShopContext";

const Navbar = () => {
  const { search, setSearch, showSearch, setShowSearch } = useContext(ShopContext);
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

        {/* Search toggle ONLY on product listing routes */}
        {enableSearch && (
          <button
            type="button"
            aria-label="Search"
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 rounded hover:bg-gray-100"
          >
            {assets.search_icon ? (
              <img src={assets.search_icon} alt="" className="w-5 h-5" />
            ) : (
              <span className="text-xl leading-none">🔍</span>
            )}
          </button>
        )}
      </div>

      {/* Revealable search bar (only on listing routes) */}
      {enableSearch && showSearch && (
        <div className="border-t bg-white">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              className="flex-1 h-10 border rounded px-3 outline-none focus:ring-2 focus:ring-black/20"
            />
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setShowSearch(false);
              }}
              className="h-10 px-3 border rounded"
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
