import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSizeGuideData, getSizeRecommendation } from '../utils/sizeGuideData';
import { isFootwearProduct, isJeansProduct } from '../utils/size';
import Button from './Button';
import Input from './Input';

const SizeGuide = ({ isOpen, onClose, product = null }) => {
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previousActiveElement = useRef(null);
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [measurements, setMeasurements] = useState({
    footLength: '',
    chest: '',
    waist: '',
  });
  const [recommendedSize, setRecommendedSize] = useState(null);

  // Get size guide data based on product
  const sizeGuideData = React.useMemo(() => {
    if (!product) {
      return getSizeGuideData('apparel', false, false);
    }
    
    const categoryRaw = product.categoryRaw || '';
    const isFootwear = isFootwearProduct(product);
    const isJeans = isJeansProduct(product);
    
    return getSizeGuideData(categoryRaw, isFootwear, isJeans);
  }, [product]);

  // Calculate size recommendation
  const handleGetRecommendation = () => {
    if (!product) return;
    
    const categoryRaw = product.categoryRaw || '';
    const isFootwear = isFootwearProduct(product);
    const isJeans = isJeansProduct(product);
    
    const recommendation = getSizeRecommendation(categoryRaw, isFootwear, isJeans, measurements);
    setRecommendedSize(recommendation);
    setShowRecommendation(true);
  };

  // Focus management for accessibility
  useEffect(() => {
    if (isOpen) {
      // Store the previously focused element
      previousActiveElement.current = document.activeElement;
      // Focus the close button when modal opens
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 100);
    } else {
      // Restore focus when modal closes
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowRecommendation(false);
      setMeasurements({ footLength: '', chest: '', waist: '' });
      setRecommendedSize(null);
    }
  }, [isOpen]);

  // Trap focus within modal when open
  useEffect(() => {
    if (!isOpen) return;

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    // Close on Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleTabKey);
    document.addEventListener('keydown', handleEscape);
    
    // Lock body scroll
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleTabKey);
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[9998] backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="size-guide-title"
            onClick={(e) => {
              // Close if clicking outside modal content
              if (e.target === e.currentTarget) {
                onClose();
              }
            }}
          >
            <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h2 id="size-guide-title" className="text-2xl font-semibold text-gray-900">
                    {sizeGuideData.title}
                  </h2>
                  {product && (
                    <p className="text-sm text-gray-500 mt-1">
                      {product.name}
                    </p>
                  )}
                </div>
                <button
                  ref={closeButtonRef}
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Close size guide"
                >
                  <svg
                    className="w-6 h-6 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Description */}
                <p className="text-gray-700 mb-4">
                  {sizeGuideData.description}
                </p>

                {/* Measurement Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    How to Measure
                  </h3>
                  <p className="text-sm text-gray-700">
                    {sizeGuideData.measurementInstructions}
                  </p>
                </div>

                {/* Size Chart Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        {sizeGuideData.columns.map((column, index) => (
                          <th
                            key={index}
                            className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b border-gray-200"
                          >
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sizeGuideData.rows.map((row, rowIndex) => (
                        <tr
                          key={rowIndex}
                          className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                        >
                          {sizeGuideData.columns.map((column, colIndex) => {
                            const columnKey = column.toLowerCase().replace(/\s+/g, '');
                            const value = row[columnKey] || row[Object.keys(row)[colIndex]] || '-';
                            return (
                              <td
                                key={colIndex}
                                className="px-4 py-3 text-sm text-gray-700 border-b border-gray-200"
                              >
                                {value}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Size Recommendation Section */}
                <div className="mt-8 border-t border-gray-200 pt-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Get Size Recommendation</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Enter your measurements below to get a recommended size:
                  </p>
                  
                  <div className="space-y-4">
                    {sizeGuideData.type === 'footwear' && (
                      <div>
                        <label htmlFor="footLength" className="block text-sm font-medium text-gray-700 mb-2">
                          Foot Length (cm)
                        </label>
                        <Input
                          id="footLength"
                          type="number"
                          step="0.1"
                          min="20"
                          max="35"
                          placeholder="e.g., 26.5"
                          value={measurements.footLength}
                          onChange={(e) => setMeasurements({ ...measurements, footLength: e.target.value })}
                        />
                      </div>
                    )}
                    
                    {sizeGuideData.type === 'jeans' && (
                      <div>
                        <label htmlFor="waist" className="block text-sm font-medium text-gray-700 mb-2">
                          Waist (inches)
                        </label>
                        <Input
                          id="waist"
                          type="number"
                          step="1"
                          min="24"
                          max="48"
                          placeholder="e.g., 32"
                          value={measurements.waist}
                          onChange={(e) => setMeasurements({ ...measurements, waist: e.target.value })}
                        />
                      </div>
                    )}
                    
                    {sizeGuideData.type === 'apparel' && (
                      <>
                        <div>
                          <label htmlFor="chest" className="block text-sm font-medium text-gray-700 mb-2">
                            Chest (inches)
                          </label>
                          <Input
                            id="chest"
                            type="number"
                            step="1"
                            min="30"
                            max="50"
                            placeholder="e.g., 40"
                            value={measurements.chest}
                            onChange={(e) => setMeasurements({ ...measurements, chest: e.target.value })}
                          />
                        </div>
                        <div>
                          <label htmlFor="waist" className="block text-sm font-medium text-gray-700 mb-2">
                            Waist (inches)
                          </label>
                          <Input
                            id="waist"
                            type="number"
                            step="1"
                            min="24"
                            max="44"
                            placeholder="e.g., 32"
                            value={measurements.waist}
                            onChange={(e) => setMeasurements({ ...measurements, waist: e.target.value })}
                          />
                        </div>
                      </>
                    )}
                    
                    <Button
                      onClick={handleGetRecommendation}
                      variant="outline"
                      size="md"
                      disabled={
                        (sizeGuideData.type === 'footwear' && !measurements.footLength) ||
                        (sizeGuideData.type === 'jeans' && !measurements.waist) ||
                        (sizeGuideData.type === 'apparel' && !measurements.chest)
                      }
                    >
                      Get Recommendation
                    </Button>
                    
                    {showRecommendation && recommendedSize && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-green-50 border border-green-200 rounded-lg p-4"
                      >
                        <p className="text-sm text-gray-900">
                          <strong>Recommended Size:</strong>{' '}
                          <span className="text-lg font-semibold text-green-700">
                            {recommendedSize}
                          </span>
                        </p>
                        <p className="text-xs text-gray-600 mt-2">
                          This is a recommendation based on your measurements. Sizes may vary, so please refer to the size chart above for detailed measurements.
                        </p>
                      </motion.div>
                    )}
                    
                    {showRecommendation && !recommendedSize && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-amber-50 border border-amber-200 rounded-lg p-4"
                      >
                        <p className="text-sm text-amber-800">
                          Unable to determine a size recommendation. Please check your measurements and try again, or refer to the size chart above.
                        </p>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Additional Notes */}
                <div className="mt-6 text-sm text-gray-600 space-y-2">
                  <p>
                    <strong className="text-gray-900">Note:</strong> Sizes may vary slightly between brands and styles. 
                    If you're between sizes, we recommend sizing up for a more comfortable fit.
                  </p>
                  <p>
                    For questions about sizing or fit, please contact our customer service team.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 p-6 bg-gray-50">
                <Button
                  onClick={onClose}
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto"
                >
                  Got it
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SizeGuide;

