# Bestsellers Section Integration Guide

## Overview
A mobile-first, accessible bestsellers carousel component has been added above the categories grid on the home page.

## Files Modified/Created

### 1. New Component
- **`src/components/Bestsellers.jsx`** - Main React component for the bestsellers carousel

### 2. Updated Files
- **`src/pages/Home.jsx`** - Added Bestsellers component above Categories
- **`src/index.css`** - Added `.scrollbar-hide` utility class for carousel

### 3. Fallback Data
- **`public/assets/bestsellers.json`** - Sample fallback JSON file

## Features

- **Mobile-first design**: Responsive carousel with touch scrolling
- **Accessibility**: Keyboard navigation, ARIA labels, focus management
- **Performance**: Lazy-loaded images, IntersectionObserver support
- **Fallback chain**: API → JSON file → Context products → Empty state
- **Responsive breakpoints**:
  - Mobile (≤640px): 2 visible cards, touch scroll
  - Tablet (641-1024px): 3-4 visible cards
  - Desktop (>1024px): 4-6 visible cards with arrow controls

## Data Source Priority

The component tries to fetch bestsellers in this order:

1. **API Endpoint**: `/api/products?sort=bestsellers&limit=8`
2. **JSON Fallback**: `/assets/bestsellers.json`
3. **Context Products**: Products with `bestseller: true` flag from ShopContext
4. **Empty State**: Shows "Explore our store" CTA if all fail

## Customization

### Change API Endpoint
Edit `src/components/Bestsellers.jsx`, line ~25:
```javascript
const apiRes = await fetch('/api/products?sort=bestsellers&limit=8');
```

### Change Number of Items
Edit the `limit` parameter in the API call or modify the slice in the context fallback:
```javascript
.slice(0, 8) // Change 8 to desired number
```

### Adjust Card Widths
Edit `src/components/Bestsellers.jsx`, line ~180:
```javascript
className="flex-shrink-0 w-[72%] max-w-[220px] sm:w-[30%] lg:w-[22%]"
```

### Customize CSS Variables
The component uses Tailwind classes. To match your theme:
- Colors: Update Tailwind config (`tailwind.config.js`)
- Spacing: Modify gap and padding classes
- Borders: Adjust `border-gray-200` classes

## Testing Checklist

- [ ] Test on mobile (Chrome device emulation) - verify touch scroll
- [ ] Test on tablet - verify 3-4 cards visible
- [ ] Test on desktop - verify arrow controls work
- [ ] Test keyboard navigation (Arrow Left/Right)
- [ ] Test with API present - verify data loads
- [ ] Test with API failing - verify fallback JSON loads
- [ ] Test with both failing - verify context products or empty state
- [ ] Test lazy-loading - verify images load on scroll
- [ ] Run Lighthouse - check accessibility & performance scores
- [ ] Test with JavaScript disabled - verify noscript fallback

## API Response Format

If implementing the API endpoint, ensure it returns:

```json
[
  {
    "id": "product-id",
    "title": "Product Name",
    "price": 1999,
    "image": "/path/to/image.jpg",
    "url": "/product/product-handle",
    "handle": "product-handle"
  }
]
```

## Notes

- The component automatically hides arrow controls on mobile
- Scroll snapping is enabled for better UX
- Images use the `SafeImg` component for error handling
- Product links use React Router's `Link` component
- Currency symbol comes from ShopContext

