// src/components/Input.jsx
import React from 'react';

/**
 * Input component with consistent styling and error display
 * Follows the design system from PRD.md
 */
const Input = React.forwardRef(({
  type = 'text',
  placeholder,
  value,
  onChange,
  name,
  id,
  label,
  disabled = false,
  error = false,
  errorMessage = null,
  required = false,
  className = '',
  inputMode,
  maxLength,
  readOnly = false,
  ...props
}, ref) => {
  const baseStyles = 'w-full h-12 px-4 border rounded-lg text-sm outline-none transition-colors focus:border-primary';
  
  const stateStyles = error || errorMessage
    ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200'
    : 'border-gray-200 bg-white focus:ring-2 focus:ring-primary/20';

  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : '';
  const inputId = id || name || `input-${Math.random().toString(36).substr(2, 9)}`;
  const labelId = label ? `${inputId}-label` : undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} id={labelId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        name={name}
        id={inputId}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        readOnly={readOnly}
        inputMode={inputMode}
        maxLength={maxLength}
        className={`${baseStyles} ${stateStyles} ${disabledStyles} ${className}`}
        aria-invalid={error || errorMessage ? 'true' : 'false'}
        aria-describedby={[
          errorMessage ? `${inputId}-error` : null,
          labelId
        ].filter(Boolean).join(' ') || undefined}
        aria-label={!label && placeholder ? placeholder : undefined}
        {...props}
      />
      {errorMessage && (
        <p id={`${inputId}-error`} className="mt-1 text-xs text-red-600" role="alert" aria-live="polite">
          {errorMessage}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;

