// src/pages/Product.jsx

            </p>
          ) : (
            <p className="mt-2 text-xl font-semibold">
              {currency}
              {Number(product.price).toLocaleString()}
            </p>
          )}

          {/* Sizes (always show full list; strike-out unavailable) */}
          {masterSizes.length > 0 && (
            <div className="mt-5">
              <p className="text-sm font-medium mb-2">Select Size</p>
              {/* Single-line, horizontally scrollable size boxes (adjoined) */}
              <div className="flex overflow-x-auto whitespace-nowrap">
                {masterSizes.map((sz, i) => {
                  const SZ = norm(sz);
                  const available = availableSet.size === 0 ? true : availableSet.has(SZ);
                  const active = selectedSize === SZ;
                  const label = SZ.replace(/^UK-/, "");
                  const lastIdx = masterSizes.length - 1;
                  const roundClass = i === 0
                    ? "rounded-l-sm"
                    : (i === lastIdx ? "rounded-r-sm" : "rounded-none");
                  return (
                    <button
                      key={SZ}
                      type="button"
                      onClick={() => available && setSelectedSize(SZ)}
                      disabled={!available}
                      className={`h-9 w-9 text-xs border grid place-content-center shrink-0 ${roundClass} ${i>0? 'ml-[-1px]': ''}
                        ${active ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50"}
                        ${!available ? "line-through opacity-40 cursor-not-allowed bg-gray-100 hover:bg-gray-100" : ""}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {requiresSize && !selectedSize && (
                <p className="text-xs text-amber-600 mt-2">
                  Please select a size before ordering.
                </p>
              )}
            </div>
          )}

          

          {/* CTA (replica style) */}
          <div className="mt-6 space-y-3">
            {/* Add to cart: flat rectangle with thin black border */}
            <button
              onClick={handleAdd}
              disabled={!canSubmit}
              className={`w-full h-14 px-5 rounded-none border border-black bg-white text-black font-semibold pressable flex items-center justify-center text-[15px] sm:text-base tracking-wide
                ${!canSubmit ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {blocked ? 'Unavailable' : (added ? 'Added to cart' : 'Add to cart')}
            </button>

            {/* Buy Now: flat solid rectangle (no radius) */}
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => {
                if (!canSubmit) return;
                const sizeToSend = hasSizes ? selectedSize : 'std';
                const pid = String(product._id ?? product.slug);
                addToCart(pid, sizeToSend);
                navigate('/address');
              }}
              className={`w-full h-14 px-5 rounded-none text-white bg-black flex items-center justify-center pressable active:scale-[0.99]
                ${!canSubmit ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-95'}`}
              <span className="text-[15px] sm:text-base font-semibold tracking-wide">Buy Now</span></button>
          </div>

          {/* Meta */}
          <div className="mt-6 space-y-1 text-sm text-gray-600">
            {product.category && (
              <p>
                Category:{" "}
                <span className="capitalize">
                  {String(product.category).replaceAll("-", " ")}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Related products */}
      <div className="mt-12">
        <div className="flex items-end justify-center mb-4">
          <Title text1="RELATED" text2="PRODUCTS" />
          <Link
            to={product.category ? `/category/${String(product.category).toLowerCase()}` : "/collection"}
            className="text-xs sm:text-sm text-gray-500 hover:text-gray-700"
          >
            View all
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 gap-y-6">
          {related.map((item, index) => (
            <ProductItem
              key={String(item._id ?? item.slug)}
              id={String(item._id ?? item.slug)}
              image={
                Array.isArray(item.image)
                  ? item.image[0]
                  : (Array.isArray(item.images) ? item.images[0] : item.image)
              }
              name={item.name || item.title}
              price={item.price}
              i={index}
            />
          ))}
        </div>
      </div>
    </div>
  );
}





