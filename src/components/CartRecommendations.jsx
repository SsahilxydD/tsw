import React, { useContext, useMemo } from "react";
import Title from "./Title";
import { ShopContext } from "../context/ShopContext";
import ProductItem from "./ProductItem";

function tokens(str) {
  if (!str) return [];
  const STOP = new Set([
    "the","and","for","with","from","mens","men","womens","women","unisex","new",
    "edition","original","premium","classic","black","white","green","blue","red",
    "size","ml","edp","edt","eau","de","parfum","perfume","shirt","tshirt","t","tee",
    "polo","topwear","footwear","shoes","sneaker","watch","watches","brand"
  ]);
  return String(str)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(w => w.length >= 3 && !STOP.has(w));
}

export default function CartRecommendations() {
  const { products, cartItems } = useContext(ShopContext);

  const list = useMemo(() => {
    if (!Array.isArray(products)) return [];

    // Gather cart ids and derive dominant category + keywords
    const inBag = new Set();
    const catCount = new Map();
    const bagTokens = new Set();

    for (const id in (cartItems || {})) {
      inBag.add(String(id));
      const p = products.find(pr => String(pr._id) === String(id) || String(pr.slug) === String(id));
      if (p) {
        const cat = (p.categoryRaw || p.category || '').toLowerCase();
        if (cat) catCount.set(cat, (catCount.get(cat) || 0) + 1);
        tokens(p.name || p.title).forEach(t => bagTokens.add(t));
      }
    }

    const dominantCat = Array.from(catCount.entries()).sort((a,b)=>b[1]-a[1])[0]?.[0] || '';

    const notInBag = (p) => !inBag.has(String(p._id ?? p.slug));
    const sameCat = products.filter(p => notInBag(p) && ((p.categoryRaw || p.category || '').toLowerCase() === dominantCat));
    const relatedSameCat = sameCat.filter(p => {
      const pt = tokens(p.name || p.title);
      return pt.some(t => bagTokens.has(t));
    });

    // Simple shuffle
    const shuffle = (arr) => arr.map(v=>[Math.random(),v]).sort((a,b)=>a[0]-b[0]).map(([_,v])=>v);
    const pick = (arr, n) => shuffle(arr).slice(0, n);

    const firstThree = pick(relatedSameCat.length ? relatedSameCat : sameCat, 3);
    const pickedIds = new Set(firstThree.map(p => String(p._id ?? p.slug)));
    const pool = products.filter(p => notInBag(p) && !pickedIds.has(String(p._id ?? p.slug)));
    const nextThree = pick(pool, 3);

    let out = [...firstThree, ...nextThree];
    // Fill if less than 6
    if (out.length < 6) {
      const more = pick(products.filter(p => notInBag(p) && !new Set(out.map(x=>String(x._id ?? x.slug))).has(String(p._id ?? p.slug))), 6 - out.length);
      out = [...out, ...more];
    }

    return out.slice(0,6);
  }, [products, cartItems]);

  if (list.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <Title text1={"YOU MAY ALSO"} text2={"LIKE"} />
      </div>
      <div className="mt-4 grid grid-cols-3 lg:grid-cols-5 gap-4 gap-y-6">
        {list.map((item, index) => (
          <ProductItem
            key={item._id || item.slug || index}
            id={String(item._id ?? item.slug)}
            image={Array.isArray(item.image) ? item.image[0] : (Array.isArray(item.images) ? item.images[0] : item.image)}
            name={item.name}
            price={item.price}
            variant="recommendation"
          />
        ))}
      </div>
    </section>
  );
}
