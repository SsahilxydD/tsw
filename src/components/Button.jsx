// src/components/Button.jsx
import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Button component with consistent styling variants
 * Follows the design system from PRD.md
 * Supports rendering as Link when 'as' prop is provided
 */
const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  type = 'button',
  onClick,
  className = '',
  as,
  to,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium tracking-wide transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed pressable';
  
  const variants = {
    primary: 'bg-primary text-white hover:bg-gray-800 active:scale-[0.98]',
    secondary: 'bg-gray-100 text-primary hover:bg-gray-200 active:scale-[0.98]',
    outline: 'border-2 border-primary text-primary bg-transparent hover:bg-primary hover:text-white active:scale-[0.98]',
    ghost: 'text-primary hover:bg-gray-100 active:scale-[0.98]',
    link: 'text-primary underline hover:text-gray-800 active:scale-[0.98]',
  };

  const sizes = {
    sm: 'px-4 py-2.5 text-xs rounded-lg min-h-[44px] sm:min-h-0', // 44px min on mobile
    md: 'px-6 py-3 text-sm rounded-lg min-h-[44px] sm:min-h-0', // 44px min on mobile
    lg: 'px-8 py-3.5 text-sm rounded-lg min-h-[44px] sm:min-h-0', // 44px min on mobile
    xl: 'px-8 py-4 text-base rounded-lg min-h-[44px] sm:min-h-0', // 44px min on mobile
  };

  const variantStyles = variants[variant] || variants.primary;
  const sizeStyles = sizes[size] || sizes.md;

  const combinedClassName = `${baseStyles} ${variantStyles} ${sizeStyles} ${className}`;

  // Render as Link if 'as' prop is Link and 'to' is provided
  if (as === Link && to) {
    return (
      <Link
        to={to}
        className={combinedClassName}
        {...props}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={combinedClassName}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;

