import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';

const GlobalSearch = ({ isOpen, onClose, className = "" }) => {
  const { products, search, setSearch } = React.useContext(ShopContext);
  const navigate = useNavigate();
  const [query, setQuery] = useState(search);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);

  // Close search on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Search results with fuzzy matching
  const searchResults = useMemo(() => {
    if (!query.trim() || !Array.isArray(products)) return [];
    
    const searchTerm = query.toLowerCase().trim();
    const results = products
      .filter(product => {
        const name = (product.name || '').toLowerCase();
        const category = (product.category || '').toLowerCase();
        const brand = (product.brand || '').toLowerCase();
        
        return name.includes(searchTerm) || 
               category.includes(searchTerm) || 
               brand.includes(searchTerm);
      })
      .slice(0, 8) // Limit to 8 results
      .map(product => ({
        ...product,
        relevanceScore: calculateRelevance(product, searchTerm)
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    return results;
  }, [query, products]);

  const calculateRelevance = (product, searchTerm) => {
    const name = (product.name || '').toLowerCase();
    const category = (product.category || '').toLowerCase();
    const brand = (product.brand || '').toLowerCase();
    
    let score = 0;
    
    // Exact name match gets highest score
    if (name === searchTerm) score += 100;
    else if (name.startsWith(searchTerm)) score += 50;
    else if (name.includes(searchTerm)) score += 25;
    
    // Category match
    if (category.includes(searchTerm)) score += 15;
    
    // Brand match
    if (brand.includes(searchTerm)) score += 10;
    
    return score;
  };

  const handleKeyDown = (e) => {
    if (!searchResults.length) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && searchResults[selectedIndex]) {
          handleProductClick(searchResults[selectedIndex]);
        }
        break;
    }
  };

  const handleProductClick = (product) => {
    setSearch(query);
    navigate(`/product/${product._id || product.slug}`);
    onClose();
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setSearch(query);
      navigate('/collection');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 ${className}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Search Panel */}
      <div className="relative max-w-2xl mx-auto mt-20 px-4">
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
          {/* Search Input */}
          <form onSubmit={handleSearch} className="p-4 border-b">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search products, brands, categories..."
                className="w-full px-4 py-3 pl-12 pr-4 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/20 focus:border-transparent outline-none"
                autoComplete="off"
              />
              <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </form>

          {/* Search Results */}
          <div className="max-h-96 overflow-y-auto">
            {query.trim() ? (
              searchResults.length > 0 ? (
                <div className="py-2">
                  {searchResults.map((product, index) => (
                    <button
                      key={product._id || product.slug}
                      onClick={() => handleProductClick(product)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center space-x-3 ${
                        index === selectedIndex ? 'bg-gray-50' : ''
                      }`}
                    >
                      <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {product.name}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {product.brand && `${product.brand} • `}
                          {product.category}
                        </p>
                        <p className="text-sm font-semibold text-gray-900">
                          ₹{product.price?.toLocaleString()}
                        </p>
                      </div>
                    </button>
                  ))}
                  
                  {/* View All Results */}
                  <div className="px-4 py-3 border-t bg-gray-50">
                    <button
                      onClick={handleSearch}
                      className="w-full text-center text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                    >
                      View all results for "{query}"
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-8 text-center">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-gray-500 mb-2">No products found</p>
                  <p className="text-sm text-gray-400">Try searching with different keywords</p>
                </div>
              )
            ) : (
              <div className="px-4 py-8 text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-gray-500 mb-2">Start typing to search</p>
                <p className="text-sm text-gray-400">Search by product name, brand, or category</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;