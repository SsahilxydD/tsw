import React, { useContext, useEffect, useRef, useState } from "react";
import { Link, useLocation, NavLink } from "react-router-dom";
import { assets } from "../assets/assets";
import { ShopContext } from "../context/ShopContext";
import AnnouncementBar from "./AnnouncementBar";
import SafeImg from "./SafeImg";

const Navbar = () => {
  const { getCartCount, setIsCartOpen, isCartOpen, setShowSearch, getWishlistCount, navigate } = useContext(ShopContext);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const heroHeightRef = useRef(0);

  const isHome = location.pathname === "/";

  // Cache hero height (avoid using window.innerHeight on every scroll; mobile toolbars can change it)
  useEffect(() => {
    if (!isHome) {
      heroHeightRef.current = 0;
      setScrolled(true);
      return;
    }

    const heroEl = document.querySelector("[data-hero]");
    const updateHeroHeight = () => {
      heroHeightRef.current = heroEl?.offsetHeight || Math.round(window.innerHeight * 0.85);
    };

    updateHeroHeight();

    let ro;
    if (heroEl && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(updateHeroHeight);
      ro.observe(heroEl);
    }

    window.addEventListener("resize", updateHeroHeight, { passive: true });
    return () => {
      window.removeEventListener("resize", updateHeroHeight);
      ro?.disconnect?.();
    };
  }, [isHome]);

  // Scroll detection - use cached hero height on home page
  useEffect(() => {
    if (!isHome) return;

    const onScroll = () => {
      const heroHeight = heroHeightRef.current || Math.round(window.innerHeight * 0.85);
      setScrolled(window.scrollY > heroHeight - 80);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  const count = getCartCount();
  const wishlistCount = getWishlistCount();
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

  // Transparent mode: on home page, not scrolled
  const isTransparent = isHome && !scrolled;

  return (
    <>
      {showAnnouncement && <AnnouncementBar isTransparent={isTransparent} />}
      <header
        className={`fixed left-0 right-0 z-40 transition-all duration-300 ${showAnnouncement ? "top-9" : "top-0"} ${
          isTransparent
            ? "bg-transparent border-b border-transparent"
            : "bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-14 flex items-center justify-between overflow-hidden">

          {/* Mobile spacer (menu moved to bottom dock) */}
          <div className="md:hidden w-6" />

          {/* Desktop Nav (Left) */}
          <nav className="hidden md:flex items-center gap-8" role="navigation" aria-label="Main navigation">
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
              <SafeImg
                src={assets.logo}
                alt="Solo Wardrobe"
                className="h-12 sm:h-[42px] w-auto object-contain transition-all duration-300 group-hover:scale-105"
                width={48}
                height={48}
                quality={90}
              />
            ) : (
              <span className="font-serif text-lg sm:text-xl font-bold tracking-tight">SOLO WARDROBE</span>
            )}
          </Link>

          {/* Right Controls */}
          <div className="flex items-center gap-3 sm:gap-5">
            {/* WhatsApp */}
            <a
              href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_PHONE?.replace(/\D/g, '') || '919933778870'}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`hidden sm:flex items-center gap-2 text-sm font-medium hover:text-accent transition-colors min-h-[44px] sm:min-h-0 ${isTransparent ? 'text-white' : 'text-secondary'}`}
            >
              <span>Chat</span>
            </a>

            {/* Search - desktop only (mobile uses bottom dock) */}
            {!location.pathname.startsWith('/category/') && location.pathname !== '/collection' && (
              <button
                onClick={() => setShowSearch(true)}
                aria-label="Search"
                className={`hidden sm:flex p-1 transition-colors hover:text-accent items-center justify-center ${isTransparent ? 'text-white' : 'text-primary'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}

            {/* Wishlist - desktop only (mobile uses bottom dock) */}
            <button
              onClick={() => navigate('/wishlist')}
              aria-label={`Wishlist, ${wishlistCount > 0 ? `${wishlistCount} item${wishlistCount !== 1 ? 's' : ''}` : 'empty'}`}
              className={`hidden sm:flex relative p-1 group items-center justify-center ${isTransparent ? 'text-white' : 'text-primary'}`}
            >
              <svg className="w-6 h-6 transition-colors group-hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {wishlistCount > 0 && (
                <span className={`absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-red-500 rounded-full transition-transform duration-300`} aria-hidden="true">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Cart */}
            <button
              id="cart-anchor"
              onClick={() => setIsCartOpen(true)}
              aria-label={`Cart, ${count > 0 ? `${count} item${count !== 1 ? 's' : ''} in cart` : 'empty'}`}
              aria-expanded={isCartOpen}
              className="relative p-2 sm:p-1 group min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
            >
              <div className={`w-6 h-6 transition-colors group-hover:text-accent ${isTransparent ? 'text-white' : 'text-primary'}`}>
                {assets.cart_icon ? (
                  <SafeImg src={assets.cart_icon} alt="" className={`w-full h-full transition-all ${isTransparent ? 'brightness-0 invert' : ''}`} width={24} height={24} quality={90} aria-hidden="true" />
                ) : (
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                )}
              </div>
              {count > 0 && (
                <span className={`absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-primary rounded-full transition-transform duration-300 ${bump ? 'scale-125' : 'scale-100'}`} aria-hidden="true">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>

      </header>
    </>
  );
};

export default Navbar;
