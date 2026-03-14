// src/components/FilterSidebar.jsx
import React, { useState, useMemo } from 'react';
import SizeChips from './SizeChips';

const FilterSection = ({ title, sectionKey, children, count = null, expandedSections, toggleSection }) => {
  const isExpanded = expandedSections[sectionKey];
  const hasCount = count !== null && count > 0;

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        type="button"
        onClick={() => toggleSection(sectionKey)}
        className="w-full flex items-center justify-between py-4 text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
        aria-expanded={isExpanded}
        aria-controls={`filter-section-${sectionKey}`}
      >
        <span className="text-sm font-medium text-gray-900">
          {title}
          {hasCount && (
            <span className="ml-2 text-xs text-gray-500">({count})</span>
          )}
        </span>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div id={`filter-section-${sectionKey}`} className="pb-4">
          {children}
        </div>
      )}
    </div>
  );
};

/**
 * FilterSidebar Component
 * Provides comprehensive filtering options for products
 * 
 * @param {Object} props
 * @param {Array} props.products - All products to filter from
 * @param {Object} props.filters - Current filter state
 * @param {Function} props.onFiltersChange - Callback when filters change
 * @param {Array} props.availableSizes - Available sizes for size filter
 * @param {Function} props.normalizeSizesForProduct - Function to normalize sizes for a product
 */
