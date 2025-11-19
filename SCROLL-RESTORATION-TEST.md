# Scroll Restoration Testing Guide

## How It Works

The scroll restoration system has been completely rebuilt with a simpler, more reliable architecture:

1. **ScrollRouter** - Custom router wrapper that intercepts navigation at the router level
2. **ScrollToTop** - Sets up continuous scroll position saving as user scrolls
3. **Product Component** - Scrolls to top on forward navigation, never interferes with restoration

## Quick Test (Manual)

1. Start your dev server: `npm run dev`
2. Navigate to `/collection` or any category page (e.g., `/category/topwear`)
3. Scroll down to find a product (scroll at least 500px down)
4. Note your scroll position (you can check in browser DevTools)
5. Click on a product to navigate to product page
6. Press the browser back button
7. **Expected**: Page should restore to the exact scroll position where you clicked
8. **Verify**: The page should NOT scroll to top

## Debug Console

Open browser DevTools Console to see scroll restoration in action. The system saves scroll positions continuously as you scroll.

## Check SessionStorage

Open browser console and run:
```javascript
// Check all saved scroll positions
Object.keys(sessionStorage)
  .filter(k => k.startsWith('scroll_'))
  .forEach(k => console.log(k, sessionStorage.getItem(k) + 'px'));

// Check specific page
sessionStorage.getItem('scroll_/collection');
```

## Architecture

### ScrollRouter Component
- Wraps BrowserRouter
- Intercepts navigation using React Router hooks
- Saves scroll position before forward navigation
- Restores scroll position on back navigation (POP)
- Handles all timing and edge cases

### ScrollToTop Component
- Sets up scroll event listener
- Continuously saves scroll position as user scrolls
- Debounced to avoid excessive saves

### Product Component
- Only scrolls to top on forward navigation
- Never scrolls during restoration (checks isRestoring flag)

## Troubleshooting

### Issue: Scroll position not being saved
- Check browser console for errors
- Verify sessionStorage is accessible
- Check if you're scrolling on the page (system saves on scroll events)

### Issue: Scroll position not being restored
- Check if saved position exists: `sessionStorage.getItem('scroll_/your-path')`
- Verify you're using browser back button (not a Link component)
- Check browser console for any errors

### Issue: Page still scrolls to top on back
- Verify ScrollRouter is being used in main.jsx
- Check if Product component is interfering (should not be)
- Ensure browser native scroll restoration is disabled (handled in main.jsx)

## Files

- `src/components/ScrollRouter.jsx` - Main scroll restoration logic
- `src/components/ScrollToTop.jsx` - Scroll position saving setup
- `src/utils/scrollRestoration.js` - Utility functions
- `src/pages/Product.jsx` - Product page scroll handling
- `src/main.jsx` - Uses ScrollRouter instead of BrowserRouter

## Key Features

- ✅ Router-level interception (most reliable)
- ✅ Continuous scroll position saving
- ✅ Proper timing for restoration
- ✅ No conflicts between components
- ✅ Simple, maintainable code
