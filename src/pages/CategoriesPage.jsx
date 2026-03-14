import React from "react";
import Categories from "../components/Categories";
import SEO from "../components/SEO";

const CategoriesPage = () => {
  return (
    <div>
      <SEO
        title="Shop by Category – Solo Wardrobe"
        description="Browse all categories at Solo Wardrobe. Find apparel, accessories, footwear, and more."
      />
      <Categories />
    </div>
  );
};

export default CategoriesPage;
