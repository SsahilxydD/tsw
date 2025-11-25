import React, { useContext, useEffect, useRef, useState } from "react";
import { Link, useLocation, NavLink } from "react-router-dom";
import { assets } from "../assets/assets";
import { ShopContext } from "../context/ShopContext";
import AnnouncementBar from "./AnnouncementBar";

const Navbar = () => {
  const { getCartCount, setIsCartOpen } = useContext(ShopContext);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Scroll detection
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  return (
    <>
      {showAnnouncement && <AnnouncementBar />}
      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${scrolled || isMenuOpen ? "bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm" : "bg-transparent border-b border-transparent"
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-24 sm:h-20 flex items-center justify-between overflow-hidden">

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 -ml-2 text-primary"
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
            <NavLink to="/" className={({ isActive }) => `text-sm font-medium tracking-wide hover:text-accent transition-colors ${isActive ? 'text-primary' : 'text-secondary'}`}>
              HOME
            </NavLink>
            <NavLink to="/about" className={({ isActive }) => `text-sm font-medium tracking-wide hover:text-accent transition-colors ${isActive ? 'text-primary' : 'text-secondary'}`}>
              ABOUT
            </NavLink>
            <NavLink to="/contact" className={({ isActive }) => `text-sm font-medium tracking-wide hover:text-accent transition-colors ${isActive ? 'text-primary' : 'text-secondary'}`}>
              CONTACT
            </NavLink>
          </nav>

          {/* Brand (Center) */}
          <Link to="/" className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center group" aria-label="Go to homepage">
            {assets.logo ? (
              <img
                src={assets.logo}
                alt="Solo Wardrobe"
                className="h-24 sm:h-[60px] w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight">SOLO WARDROBE</span>
            )}
          </Link>

          {/* Right Controls */}
          <div className="flex items-center gap-4 sm:gap-6">
            {/* WhatsApp */}
            <a
              href="https://wa.me/919933778870"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 text-sm font-medium text-secondary hover:text-accent transition-colors"
            >
              <span>Chat</span>
            </a>

            {/* Cart */}
            <button
              id="cart-anchor"
              onClick={() => setIsCartOpen(true)}
              aria-label="Cart"
              className="relative p-1 group"
            >
              <div className="w-6 h-6 text-primary transition-colors group-hover:text-accent">
                {assets.cart_icon ? (
                  <img src={assets.cart_icon} alt="" className="w-full h-full" />
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
