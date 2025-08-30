// src/components/ProductItem.jsx
import React, { useContext, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ShopContext } from "../context/ShopContext";
import useInView from "../hooks/useInView";
import SafeImg from "./SafeImg";
import { isFootwearProduct, toUKLabel, uniqueUKLabels } from "../utils/size";

// variant: "default" | "recommendation"
const ProductItem = ({ id, image, name, price, variant = "default", i, showAdd = false, sizeHint, requireSize = false, disableFly = false }) => {
  const { currency, addToCart, updateQuantity, products, cartItems } = useContext(ShopContext);
  const cover = Array.isArray(image) ? (image[0] || "") : (image || "");
  const preloadedRef = useRef(false);
  const [ref, inView] = useInView({ once: true });
  const isAdded = useMemo(() => {
    const pid = String(id);
    const c = (cartItems || {})[pid];
    if (!c) return false;
    for (const k in c) if (c[k] > 0) return true;
    return false;
  }, [cartItems, id]);

  const preload = () => {
    if (preloadedRef.current || !cover) return;
    const img = new Image();
    img.src = cover;
    preloadedRef.current = true;
  };

  const imgHeights = variant === "recommendation"
    ? "h-40 sm:h-44 md:h-52"
    : "h-48 sm:h-56 md:h-64";

  const nameStyle = variant === "recommendation"
    ? {
        display: "-webkit-box",
        WebkitLineClamp: 1,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        lineHeight: "1.25rem",
        height: "1.25rem",
      }
    : {
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        lineHeight: "1.25rem",
        height: "calc(2 * 1.25rem + 4px)",
        paddingBottom: "2px",
      };

  // size picker state (used when requireSize=true)
  const [picking, setPicking] = React.useState(false);
  const [sizesForPick, setSizesForPick] = React.useState([]);
  const firstPickRef = React.useRef(null);

  // lock scroll + ESC to close while picking
  React.useEffect(() => {
    if (!picking) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') setPicking(false); };
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => { try { firstPickRef.current?.focus(); } catch {} }, 0);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
      clearTimeout(t);
    };
  }, [picking]);

  const renderSizePicker = picking && sizesForPick.length > 0
    ? createPortal(
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Choose a size">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/40"
            onClick={() => setPicking(false)}
          />
          <div className="relative z-10 mx-auto w-[92vw] max-w-md top-1/2 -translate-y-1/2 bg-white rounded-lg border shadow-lg p-4 animate-pop">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Select size</h3>
              <button type="button" className="h-8 w-8 grid place-content-center rounded hover:bg-gray-100" onClick={() => setPicking(false)} aria-label="Close">×</button>
            </div>
            <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-[50vh] overflow-y-auto pr-1">
              {sizesForPick.map((sz, i) => (
                <button
                  key={String(sz)}
                  ref={i === 0 ? firstPickRef : null}
                  type="button"
                  className="px-3 py-2 text-sm border rounded hover:bg-gray-50 whitespace-nowrap min-w-[56px]"
                  onClick={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    const pid = String(id);
                    addToCart(pid, String(sz));
                    setPicking(false);
                  }}
                >
                  {String(sz)}
                </button>
              ))}
            </div>
            <div className="mt-3 text-right">
              <button type="button" className="px-3 py-2 border rounded text-sm" onClick={() => setPicking(false)}>Cancel</button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
    <Link
      ref={ref}
      to={`/product/${id}`}
      title={name}
      aria-label={name}
      onMouseEnter={preload}
      onTouchStart={preload}
      style={{ WebkitTapHighlightColor: "transparent" }}
      className={`text-gray-700 group block rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 transition-transform active:scale-[0.98] hover:shadow-sm hover-lift reveal-item ${inView ? 'in' : ''}`}
      style={inView ? { transitionDelay: `${((i ?? 0) % 10) * 70}ms` } : undefined}
    >
      <div className={`relative w-full overflow-hidden rounded-md bg-gray-100 ${imgHeights} select-none`}>
        <SafeImg
          src={cover}
          alt={name}
          sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
          width={1200}
          height={1200}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300
                     group-hover:scale-105 motion-reduce:transform-none"
        />
        {showAdd && (
          <button
            type="button"
            aria-label="Add to bag"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              try {
                const pid = String(id);
                const p = (products || []).find(pr => String(pr._id ?? pr.slug ?? pr.id) === pid);
                const sizes = Array.isArray(p?.sizes) ? p.sizes : [];
                const added = isAdded;
                if (added) {
                  const c = (cartItems || {})[pid] || {};
                  for (const sz of Object.keys(c)) updateQuantity(pid, sz, 0);
                } else {
                  // If size selection is required and sizes exist, open picker
                  if (requireSize && sizes.length > 0 && !sizeHint) {
                    const opts = isFootwearProduct(p) ? uniqueUKLabels(sizes) : sizes.map(String);
                    setSizesForPick(opts);
                    setPicking(true);
                    return;
                  }
                  const y = window.scrollY;
                  let chosen = sizeHint || 'std';
                  if (!sizeHint && sizes.length > 0) {
                    if (isFootwearProduct(p)) {
                      const first = toUKLabel(sizes[0]);
                      chosen = first || 'std';
                    } else {
                      chosen = String(sizes[0]);
                    }
                  }
                  addToCart(pid, chosen);
                  // Fly-to-cart animation everywhere except when disabled
                  if (!disableFly) {
                    try {
                      const root = e.currentTarget.closest('a');
                      const imgEl = root ? root.querySelector('img') : null;
                      const cartEl = document.getElementById('cart-anchor');
                      if (imgEl && cartEl) {
                        const imgRect = imgEl.getBoundingClientRect();
                        const cartRect = cartEl.getBoundingClientRect();
                        const clone = imgEl.cloneNode(true);
                        clone.style.position = 'fixed';
                        clone.style.left = imgRect.left + 'px';
                        clone.style.top = imgRect.top + 'px';
                        clone.style.width = imgRect.width + 'px';
                        clone.style.height = imgRect.height + 'px';
                        clone.style.opacity = '0.9';
                        clone.style.zIndex = '9999';
                        clone.style.borderRadius = '8px';
                        clone.style.transition = 'transform 600ms cubic-bezier(.22,.8,.24,1), opacity 600ms ease';
                        document.body.appendChild(clone);
                        const dx = cartRect.left + cartRect.width / 2 - (imgRect.left + imgRect.width / 2);
                        const dy = cartRect.top + cartRect.height / 2 - (imgRect.top + imgRect.height / 2);
                        requestAnimationFrame(() => {
                          clone.style.transform = `translate(${dx}px, ${dy}px) scale(.12)`;
                          clone.style.opacity = '0.1';
                        });
                        setTimeout(() => { try { document.body.removeChild(clone); } catch {} }, 650);
                      }
                    } catch {}
                  }
                  requestAnimationFrame(() => { try { window.scrollTo({ top: y, left: 0, behavior: 'auto' }); } catch { window.scrollTo(0, y); } });
                }
              } catch {}
            }}
            className={`absolute bottom-2 right-2 px-2.5 py-1.5 rounded text-[11px] tracking-wide shadow-sm transition-colors duration-200 pressable ${isAdded ? 'bg-white text-black border border-black' : 'bg-black/90 text-white hover:bg-black'}`}
          >
            {isAdded ? 'ADDED' : 'ADD'}
          </button>
        )}

      </div>

      {/* Name clamp */}
      <p className="mt-3 text-sm leading-5 overflow-hidden normal-case tracking-normal" style={nameStyle}>
        {name}
      </p>

      <p className="text-sm font-semibold">
        {currency}{price}
      </p>
    </Link>
    {renderSizePicker}
    </>
  );
};

export default ProductItem;
