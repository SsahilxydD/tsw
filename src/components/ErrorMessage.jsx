// src/components/ErrorMessage.jsx
import React from 'react';
import Button from './Button';
import { getErrorMessage } from '../utils/errorHandler';

/**
 * ErrorMessage component for displaying user-friendly error messages
 */
const ErrorMessage = ({
  error,
  message,
  onRetry,
  onDismiss,
  className = '',
  showIcon = true,
}) => {
  const errorInfo = getErrorMessage(error, message);

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        {showIcon && (
          <svg
            className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-red-900 mb-1">
            {errorInfo.title}
          </h3>
          <p className="text-sm text-red-700">
            {errorInfo.message}
          </p>
          
          {(onRetry || onDismiss) && (
            <div className="mt-3 flex gap-2">
              {onRetry && (
                <Button
                  onClick={onRetry}
                  variant="primary"
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                >
                  {errorInfo.action}
                </Button>
              )}
              {onDismiss && (
                <Button
                  onClick={onDismiss}
                  variant="ghost"
                  size="sm"
                >
                  Dismiss
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage;

