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
  // Keep last-row tiles the same width as grid columns, but spread them evenly across the row.
  const GAP_PX = 16; // matches tailwind gap-4
  const COL_W3 = `calc((100% - ${(3 - 1) * GAP_PX}px) / 3)`;

  // ---- 5-col (desktop lg+) remainder logic ----
  const rem5 = categories.length % 5;
  const main5Count = rem5 === 0 ? categories.length : categories.length - rem5;
  const main5 = categories.slice(0, main5Count);
  const tail5 = categories.slice(main5Count); // 0..4 items
  // Even distribution with identical widths as the main grid
  const COL_W5 = `calc((100% - ${(5 - 1) * GAP_PX}px) / 5)`;

  return (
    <section className="mt-3 mb-10">
      <div className="text-center pt-2 pb-8">
        <Title text1="SHOP BY" text2="CATEGORY" />
      </div>

      {/* ===== Mobile/Tablet: 3 per row, center the last row ===== */}
      <div className="lg:hidden">
        <div className="max-w-6xl mx-auto px-4">
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
              {main3.map(({ name, count, image }, idx) => (
                <CategoryCard key={name} name={name} count={count} image={image} i={idx} />
              ))}

              {/* Centered last row (1–2 items) */}
              {rem3 !== 0 && (
                <div className="col-span-3">
                  <div className="flex justify-evenly">
                    {tail3.map(({ name, count, image }, idx) => (
                      <div key={name} className="shrink-0" style={{ width: COL_W3 }}>
                        <CategoryCard name={name} count={count} image={image} i={main3.length + idx} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          </div>
        </div>
      </div>

      {/* ===== Desktop (lg+): 5 per row, center the last row ===== */}
      <div className="hidden lg:block">
        <div className="max-w-6xl mx-auto px-4">
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
              {main5.map(({ name, count, image }, idx) => (
                <CategoryCard key={name} name={name} count={count} image={image} i={idx} />
              ))}

              {/* Centered last row (1–4 items) */}
              {rem5 !== 0 && (
                <div className="col-span-5">
                  <div className="flex justify-evenly">
                    {tail5.map(({ name, count, image }, idx) => (
                      <div key={name} className="shrink-0" style={{ width: COL_W5 }}>
                        <CategoryCard name={name} count={count} image={image} i={main5.length + idx} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Categories;
