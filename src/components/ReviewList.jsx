// src/components/ReviewList.jsx
import React, { useState, useMemo } from 'react';
import Button from './Button';

const StarDisplay = ({ rating, size = 'md' }) => {
  const starSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  
  return (
    <div className="flex items-center gap-0.5" aria-label={`Rating: ${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={starSize}
          fill={star <= rating ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      ))}
    </div>
  );
};

const ReviewCard = ({ review, onHelpful }) => {
  const [helpfulClicked, setHelpfulClicked] = useState(false);
  // Optimistically include the user's own click so the count visibly increments.
  const displayHelpful = (review.helpfulCount || 0) + (helpfulClicked ? 1 : 0);
  const date = review.date ? new Date(review.date) : null;
  const formattedDate = date && !isNaN(date) ? date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : '';

  const handleHelpful = () => {
    if (!helpfulClicked && onHelpful) {
      setHelpfulClicked(true);
      onHelpful(review.id);
    }
  };

  return (
    <div className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-2">
              <StarDisplay rating={review.rating} size="sm" />
              <span className="text-sm font-medium text-gray-900">
                {review.authorName}
              </span>
            </div>
          </div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">
            {review.title}
          </h4>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
            {review.comment}
          </p>
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-gray-500">{formattedDate}</span>
        <button
          onClick={handleHelpful}
          disabled={helpfulClicked}
          className={`text-xs font-medium transition-colors min-h-[32px] px-3 ${
            helpfulClicked
              ? 'text-green-600 cursor-default'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          aria-label={helpfulClicked ? 'Marked as helpful' : 'Mark as helpful'}
        >
          {helpfulClicked ? '✓ Helpful' : 'Helpful'}
          {displayHelpful > 0 && (
            <span className="ml-1">({displayHelpful})</span>
          )}
        </button>
      </div>
    </div>
  );
};

const ReviewList = ({ reviews, onHelpful, sortBy = 'newest' }) => {
  const [currentSort, setCurrentSort] = useState(sortBy);
  const [showAll, setShowAll] = useState(false);

  const sortedReviews = useMemo(() => {
    const sorted = [...reviews];
    
    switch (currentSort) {
      case 'newest':
        sorted.sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
        break;
      case 'oldest':
        sorted.sort((a, b) => (Date.parse(a.date) || 0) - (Date.parse(b.date) || 0));
        break;
      case 'highest':
        sorted.sort((a, b) => b.rating - a.rating);
        break;
      case 'lowest':
        sorted.sort((a, b) => a.rating - b.rating);
        break;
      case 'mostHelpful':
        sorted.sort((a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0));
        break;
      default:
        sorted.sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
    }
    
    return sorted;
  }, [reviews, currentSort]);

  const displayedReviews = showAll ? sortedReviews : sortedReviews.slice(0, 5);

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No reviews yet. Be the first to review this product!</p>
      </div>
    );
  }

  return (
    <div>
      {/* Sort Options */}
      {reviews.length > 1 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600">Sort by:</span>
          <select
            value={currentSort}
            onChange={(e) => setCurrentSort(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            aria-label="Sort reviews"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Rating</option>
            <option value="lowest">Lowest Rating</option>
            <option value="mostHelpful">Most Helpful</option>
          </select>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-6">
        {displayedReviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            onHelpful={onHelpful}
          />
        ))}
      </div>

      {/* Show More/Less */}
      {reviews.length > 5 && (
        <div className="mt-6 text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Show Less' : `Show All ${reviews.length} Reviews`}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ReviewList;

