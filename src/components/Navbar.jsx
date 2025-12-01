import React, { useContext, useEffect, useRef, useState } from "react";
import { Link, useLocation, NavLink } from "react-router-dom";
import { assets } from "../assets/assets";
import { ShopContext } from "../context/ShopContext";
import AnnouncementBar from "./AnnouncementBar";

const Navbar = () => {
  const { getCartCount, setIsCartOpen, setShowSearch } = useContext(ShopContext);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isHome = location.pathname === "/";

  // Scroll detection - use hero height on home page
  useEffect(() => {
    const onScroll = () => {
      const heroHeight = isHome ? window.innerHeight * 0.85 : 20;
      setScrolled(window.scrollY > heroHeight - 80);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  const count = getCartCount();
  const prevRef = useRef(count);
  const [bump, setBump] = useState(false);

  useEffect(() => {
    if (count > prevRef.current) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 300);
      return () => clearTimeout(t);
    }
    prevRef.current = count;
  }, [count]);

  const showAnnouncement = !/^(?:\/category\/discounted)(?:\/|$)/i.test(location.pathname || "");

  // Transparent mode: on home page, not scrolled, menu closed
  const isTransparent = isHome && !scrolled && !isMenuOpen;

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  return (
    <>
      {showAnnouncement && <AnnouncementBar isTransparent={isTransparent} />}
      <header
        className={`fixed left-0 right-0 z-40 transition-all duration-300 ${
          isTransparent
            ? "bg-transparent border-b border-transparent"
            : "bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm"
        }`}
        style={{ top: showAnnouncement ? '36px' : '0' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-14 flex items-center justify-between overflow-hidden">

          {/* Mobile Menu Button */}
          <button
            className={`md:hidden p-2 -ml-2 transition-colors ${isTransparent ? 'text-white' : 'text-primary'}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Desktop Nav (Left) */}
          <nav className="hidden md:flex items-center gap-8">
            <NavLink to="/" className={({ isActive }) => `text-sm font-medium tracking-wide hover:text-accent transition-colors ${isTransparent ? 'text-white' : isActive ? 'text-primary' : 'text-secondary'}`}>
              HOME
            </NavLink>
            <NavLink to="/about" className={({ isActive }) => `text-sm font-medium tracking-wide hover:text-accent transition-colors ${isTransparent ? 'text-white' : isActive ? 'text-primary' : 'text-secondary'}`}>
              ABOUT
            </NavLink>
            <NavLink to="/contact" className={({ isActive }) => `text-sm font-medium tracking-wide hover:text-accent transition-colors ${isTransparent ? 'text-white' : isActive ? 'text-primary' : 'text-secondary'}`}>
              CONTACT
            </NavLink>
          </nav>

          {/* Brand (Center) - hidden when transparent over video */}
          <Link 
            to="/" 
            className={`absolute left-1/2 -translate-x-1/2 flex flex-col items-center group transition-opacity duration-300 ${isTransparent ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} 
            aria-label="Go to homepage"
          >
            {assets.logo ? (
              <img
                src={assets.logo}
                alt="Solo Wardrobe"
                className="h-12 sm:h-[42px] w-auto object-contain transition-all duration-300 group-hover:scale-105"
              />
            ) : (
              <span className="font-serif text-lg sm:text-xl font-bold tracking-tight">SOLO WARDROBE</span>
            )}
          </Link>

          {/* Right Controls */}
          <div className="flex items-center gap-3 sm:gap-5">
            {/* WhatsApp */}
            <a
              href="https://wa.me/919933778870"
              target="_blank"
              rel="noopener noreferrer"
              className={`hidden sm:flex items-center gap-2 text-sm font-medium hover:text-accent transition-colors ${isTransparent ? 'text-white' : 'text-secondary'}`}
            >
              <span>Chat</span>
            </a>

            {/* Search - hidden on category pages (they have their own search) */}
            {!location.pathname.startsWith('/category/') && (
              <button
                onClick={() => setShowSearch(true)}
                aria-label="Search"
                className={`p-1 transition-colors hover:text-accent ${isTransparent ? 'text-white' : 'text-primary'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}

            {/* Cart */}
            <button
              id="cart-anchor"
              onClick={() => setIsCartOpen(true)}
              aria-label="Cart"
              className="relative p-1 group"
            >
              <div className={`w-6 h-6 transition-colors group-hover:text-accent ${isTransparent ? 'text-white' : 'text-primary'}`}>
                {assets.cart_icon ? (
                  <img src={assets.cart_icon} alt="" className={`w-full h-full transition-all ${isTransparent ? 'brightness-0 invert' : ''}`} />
                ) : (
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                )}
              </div>
              {count > 0 && (
                <span className={`absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-primary rounded-full transition-transform duration-300 ${bump ? 'scale-125' : 'scale-100'}`}>
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <div className={`md:hidden absolute top-full left-0 w-full bg-white border-b border-gray-100 shadow-lg transition-all duration-300 overflow-hidden ${isMenuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
          <nav className="flex flex-col p-6 gap-4 text-center">
            <Link to="/" className="text-sm font-medium tracking-wide text-secondary hover:text-primary" onClick={() => setIsMenuOpen(false)}>HOME</Link>
            <Link to="/about" className="text-sm font-medium tracking-wide text-secondary hover:text-primary" onClick={() => setIsMenuOpen(false)}>ABOUT</Link>
            <Link to="/contact" className="text-sm font-medium tracking-wide text-secondary hover:text-primary" onClick={() => setIsMenuOpen(false)}>CONTACT</Link>
            <a href="https://wa.me/919933778870" target="_blank" rel="noopener noreferrer" className="text-sm font-medium tracking-wide text-secondary hover:text-primary">WHATSAPP CHAT</a>
          </nav>
        </div>
      </header>
    </>
  );
};

export default Navbar;