const FilterSidebar = ({
  products = [],
  filters = {},
  onFiltersChange,
  availableSizes = [],
  normalizeSizesForProduct
}) => {
  const [expandedSections, setExpandedSections] = useState({
    price: true,
    size: true,
    brand: true,
    category: true,
    color: true
  });

  // Calculate available filter options from products
  const filterOptions = useMemo(() => {
    const brands = new Set();
    const categories = new Set();
    const colors = new Set();
    let minPrice = Infinity;
    let maxPrice = 0;

    products.forEach(product => {
      // Brands
      if (product.brand) {
        brands.add(String(product.brand).trim());
      }

      // Categories
      const category = product.category || product.categoryRaw;
      if (category) {
        categories.add(String(category).trim());
      }

      // Colors (if product has color field)
      if (product.color) {
        const colorValue = Array.isArray(product.color) 
          ? product.color[0] 
          : product.color;
        if (colorValue) {
          colors.add(String(colorValue).trim());
        }
      }

      // Price range
      const price = Number(product.price) || 0;
      if (price > 0) {
        minPrice = Math.min(minPrice, price);
        maxPrice = Math.max(maxPrice, price);
      }
    });

    return {
      brands: Array.from(brands).sort(),
      categories: Array.from(categories).sort(),
      colors: Array.from(colors).sort(),
      priceRange: {
        min: minPrice === Infinity ? 0 : Math.floor(minPrice),
        max: maxPrice === 0 ? 10000 : Math.ceil(maxPrice)
      }
    };
  }, [products]);

  // Initialize price range from filterOptions if not set
  const priceRange = filters.priceRange || {
    min: filterOptions.priceRange.min,
    max: filterOptions.priceRange.max
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handlePriceChange = (type, value) => {
    const newRange = {
      ...priceRange,
      [type]: Math.max(filterOptions.priceRange.min, Math.min(filterOptions.priceRange.max, Number(value)))
    };
    
    // Ensure min <= max
    if (type === 'min' && newRange.min > newRange.max) {
      newRange.max = newRange.min;
    } else if (type === 'max' && newRange.max < newRange.min) {
      newRange.min = newRange.max;
    }

    onFiltersChange({
      ...filters,
      priceRange: newRange
    });
  };

  const handleSizeToggle = (size) => {
    const currentSizes = filters.sizes || [];
    const newSizes = currentSizes.includes(size)
      ? currentSizes.filter(s => s !== size)
      : [...currentSizes, size];
    
    onFiltersChange({
      ...filters,
      sizes: newSizes
    });
  };

  const handleBrandToggle = (brand) => {
    const currentBrands = filters.brands || [];
    const newBrands = currentBrands.includes(brand)
      ? currentBrands.filter(b => b !== brand)
      : [...currentBrands, brand];
    
    onFiltersChange({
      ...filters,
      brands: newBrands
    });
  };

  const handleCategoryToggle = (category) => {
    const currentCategories = filters.categories || [];
    const newCategories = currentCategories.includes(category)
      ? currentCategories.filter(c => c !== category)
      : [...currentCategories, category];
    
    onFiltersChange({
      ...filters,
      categories: newCategories
    });
  };

  const handleColorToggle = (color) => {
    const currentColors = filters.colors || [];
    const newColors = currentColors.includes(color)
      ? currentColors.filter(c => c !== color)
      : [...currentColors, color];
    
    onFiltersChange({
      ...filters,
      colors: newColors
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      priceRange: {
        min: filterOptions.priceRange.min,
        max: filterOptions.priceRange.max
      },
      sizes: [],
      brands: [],
      categories: [],
      colors: []
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.sizes && filters.sizes.length > 0) count += filters.sizes.length;
    if (filters.brands && filters.brands.length > 0) count += filters.brands.length;
    if (filters.categories && filters.categories.length > 0) count += filters.categories.length;
    if (filters.colors && filters.colors.length > 0) count += filters.colors.length;
    if (priceRange.min !== filterOptions.priceRange.min || priceRange.max !== filterOptions.priceRange.max) count += 1;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <aside className="min-w-60">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">FILTERS</h2>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-sm text-gray-600 hover:text-black underline focus:outline-none focus:ring-2 focus:ring-primary rounded"
            aria-label={`Clear all ${activeFilterCount} active filters`}
          >
            Clear All ({activeFilterCount})
          </button>
        )}
      </div>

      <div className="border border-gray-300 bg-white">
        {/* Price Range */}
        <FilterSection title="PRICE" sectionKey="price" expandedSections={expandedSections} toggleSection={toggleSection}>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={filterOptions.priceRange.min}
                max={filterOptions.priceRange.max}
                value={priceRange.min}
                onChange={(e) => handlePriceChange('min', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Minimum price"
              />
              <span className="text-gray-500">-</span>
              <input
                type="number"
                min={filterOptions.priceRange.min}
                max={filterOptions.priceRange.max}
                value={priceRange.max}
                onChange={(e) => handlePriceChange('max', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Maximum price"
              />
            </div>
            <div className="text-xs text-gray-500">
              Range: ₹{filterOptions.priceRange.min.toLocaleString()} - ₹{filterOptions.priceRange.max.toLocaleString()}
            </div>
          </div>
        </FilterSection>

        {/* Size Filter */}
        {availableSizes.length > 0 && (
          <FilterSection
            title="SIZE"
            sectionKey="size"
            count={filters.sizes?.length || 0}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
          >
            <SizeChips
              sizes={availableSizes}
              selected={filters.sizes || []}
              onToggle={handleSizeToggle}
              columns={3}
            />
          </FilterSection>
        )}

        {/* Brand Filter */}
        {filterOptions.brands.length > 0 && (
          <FilterSection
            title="BRAND"
            sectionKey="brand"
            count={filters.brands?.length || 0}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
          >
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filterOptions.brands.map((brand) => {
                const isSelected = filters.brands?.includes(brand) || false;
                return (
                  <label
                    key={brand}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded min-h-[44px] sm:min-h-0"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleBrandToggle(brand)}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2"
                      aria-label={`Filter by brand ${brand}`}
                    />
                    <span className="text-sm text-gray-700 flex-1">{brand}</span>
                  </label>
                );
              })}
            </div>
          </FilterSection>
        )}

        {/* Category Filter */}
        {filterOptions.categories.length > 0 && (
          <FilterSection
            title="CATEGORY"
            sectionKey="category"
            count={filters.categories?.length || 0}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
          >
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filterOptions.categories.map((category) => {
                const isSelected = filters.categories?.includes(category) || false;
                const displayName = String(category).replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                return (
                  <label
                    key={category}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded min-h-[44px] sm:min-h-0"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleCategoryToggle(category)}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2"
                      aria-label={`Filter by category ${displayName}`}
                    />
                    <span className="text-sm text-gray-700 flex-1">{displayName}</span>
                  </label>
                );
              })}
            </div>
          </FilterSection>
        )}

        {/* Color Filter */}
        {filterOptions.colors.length > 0 && (
          <FilterSection
            title="COLOR"
            sectionKey="color"
            count={filters.colors?.length || 0}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
          >
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filterOptions.colors.map((color) => {
                const isSelected = filters.colors?.includes(color) || false;
                return (
                  <label
                    key={color}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded min-h-[44px] sm:min-h-0"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleColorToggle(color)}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2"
                      aria-label={`Filter by color ${color}`}
                    />
                    <span className="text-sm text-gray-700 flex-1 capitalize">{color}</span>
                  </label>
                );
              })}
            </div>
          </FilterSection>
        )}
      </div>
    </aside>
  );
};

export default FilterSidebar;
