import React, { useContext, useEffect, useMemo } from "react";
import CartSteps from "../components/CartSteps";
import { ShopContext } from "../context/ShopContext";
import CartTotal from "../components/CartTotal";
import { slugify, slugCategory } from "../utils/slug";

export default function Payment() {
  const { products, currency, cartItems, address, navigate, getCartCount } = useContext(ShopContext);

  const cartList = useMemo(() => {
    const out = [];
    for (const id in cartItems) {
      for (const size in cartItems[id]) {
        const qty = cartItems[id][size];
        if (qty > 0) out.push({ _id: id, size, quantity: qty });
      }
    }
    return out;
  }, [cartItems]);

  // Guard: redirect if no items
  useEffect(() => {
    if (getCartCount && getCartCount() === 0) navigate('/cart');
  }, [getCartCount, navigate]);

  const composeMessage = () => {
    const lines = [];
    lines.push("New order request");
    lines.push("");
    lines.push("*Items:*");
    for (const it of cartList) {
      const p = products.find((pr) => String(pr._id) === String(it._id) || String(pr.slug) === String(it._id));
      if (!p) continue;\n      const catSlug = p?.catSlug || slugCategory(p?.category || '');\n      const prodSlug = p?.productSlug || slugify(p?.name || p?.title || pid);\n      const prodSlug = p?.productSlug || slugify(p?.name || p?.title || pid);
      const catSlug = p?.catSlug || slugCategory(p?.category || '');
      const prodSlug = p?.productSlug || slugify(p?.name || p?.title || pid);