import React, { useContext, useMemo } from "react";
import Title from "./Title";
import { ShopContext } from "../context/ShopContext";
import ProductItem from "./ProductItem";

export default function CartRecommendations() {
  const { products } = useContext(ShopContext);
  const list = useMemo(() => {
    if (!Array.isArray(products)) return [];
    // Simple pick: top 6 recent or first 6; a real impl could be smarter
    return products.slice(0, 6);
  }, [products]);

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
          />
        ))}
      </div>
    </section>
  );
}
