import { createContext, useEffect, useRef, useState } from "react";
import { isJeansProduct, normalizeJeansSizes } from "../utils/size";
import { useNavigate } from "react-router-dom";

export const ShopContext = createContext();

const ShopContextProvider = (props) => {
  const currency = '₹';
  const delivery_fee = 10;
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  // Cart persisted locally so refresh doesn't clear it
  const [cartItems, setCartItems] = useState(() => {
    try {
      const raw = localStorage.getItem('cart.v1');
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  // Minimal in-app notice (replaces toastify)
  const [notice, setNotice] = useState(null);
  const noticeTimerRef = useRef(null);

  const notify = (msg) => {
    try { if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current); } catch {}
    setNotice({ id: Date.now(), msg: String(msg || '') });
    noticeTimerRef.current = setTimeout(() => setNotice(null), 2000);
  };

  // Address persisted locally
  const [address, setAddress] = useState(() => {
    try { return JSON.parse(localStorage.getItem('addr.v1') || 'null'); }
    catch { return null; }
  });
  useEffect(() => {
    try {
      if (address) localStorage.setItem('addr.v1', JSON.stringify(address));
    } catch {}
  }, [address]);

  useEffect(() => {
    const clean = (s) => (s ?? "").replace(/_/g, " ").replace(/\s+/g, " ").trim();

    const formatName = (raw) => {
      const t = clean(raw);
      if (!t) return "";
      const hasLower = /[a-z]/.test(t);
      if (hasLower) return t;
      const title = t.toLowerCase().replace(/\b([a-z])([a-z'0-9]*)/g, (_, a, b) => a.toUpperCase() + b);
      return title
        .replace(/\b(EDP|EDT|OG|ML)\b/gi, (m) => m.toUpperCase())
        .replace(/\b(Eau|De|Parfum|Pour|Homme|Femme)\b/gi, (m) => m[0].toUpperCase() + m.slice(1).toLowerCase());
    };

    const loadProducts = async () => {
      try {
        setLoadingProducts(true);
        const res = await fetch("/data/products.json", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load /data/products.json");
        const raw = await res.json();

        const mapped = Array.isArray(raw) ? raw.map((item) => {
          const images = Array.isArray(item.images)
            ? item.images.map((src) => {
                if (!src) return "";
                if (/^https?:\/\//i.test(src)) return src;
                if (src.startsWith("/data/")) return src;
                return `/data${src}`;
              })
            : [];

          const originalCategory = item.category ?? "";
          let category = originalCategory;
          const lc = String(category).toLowerCase();
          if (lc.includes("men")) category = "Men";
          else if (lc.includes("women") || lc.includes("lady")) category = "Women";
          else if (lc.includes("kid")) category = "Kids";

          // Base price markup: add 750 to all except Topwear and Shirt/T‑Shirt categories
          const basePrice = Number(item.price ?? 0) || 0;
          // Exempt if category or subCategory mentions topwear, shirt(s), or t‑shirt(s)
          const catHint = `${item?.category ?? ''} ${item?.subCategory ?? ''}`;
          const noMarkup = /(topwear|shirt|shirts|t\s?-?shirt|t\s?-?shirts)/i.test(catHint);
          const price = basePrice > 0 && !noMarkup ? basePrice + 750 : basePrice;

          const mappedItem = {
            _id: (item.slug ?? item.slug_name ?? item.title)?.toString(),
            name: formatName(item.title ?? item.slug_name ?? ""),
            price,
            mrp: Number(item.mrp ?? 0),
            image: images[0] ?? "",
            images,
            category,
            categoryRaw: originalCategory,
            subCategory: item.subCategory ?? "",
            sizes: Array.isArray(item.sizes) ? item.sizes : [],
            bestseller: Boolean(item.bestseller ?? false),
            slug: item.slug ?? "",
            detail_url_src: item.detail_url_src ?? ""
          };

          // Drop jeans products with no explicit sizes in data
          if (isJeansProduct(mappedItem) && normalizeJeansSizes(mappedItem.sizes).length === 0) {
            return null;
          }
          return mappedItem;
        }) : [];

        setProducts(mapped.filter(Boolean));
      } catch (err) {
        console.error(err);
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, []);

  // persist cart whenever it changes
  useEffect(() => {
    try { localStorage.setItem('cart.v1', JSON.stringify(cartItems)); } catch {}
  }, [cartItems]);

  const addToCart = async (itemId, size) => {
    if (!size) { notify('Select product size'); return; }
    let cartData = structuredClone(cartItems);
    if (cartData[itemId]) {
      if (cartData[itemId][size]) cartData[itemId][size] += 1;
      else cartData[itemId][size] = 1;
    } else {
      cartData[itemId] = { [size]: 1 };
    }
    setCartItems(cartData);
    notify('Added to bag');
  }

  const updateQuantity = async (itemId, size, quantity) => {
    let cartData = structuredClone(cartItems);
    if (!cartData[itemId]) cartData[itemId] = {};
    if (quantity <= 0) {
      delete cartData[itemId][size];
      // clean empty product entry
      if (Object.keys(cartData[itemId]).length === 0) delete cartData[itemId];
    } else {
      cartData[itemId][size] = quantity;
    }
    setCartItems(cartData);
    if (quantity === 0) notify('Removed from bag');
  }

  const getCartCount = () => {
    let totalCount = 0;
    for (const items in cartItems) {
      for (const item in cartItems[items]) {
        try {
          if (cartItems[items][item] > 0) totalCount += cartItems[items][item];
        } catch {}
      }
    }
    return totalCount;
  }

  const getCartAmount = () => {
    let totalAmount = 0;
    for (const items in cartItems) {
      const itemInfo = products.find((product) => product._id === items || product.slug === items);
      for (const item in cartItems[items]) {
        try {
          if (cartItems[items][item] > 0 && itemInfo) {
            totalAmount += (Number(itemInfo.price) || 0) * cartItems[items][item];
          }
        } catch {}
      }
    }
    return totalAmount;
  }

  const value = {
    currency, delivery_fee,
    products, loadingProducts,
    navigate,
    notice, notify,
    address, setAddress,
    search, setSearch,
    showSearch, setShowSearch,
    addToCart, updateQuantity,
    cartItems,
    getCartCount, getCartAmount
  }

  return (
    <ShopContext.Provider value={value}>
      {props.children}
    </ShopContext.Provider>
  )
}

export default ShopContextProvider;
