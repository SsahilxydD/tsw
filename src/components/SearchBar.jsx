import React, { useContext, useEffect, useRef, useState } from 'react'
import { ShopContext } from '../context/ShopContext'
import { useNavigate } from 'react-router-dom';
import SafeImg from './SafeImg';
import useDebouncedValue from '../hooks/useDebouncedValue';

const SearchBar = () => {
  const { products, search, setSearch, showSearch, setShowSearch, currency } = useContext(ShopContext);
  const [results, setResults] = useState([]);
  const [visibleCount, setVisibleCount] = useState(8);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const navigate = useNavigate();
  
  // Debounce search for autocomplete
  const debouncedSearch = useDebouncedValue(search, 200);

  // Focus input when opened
  useEffect(() => {
    if (showSearch && inputRef.current) {
      // Small delay to allow animation
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [showSearch]);

  // Close on escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setShowSearch(false);
    };
    if (showSearch) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [showSearch, setShowSearch]);

  // Generate autocomplete suggestions
  useEffect(() => {
    if (!debouncedSearch.trim() || debouncedSearch.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    const q = debouncedSearch.toLowerCase().trim();
    const productMatches = (products || [])
      .filter(p => {
        const name = (p.name || '').toLowerCase();
        const category = (p.category || '').toLowerCase();
        const brand = (p.brand || '').toLowerCase();
        return name.includes(q) || category.includes(q) || brand.includes(q);
      })
      .slice(0, 5); // Limit to 5 suggestions
    
    setSuggestions(productMatches);
    setShowSuggestions(productMatches.length > 0);
    setSelectedIndex(-1);
  }, [debouncedSearch, products]);

  // Search products (full results)
  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      setVisibleCount(8);
      return;
    }
    const q = search.toLowerCase().trim();
    const filtered = (products || [])
      .filter(p => {
        const name = (p.name || '').toLowerCase();
        const category = (p.category || '').toLowerCase();
        const brand = (p.brand || '').toLowerCase();
        return name.includes(q) || category.includes(q) || brand.includes(q);
      });
    setResults(filtered);
    setVisibleCount(8); // Reset visible count on new search
  }, [search, products]);

  const handleProductClick = (id) => {
    setShowSearch(false);
    setSearch('');
    setShowSuggestions(false);
    navigate(`/product/${id}`);
  };

  const handleSuggestionClick = (product) => {
    setSearch(product.name || '');
    setShowSuggestions(false);
    // Optionally navigate immediately or wait for Enter
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      const selected = suggestions[selectedIndex];
      handleProductClick(selected._id || selected.slug);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  // Scroll selected suggestion into view
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionsRef.current) {
      const selectedElement = suggestionsRef.current.children[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  if (!showSearch) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="search-label">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={() => setShowSearch(false)}
        aria-hidden="true"
      />
      
      {/* Search Panel */}
      <div className="absolute inset-x-0 top-0 bottom-0 bg-white animate-slide-down overflow-y-auto">
        {/* Search Input Area */}
        <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
          {/* Close button - fixed position */}
          <button
            onClick={() => setShowSearch(false)}
            className="fixed top-4 right-4 sm:top-6 sm:right-6 z-10 w-10 h-10 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-colors shadow-sm"
            aria-label="Close search"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Search Label */}
          <p id="search-label" className="text-xs font-medium text-gray-400 uppercase tracking-[0.2em] mb-4">
            Search
          </p>

          {/* Search Input */}
          <div className="relative">
            <input
              ref={inputRef}
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              placeholder="What are you looking for?"
              className="w-full text-2xl sm:text-4xl font-light text-black placeholder-gray-300 bg-transparent border-none outline-none pb-4 border-b-2 border-gray-200 focus:border-black transition-colors"
              style={{ caretColor: '#000' }}
              aria-label="Search products"
              aria-autocomplete="list"
              aria-expanded={showSuggestions}
              aria-controls="search-suggestions"
              aria-describedby={search && results.length > 0 ? "search-results-count" : undefined}
            />
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200">
              <div 
                className="h-full bg-black transition-all duration-300"
                style={{ width: search ? '100%' : '0%' }}
              />
            </div>

            {/* Autocomplete Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                id="search-suggestions"
                ref={suggestionsRef}
                className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto z-10"
                role="listbox"
                aria-label="Search suggestions"
              >
                {suggestions.map((product, index) => {
                  const cover = Array.isArray(product.image) 
                    ? product.image[0] 
                    : (Array.isArray(product.images) ? product.images[0] : product.image);
                  const isSelected = index === selectedIndex;
                  
                  return (
                    <button
                      key={product._id || product.slug}
                      type="button"
                      onClick={() => handleSuggestionClick(product)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                        isSelected ? 'bg-gray-50' : ''
                      }`}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className="w-12 h-12 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                        <SafeImg
                          src={cover}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          width={48}
                          height={48}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {product.brand && `${product.brand} • `}
                          {product.category && String(product.category).replace(/-/g, ' ')}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 flex-shrink-0">
                        {currency}{Number(product.price).toLocaleString('en-IN')}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Links */}
          {!search && (
            <div className="mt-8">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-[0.2em] mb-4">
                Popular Searches
              </p>
              <div className="flex flex-wrap gap-2">
                {['Shoes', 'Watch', 'Bag', 'T-Shirt', 'Jeans', 'Jacket'].map((term) => (
                  <button
                    key={term}
                    onClick={() => setSearch(term)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-sm text-gray-700 rounded-full transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {search && results.length > 0 && (
            <div className="mt-8" role="region" aria-label="Search results">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-[0.2em] mb-4">
                Products <span id="search-results-count" className="text-gray-300">({results.length})</span>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {results.slice(0, visibleCount).map((product) => {
                  const cover = Array.isArray(product.image) 
                    ? product.image[0] 
                    : (Array.isArray(product.images) ? product.images[0] : product.image);
                  return (
                    <button
                      key={product._id || product.slug}
                      onClick={() => handleProductClick(product._id || product.slug)}
                      className="group text-left"
                      aria-label={`View ${product.name}, ${currency}${Number(product.price).toLocaleString('en-IN')}`}
                    >
                      <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden mb-2">
                        <SafeImg
                          src={cover}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <p className="text-sm font-medium text-gray-900 line-clamp-1 group-hover:text-gray-600 transition-colors">
                        {product.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {currency}{Number(product.price).toLocaleString('en-IN')}
                      </p>
                    </button>
                  );
                })}
              </div>
              
              {/* Load More */}
              {visibleCount < results.length && (
                <button
                  onClick={() => setVisibleCount(prev => prev + 8)}
                  className="mt-6 w-full py-3 border-2 border-black text-black font-medium text-sm uppercase tracking-wider hover:bg-black hover:text-white transition-colors min-h-[44px]"
                  aria-label={`Load ${Math.min(8, results.length - visibleCount)} more products`}
                >
                  Load more ({results.length - visibleCount} remaining)
                </button>
              )}
              
              {/* End of results indicator */}
              {visibleCount >= results.length && results.length > 8 && (
                <p className="mt-6 text-center text-sm text-gray-400">
                  Showing all {results.length} results
                </p>
              )}
            </div>
          )}

          {/* No Results */}
          {search && results.length === 0 && (
            <div className="mt-12 text-center" role="status" aria-live="polite">
              <p className="text-gray-400 text-lg">No products found for "{search}"</p>
              <p className="text-gray-400 text-sm mt-2">Try a different search term</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-down {
          from { 
            opacity: 0;
            transform: translateY(-20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default SearchBar
