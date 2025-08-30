import React, { useContext, useEffect, useRef, useState } from "react";
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
  const [list, setList] = useState([]);
  const usedIdsRef = useRef(new Set());
  const relatedPoolRef = useRef([]);
  const randomPoolRef = useRef([]);
  const rootRef = useRef(null);
  // Snapshot the current bag signature on mount so list stays steady while user adds from the grid
  const bagSigRef = useRef(null);

  useEffect(() => {
    if (!Array.isArray(products) || products.length === 0) return;
    const bagIds = Object.entries(cartItems || {})
      .map(([id, sizes]) => ({ id: String(id), q: Object.values(sizes || {}).reduce((s, n) => s + (n || 0), 0) }))
      .filter(x => x.q > 0)
      .map(x => x.id)
      .sort();
    const bagSig = bagIds.join(',');
    if (bagSigRef.current == null) bagSigRef.current = bagSig; // freeze for this mount

    const cacheKey = 'bag.reco.v3::' + (bagSigRef.current || 'empty');
    // Try cached list for this bag signature (stable per-session per-bag)
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const ids = JSON.parse(cached);
        const arr = ids.map(id => products.find(p => String(p._id ?? p.slug) === id)).filter(Boolean);
        if (arr.length > 0) {
          setList(arr);
          usedIdsRef.current = new Set(ids);
          // Seed pools so we can append more later
          const bagIds = Object.entries(cartItems || {})
            .map(([id, sizes]) => ({ id: String(id), q: Object.values(sizes || {}).reduce((s, n) => s + (n || 0), 0) }))
            .filter(x => x.q > 0).map(x => x.id);
          const inBag = new Set(bagIds);
          const catCount = new Map();
          const bagTokens = new Set();
          for (const id of bagIds) {
            const p = products.find(pr => String(pr._id ?? pr.slug) === String(id));
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
          relatedPoolRef.current = (relatedSameCat.length ? relatedSameCat : sameCat)
            .filter(p => !usedIdsRef.current.has(String(p._id ?? p.slug)) && notInBag(p))
            .map(p => String(p._id ?? p.slug));
          randomPoolRef.current = products
            .filter(p => !usedIdsRef.current.has(String(p._id ?? p.slug)) && notInBag(p))
            .map(p => String(p._id ?? p.slug));
          return;
        }
      }
    } catch {}

    // Build once based on the snapshotted bag
    const inBag = new Set(bagIds);
    const catCount = new Map();
    const bagTokens = new Set();
    for (const id of bagIds) {
      const p = products.find(pr => String(pr._id ?? pr.slug) === String(id));
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
    const shuffle = (arr) => arr.map(v=>[Math.random(),v]).sort((a,b)=>a[0]-b[0]).map(([_,v])=>v);
    const pick = (arr, n) => shuffle(arr).slice(0, n);
    const firstThree = pick(relatedSameCat.length ? relatedSameCat : sameCat, 3);
    const pickedIds = new Set(firstThree.map(p => String(p._id ?? p.slug)));
    const pool = products.filter(p => notInBag(p) && !pickedIds.has(String(p._id ?? p.slug)));
    const nextThree = pick(pool, 3);
    let out = [...firstThree, ...nextThree];
    if (out.length < 6) {
      const more = pick(products.filter(p => notInBag(p) && !new Set(out.map(x=>String(x._id ?? x.slug))).has(String(p._id ?? p.slug))), 6 - out.length);
      out = [...out, ...more];
    }
    out = out.slice(0,6);
    setList(out);
    usedIdsRef.current = new Set(out.map(p => String(p._id ?? p.slug)));
    // prepare remaining pools for incremental loads
    relatedPoolRef.current = (relatedSameCat.length ? relatedSameCat : sameCat)
      .filter(p => !usedIdsRef.current.has(String(p._id ?? p.slug)) && notInBag(p))
      .map(p => String(p._id ?? p.slug));
    randomPoolRef.current = products
      .filter(p => !usedIdsRef.current.has(String(p._id ?? p.slug)) && notInBag(p))
      .map(p => String(p._id ?? p.slug));
    try { sessionStorage.setItem(cacheKey, JSON.stringify(out.map(p => String(p._id ?? p.slug)))); } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  // When all currently shown items are in the bag, append 6 more (3 related, 3 random)
  useEffect(() => {
    if (!list || list.length === 0) return;
    const inBag = new Set(Object.entries(cartItems || {})
      .map(([id, sizes]) => ({ id: String(id), q: Object.values(sizes || {}).reduce((s, n) => s + (n || 0), 0) }))
      .filter(x => x.q > 0).map(x => x.id));
    const allAdded = list.every(p => inBag.has(String(p._id ?? p.slug)));
    if (!allAdded) return;

    const pickMore = (poolArr, n) => {
      const pool = [...poolArr];
      const out = [];
      while (pool.length && out.length < n) {
        const idx = Math.floor(Math.random() * pool.length);
        out.push(pool.splice(idx,1)[0]);
      }
      return [out, pool];
    };

    const [relIds, relRemain] = pickMore(relatedPoolRef.current, 3);
    const [rndIds, rndRemain] = pickMore(randomPoolRef.current.filter(id => !new Set(relIds).has(id)), 3);
    const ids = [...relIds, ...rndIds];
    // no more to add
    if (ids.length === 0) return;
    usedIdsRef.current = new Set([...Array.from(usedIdsRef.current), ...ids]);
    relatedPoolRef.current = relRemain;
    randomPoolRef.current = rndRemain.filter(id => !usedIdsRef.current.has(id));
    const anchorBefore = rootRef.current ? (rootRef.current.getBoundingClientRect().top + window.scrollY) : null;
    const moreProducts = ids
      .map(id => products.find(p => String(p._id ?? p.slug) === id))
      .filter(Boolean);
    const nextList = [...list, ...moreProducts];
    setList(nextList);
    // preserve scroll by anchoring to the block's top
    requestAnimationFrame(() => {
      if (!rootRef.current) return;
      const anchorAfter = rootRef.current.getBoundingClientRect().top + window.scrollY;
      const delta = anchorAfter - (anchorBefore ?? anchorAfter);
      window.scrollTo({ top: window.scrollY + delta, left: 0, behavior: 'auto' });
    });
    // store extended list in cache so refresh keeps them
    try { sessionStorage.setItem('bag.reco.v3::' + (bagSigRef.current || 'empty'), JSON.stringify(nextList.map(p => String(p._id ?? p.slug)))); } catch {}
  }, [cartItems, list, products]);

  if (list.length === 0) return null;

  return (
    <section ref={rootRef} className="mt-8">
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
            i={index}
            showAdd
            requireSize
            disableFly
          />
        ))}
      </div>
    </section>
  );
}
