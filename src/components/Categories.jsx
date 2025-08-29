import React, { useContext, useMemo } from "react";
import Title from "./Title";
import CategoryCard from "./CategoryCard";
import CategorySkeleton from "./CategorySkeleton";
import { ShopContext } from "../context/ShopContext";

const Categories = () => {
  const { products, loadingProducts } = useContext(ShopContext);

  // Derive categories from products (first image + count)
  const categories = useMemo(() => {
    const map = new Map();
    if (Array.isArray(products)) {
      for (const p of products) {
        const key = p.categoryRaw || p.category || "Misc";
        const img = Array.isArray(p.image) ? p.image[0] : p.image;
        if (!map.has(key)) {
          map.set(key, { name: key, count: 1, image: img || "" });
        } else {
          map.get(key).count += 1;
        }
      }
    }
    // sort A→Z for stable order
    return Array.from(map.values()).sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );
  }, [products]);

  const isLoading = Boolean(loadingProducts);
  const showSkeletons = isLoading && categories.length === 0;

  return (
    <section className="my-10">
      <div className="text-center py-8">
        <Title text1="SHOP BY" text2="CATEGORY" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {showSkeletons ? (
          <>
            <CategorySkeleton /><CategorySkeleton /><CategorySkeleton />
            <CategorySkeleton /><CategorySkeleton />
          </>
        ) : (
          categories.map(({ name, count, image }) => (
            <CategoryCard key={name} name={name} count={count} image={image} />
          ))
        )}
      </div>
    </section>
  );
};

export default Categories;
