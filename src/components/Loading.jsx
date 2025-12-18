// src/components/Loading.jsx
import React from 'react';

/**
 * Loading spinner component with variants
 * Follows the design system from PRD.md
 */
const Loading = ({
  size = 'md',
  variant = 'primary',
  fullScreen = false,
  message = null,
  className = '',
}) => {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-2',
    xl: 'w-16 h-16 border-4',
  };

  const variants = {
    primary: 'border-gray-300 border-t-primary',
    white: 'border-white/30 border-t-white',
    gray: 'border-gray-200 border-t-gray-600',
  };

  const spinner = (
    <div
      className={`${sizes[size]} ${variants[variant]} rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="text-center">
          {spinner}
          {message && (
            <p className="mt-4 text-sm text-gray-600">{message}</p>
          )}
        </div>
      </div>
    );
  }

  if (message) {
    return (
      <div className="flex flex-col items-center justify-center gap-3">
        {spinner}
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    );
  }

  return spinner;
};

export default Loading;

