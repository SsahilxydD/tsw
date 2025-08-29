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
    return Array.from(map.values()).sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );
  }, [products]);

  const isLoading = Boolean(loadingProducts);
  const showSkeletons = isLoading && categories.length === 0;

  // ---- 3-col (mobile/tablet) remainder logic ----
  const rem3 = categories.length % 3;
  const main3Count = rem3 === 0 ? categories.length : categories.length - rem3;
  const main3 = categories.slice(0, main3Count);
  const tail3 = categories.slice(main3Count); // 0/1/2 items

  // ---- 5-col (desktop lg+) remainder logic ----
  const rem5 = categories.length % 5;
  const main5Count = rem5 === 0 ? categories.length : categories.length - rem5;
  const main5 = categories.slice(0, main5Count);
  const tail5 = categories.slice(main5Count); // 0..4 items

  return (
    <section className="my-10">
      <div className="text-center py-8">
        <Title text1="SHOP BY" text2="CATEGORY" />
      </div>

      {/* ===== Mobile/Tablet: 3 per row, center the last row ===== */}
      <div className="lg:hidden">
        <div className="grid grid-cols-3 gap-4">
          {showSkeletons ? (
            <>
              <CategorySkeleton />
              <CategorySkeleton />
              <CategorySkeleton />
            </>
          ) : (
            <>
              {/* Full rows */}
              {main3.map(({ name, count, image }) => (
                <CategoryCard key={name} name={name} count={count} image={image} />
              ))}

              {/* Centered last row (1–2 items) */}
              {rem3 !== 0 && (
                <div className="col-span-3">
                  <div className="flex justify-center gap-4">
                    {tail3.map(({ name, count, image }) => (
                      <div key={name} className="w-full max-w-[360px] min-w-[140px]">
                        <CategoryCard name={name} count={count} image={image} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ===== Desktop (lg+): 5 per row, center the last row ===== */}
      <div className="hidden lg:block">
        <div className="grid grid-cols-5 gap-4">
          {showSkeletons ? (
            <>
              <CategorySkeleton />
              <CategorySkeleton />
              <CategorySkeleton />
              <CategorySkeleton />
              <CategorySkeleton />
            </>
          ) : (
            <>
              {/* Full rows */}
              {main5.map(({ name, count, image }) => (
                <CategoryCard key={name} name={name} count={count} image={image} />
              ))}

              {/* Centered last row (1–4 items) */}
              {rem5 !== 0 && (
                <div className="col-span-5">
                  <div className="flex justify-center gap-4">
                    {tail5.map(({ name, count, image }) => (
                      <div key={name} className="w-full max-w-[360px] min-w-[140px]">
                        <CategoryCard name={name} count={count} image={image} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default Categories;
