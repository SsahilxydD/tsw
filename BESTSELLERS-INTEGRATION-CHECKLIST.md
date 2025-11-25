# Bestsellers Block Integration & Test Checklist

## File Changes Summary

### Modified Files
1. **`src/components/Bestsellers.jsx`** - Complete rewrite with robust error handling, fallback chain, IntersectionObserver lazy loading, and accessibility features
2. **`public/assets/bestsellers.json`** - Updated to use `/assets/no-image.png` placeholder for all sample images
3. **`src/pages/Home.jsx`** - Bestsellers component already inserted above Categories (line 40)

### New Files
1. **`public/assets/no-image.svg`** - SVG placeholder (600×600, neutral gray #f3f4f6)
2. **`scripts/create-no-image.js`** - Helper script with instructions for creating PNG version
3. **`public/assets/NO-IMAGE-README.txt`** - Instructions for creating the PNG placeholder

### Location of Bestsellers Block
- **File**: `src/pages/Home.jsx`
- **Location**: Line 40, immediately above the Categories component (line 44)
- **Structure**: Wrapped in animation div with `animate-slide-up` class

## Integration Checklist

### 1. Placeholder Image Setup
- [ ] Create `/public/assets/no-image.png` (600×600 pixels, neutral gray #f3f4f6)
  - **Method 1 (ImageMagick)**: `magick convert -size 600x600 xc:#f3f4f6 public/assets/no-image.png`
  - **Method 2**: Convert `public/assets/no-image.svg` to PNG using any image converter
  - **Method 3**: Use online tool to create a 600×600 gray PNG
- [ ] Verify the file is accessible at `/assets/no-image.png` in the browser
- [ ] Test that broken product images fall back to this placeholder

### 2. Fetch Helper Validation
- [ ] Verify `fetchJsonOrNull` returns `null` for non-200 responses
  - **Test**: Temporarily rename `/assets/bestsellers.json` and check console for warning (not error)
- [ ] Verify `fetchJsonOrNull` returns `null` for non-JSON content
  - **Test**: Create a test endpoint that returns HTML (e.g., 404 page) and verify no JSON parse errors
- [ ] Verify `fetchJsonOrNull` handles network errors gracefully
  - **Test**: Disable network in DevTools and verify console warnings (not errors)

### 3. Fallback Chain Testing
- [ ] **API Fallback**: Verify API endpoint `/api/products?sort=bestsellers&limit=8` is tried first
  - Check Network tab for request
  - If API returns valid JSON array, verify products display
- [ ] **JSON File Fallback**: Verify `/assets/bestsellers.json` is tried when API fails
  - Temporarily break API endpoint (404) and verify JSON file loads
  - Verify console shows: "Bestsellers: API returned non-JSON or non-200"
- [ ] **Inline JSON Fallback**: Verify inline script tag is used when both API and JSON file fail
  - Remove/rename `/assets/bestsellers.json`
  - Break API endpoint
  - Verify console shows: "Bestsellers: Using inline JSON fallback"
  - Verify 4 sample products display
- [ ] **Context Products Fallback**: Verify ShopContext products with `bestseller: true` are used
  - Break all previous fallbacks
  - Ensure some products in context have `bestseller: true`
  - Verify console shows: "Bestsellers: Using context products fallback"
- [ ] **Hard-coded Fallback**: Verify hard-coded array is used as final resort
  - Break all previous fallbacks and ensure no context products have `bestseller: true`
  - Verify console shows: "Bestsellers: Using hard-coded fallback"
  - Verify 4 fallback products display

### 4. Image Handling
- [ ] Verify `/assets/no-image.png` prevents 404s for missing product images
  - Set a product image to a broken URL
  - Verify image `onerror` handler replaces it with placeholder
  - Check Network tab - no 404 errors for images
- [ ] Verify all sample fallback products use placeholder images
  - Check `bestsellers.json` - all images should be `/assets/no-image.png`
  - Check inline JSON in component - all images should be `/assets/no-image.png`
  - Check hard-coded fallback - all images should be `/assets/no-image.png`

### 5. Console Error Validation
- [ ] **No JSON Parse Errors**: Verify no "SyntaxError: Unexpected token '<'" errors
  - Break API to return HTML (404 page)
  - Verify `fetchJsonOrNull` checks Content-Type before parsing
  - Check console - should show warning, not error
- [ ] **No Uncaught Exceptions**: Verify all errors are caught and logged as warnings/info
  - Test all failure scenarios
  - Verify no red errors in console from Bestsellers component
- [ ] **Helpful Console Messages**: Verify console messages are clear and informative
  - Messages should use `console.warn` or `console.info`
  - No stack traces should appear for expected fallback scenarios

### 6. Lazy Loading (IntersectionObserver)
- [ ] Verify images are lazy-loaded when cards are near viewport
  - Open DevTools Network tab
  - Scroll to Bestsellers section
  - Verify images load only when cards are ~50px from viewport (rootMargin: '50px')
- [ ] Verify fallback when IntersectionObserver is unavailable
  - Test in older browser or polyfill scenario
  - Verify images load immediately (no IntersectionObserver errors)
- [ ] Verify Lighthouse reports images as lazy-loaded
  - Run Lighthouse audit
  - Check "Lazy-load images" recommendation

### 7. Carousel Controls & Responsive Layout
- [ ] **Desktop Controls**: Verify left/right arrow buttons appear only when overflow exists
  - Test on desktop (>1024px)
  - Verify arrows hidden when all cards fit in viewport
  - Verify arrows visible when cards overflow
- [ ] **Mobile Controls**: Verify arrows are hidden on mobile
  - Test on mobile viewport (<768px)
  - Verify `hidden md:flex` classes hide arrows on mobile
- [ ] **Responsive Card Count**:
  - Mobile (≤640px): 2 visible cards (`w-[calc(50%-6px)]`)
  - Tablet (641-1024px): 3-4 visible cards (`w-[calc(33.333%-8px)]`)
  - Desktop (>1024px): 4-6 visible cards (`w-[calc(20%-9.6px)]`)
- [ ] **Scroll Snap**: Verify horizontal scroll snap works
  - Scroll carousel on mobile/tablet
  - Verify cards snap to start position

### 8. Keyboard Navigation & Accessibility
- [ ] **Keyboard Focus**: Verify product cards are keyboard-focusable
  - Tab through page
  - Verify focus ring appears on product cards
  - Verify focus ring uses `focus-visible:ring-2 focus-visible:ring-black/30`
- [ ] **Arrow Key Navigation**: Verify Arrow Left/Right keys scroll carousel
  - Focus on carousel container
  - Press Arrow Left - verify scrolls left
  - Press Arrow Right - verify scrolls right
- [ ] **ARIA Labels**: Verify proper ARIA attributes
  - Check `role="region"` on carousel container
  - Check `aria-label="Bestsellers carousel"` on carousel
  - Check `aria-roledescription="carousel"` on carousel
  - Check `role="list"` on product list
  - Check `role="listitem"` on each product card
  - Check `aria-label` on arrow buttons
  - Check `aria-hidden="true"` on decorative arrow symbols
- [ ] **Screen Reader**: Test with screen reader (NVDA/JAWS/VoiceOver)
  - Verify carousel is announced correctly
  - Verify product names and prices are read
  - Verify navigation controls are announced

### 9. Performance & Lighthouse
- [ ] **Lighthouse Audit**: Run Lighthouse and verify
  - Images are lazy-loaded (no "Lazy-load images" warning)
  - No blocking of main thread from Bestsellers feature
  - Accessibility score ≥ 90
  - Performance score not degraded by this feature
- [ ] **Network Performance**: Verify no unnecessary requests
  - Check Network tab - only one request per fallback level
  - Verify failed requests don't retry unnecessarily
  - Verify images load only when needed

### 10. No-JS Fallback
- [ ] Verify `<noscript>` fallback displays when JavaScript is disabled
  - Disable JavaScript in browser
  - Reload page
  - Verify "Explore bestsellers →" link appears
  - Verify link goes to `/collections/all`

### 11. Empty State
- [ ] Verify styled CTA card displays when product list is empty after all fallbacks
  - Break all data sources
  - Verify empty array results in CTA card (not raw HTML)
  - Verify CTA card has proper styling (white card, border, rounded corners)
  - Verify CTA links to `/collections/all`

### 12. Product Normalization
- [ ] Verify normalization handles various product object shapes
  - Test with products having: `title`, `name`, `image`, `images[0]`, `price`, `price_cents`, `url`, `handle`
  - Verify all are normalized to: `{ title, image, price, url, _id }`
- [ ] Verify items missing both `title` and `url` are skipped
  - Test with product object missing both fields
  - Verify it's filtered out (not displayed)

### 13. Visual Verification
- [ ] Verify spacing matches design (reference screenshot)
- [ ] Verify card styling (rounded white cards, subtle border/shadow)
- [ ] Verify typography scale matches theme
- [ ] Verify price text is centered and properly formatted
- [ ] Verify sale badge displays if applicable (if added in future)

## Production Readiness Checklist

- [ ] All tests above pass
- [ ] No console errors or warnings in production build
- [ ] `/assets/no-image.png` exists and is accessible
- [ ] All fallback data sources are valid JSON
- [ ] Responsive design works on all target devices
- [ ] Accessibility audit passes
- [ ] Performance impact is minimal
- [ ] Code is minified and optimized in production build

## Known Limitations

- The component requires `/assets/no-image.png` to be created manually (see instructions in `public/assets/NO-IMAGE-README.txt`)
- Inline JSON fallback is embedded in React component (not ideal for large datasets, but acceptable for 4-8 items)
- Hard-coded fallback uses placeholder images (intentional - these are final resort)

## Support

For issues or questions:
1. Check console for warning/info messages - they indicate which fallback is being used
2. Verify `/assets/no-image.png` exists if images are broken
3. Check Network tab to see which data source is being used
4. Verify API endpoint returns valid JSON with `Content-Type: application/json` header

