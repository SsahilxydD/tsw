import React, { useContext, useEffect, useRef, useState } from 'react'
import { ShopContext } from '../context/ShopContext'
import { useNavigate } from 'react-router-dom';
import SafeImg from './SafeImg';

const SearchBar = () => {
  const { products, search, setSearch, showSearch, setShowSearch, currency } = useContext(ShopContext);
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);
  const navigate = useNavigate();

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

  // Search products
  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    const q = search.toLowerCase().trim();
    const filtered = (products || [])
      .filter(p => (p.name || '').toLowerCase().includes(q))
      .slice(0, 8);
    setResults(filtered);
  }, [search, products]);

  const handleProductClick = (id) => {
    setShowSearch(false);
    setSearch('');
    navigate(`/product/${id}`);
  };

  const handleViewAll = () => {
    setShowSearch(false);
    navigate(`/collection?search=${encodeURIComponent(search)}`);
  };

  if (!showSearch) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={() => setShowSearch(false)}
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
          <p className="text-xs font-medium text-gray-400 uppercase tracking-[0.2em] mb-4">
            Search
          </p>

          {/* Search Input */}
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="What are you looking for?"
              className="w-full text-2xl sm:text-4xl font-light text-black placeholder-gray-300 bg-transparent border-none outline-none pb-4 border-b-2 border-gray-200 focus:border-black transition-colors"
              style={{ caretColor: '#000' }}
            />
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200">
              <div 
                className="h-full bg-black transition-all duration-300"
                style={{ width: search ? '100%' : '0%' }}
              />
            </div>
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
            <div className="mt-8">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-[0.2em] mb-4">
                Products
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {results.map((product) => {
                  const cover = Array.isArray(product.image) 
                    ? product.image[0] 
                    : (Array.isArray(product.images) ? product.images[0] : product.image);
                  return (
                    <button
                      key={product._id || product.slug}
                      onClick={() => handleProductClick(product._id || product.slug)}
                      className="group text-left"
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
              
              {/* View All */}
              <button
                onClick={handleViewAll}
                className="mt-6 w-full py-3 border-2 border-black text-black font-medium text-sm uppercase tracking-wider hover:bg-black hover:text-white transition-colors"
              >
                View all results
              </button>
            </div>
          )}

          {/* No Results */}
          {search && results.length === 0 && (
            <div className="mt-12 text-center">
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
