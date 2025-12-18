// src/components/ReviewForm.jsx
import React, { useState } from 'react';
import Button from './Button';
import Input from './Input';
import { validateRequired, validateName } from '../utils/validation';

const StarRating = ({ rating, onRatingChange, disabled = false }) => {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !disabled && onRatingChange(star)}
          disabled={disabled}
          className={`transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-1 ${
            disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-110'
          }`}
          aria-label={`Rate ${star} out of 5 stars`}
          aria-pressed={rating === star}
          role="radio"
        >
          <svg
            className="w-6 h-6 sm:w-8 sm:h-8"
            fill={star <= rating ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </button>
      ))}
    </div>
  );
};

const ReviewForm = ({ productId, onSubmit, onCancel }) => {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    setErrors({});

    // Validation
    const newErrors = {};

    if (rating === 0) {
      newErrors.rating = 'Please select a rating';
    }

    if (!title.trim()) {
      newErrors.title = 'Please enter a review title';
    } else if (title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    } else if (title.trim().length > 100) {
      newErrors.title = 'Title must be less than 100 characters';
    }

    if (!comment.trim()) {
      newErrors.comment = 'Please enter your review';
    } else if (comment.trim().length < 10) {
      newErrors.comment = 'Review must be at least 10 characters';
    } else if (comment.trim().length > 2000) {
      newErrors.comment = 'Review must be less than 2000 characters';
    }

    const nameError = validateRequired(authorName, 'Name') || validateName(authorName, 'Name');
    if (nameError) {
      newErrors.authorName = nameError;
    }

    if (authorEmail && authorEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(authorEmail.trim())) {
        newErrors.authorEmail = 'Please enter a valid email address';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        productId,
        rating,
        title: title.trim(),
        comment: comment.trim(),
        authorName: authorName.trim(),
        authorEmail: authorEmail.trim() || undefined,
      });

      // Reset form
      setRating(0);
      setTitle('');
      setComment('');
      setAuthorName('');
      setAuthorEmail('');
      setErrors({});
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to submit review' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rating <span className="text-red-500">*</span>
        </label>
        <StarRating rating={rating} onRatingChange={setRating} />
        {errors.rating && (
          <p className="mt-1 text-sm text-red-600">{errors.rating}</p>
        )}
      </div>

      <div>
        <Input
          label="Your Name"
          value={authorName}
          onChange={(e) => {
            setAuthorName(e.target.value);
            if (errors.authorName) setErrors({ ...errors, authorName: null });
          }}
          error={!!errors.authorName}
          errorMessage={errors.authorName}
          placeholder="Enter your name"
          required
        />
      </div>

      <div>
        <Input
          label="Email (Optional)"
          type="email"
          value={authorEmail}
          onChange={(e) => {
            setAuthorEmail(e.target.value);
            if (errors.authorEmail) setErrors({ ...errors, authorEmail: null });
          }}
          error={!!errors.authorEmail}
          errorMessage={errors.authorEmail}
          placeholder="your.email@example.com"
        />
      </div>

      <div>
        <Input
          label="Review Title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (errors.title) setErrors({ ...errors, title: null });
          }}
          error={!!errors.title}
          errorMessage={errors.title}
          placeholder="Summarize your experience"
          required
          maxLength={100}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Review <span className="text-red-500">*</span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
            if (errors.comment) setErrors({ ...errors, comment: null });
          }}
          rows={5}
          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors ${
            errors.comment ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Share your thoughts about this product..."
          required
          maxLength={2000}
        />
        {errors.comment && (
          <p className="mt-1 text-sm text-red-600">{errors.comment}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          {comment.length}/2000 characters
        </p>
      </div>

      {errors.submit && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{errors.submit}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Review'}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
};

export default ReviewForm;

