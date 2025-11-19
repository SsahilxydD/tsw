# Scroll Restoration Testing Guide

## Quick Test (Manual)

1. Start your dev server: `npm run dev`
2. Open browser DevTools Console
3. Navigate to `/collection` or any category page
4. Scroll down to find a product
5. Click on a product
6. Press browser back button
7. **Expected**: Page should restore to the exact scroll position where you clicked

## Automated Test with Puppeteer

### Setup
```bash
npm install --save-dev puppeteer
```

### Run Test
```bash
# Test against local dev server
node test-scroll-restoration.js

# Test against production/staging
TEST_URL=https://your-domain.com node test-scroll-restoration.js
```

## Debug Console Logs

When running in development mode, you'll see debug logs in the console:
- `[ScrollRestore] Saved scroll position for /path: XXXpx`
- `[ScrollRestore] POP navigation detected for /path, saved position: XXXpx`
- `[ScrollRestore] Attempting to restore to XXXpx`
- `[ScrollRestore] Actual position after restore: XXXpx`

## Check SessionStorage

Open browser console and run:
```javascript
// Check all saved scroll positions
Object.keys(sessionStorage)
  .filter(k => k.startsWith('scroll_'))
  .forEach(k => console.log(k, sessionStorage.getItem(k)));

// Check specific page
sessionStorage.getItem('scroll_/collection');
```

## Troubleshooting

### Issue: Scroll position not being saved
- Check browser console for `[ScrollRestore]` logs
- Verify sessionStorage is accessible
- Check if link click interception is working

### Issue: Scroll position not being restored
- Check if `navType === "POP"` is being detected
- Verify saved position exists in sessionStorage
- Check if Product component is interfering (should not scroll on POP)

### Issue: Scroll position restored but then jumps to top
- Check if Product component's useEffect is running
- Verify `isRestoring()` flag is working
- Check timing - restoration might need longer delay

## Files Modified

- `src/components/ScrollToTop.jsx` - Main scroll restoration logic
- `src/pages/Product.jsx` - Prevents scroll-to-top on back navigation
- `src/utils/scrollRestoration.js` - Utility functions for saving/restoring
- `src/main.jsx` - Disabled browser native scroll restoration

