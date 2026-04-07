# Responsive Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 70+ responsive issues across the Solo Wardrobe e-commerce app, covering 320px through 1440px+.

**Architecture:** Surgical fix pass — modify Tailwind classes, z-indexes, padding, and breakpoints in existing files. No new components or architecture changes except importing the existing StickyATC into Product.jsx.

**Tech Stack:** React, Tailwind CSS 3, Framer Motion, Vite

---

### Task 1: Global CSS and Tailwind Config

**Files:**
- Modify: `src/index.css`
- Modify: `tailwind.config.js`

- [ ] **Step 1: Remove forced mobile transition override**

In `src/index.css`, delete lines 19-25 (the nested media query that forces `transition-duration: 0.2s !important`):

```css
/* DELETE THIS ENTIRE BLOCK (inside @media (max-width: 639px)): */
  /* Reduce animations on mobile for better performance (unless user prefers reduced motion) */
  @media (prefers-reduced-motion: no-preference) {
    * {
      transition-duration: 0.2s !important;
    }
  }
```

- [ ] **Step 2: Fix overflow-x: hidden**

In `src/index.css`, replace the mobile-only overflow block (lines 48-52):

```css
/* OLD (inside @media max-width 639px): */
  /* Prevent horizontal scroll */
  html, body {
    overflow-x: hidden;
    max-width: 100vw;
  }
```

Remove those lines from inside the mobile media query. Add a global rule outside any media query, after the `@layer base` block (after line 131):

```css
/* Prevent horizontal scroll globally (on html only — body breaks Safari sticky) */
html {
  overflow-x: hidden;
}
```

- [ ] **Step 3: Add print styles**

At the end of `src/index.css`, add:

```css
/* Hide fixed chrome when printing */
@media print {
  nav[aria-label="Mobile navigation"],
  header,
  .fixed,
  [class*="z-[58]"],
  [class*="z-[60]"],
  [class*="z-30"],
  [class*="z-40"] {
    display: none !important;
  }
}
```

- [ ] **Step 4: Clean up tailwind.config.js**

In `tailwind.config.js`:

Remove the `xs` breakpoint (line 54):
```js
// DELETE:
'xs': '375px',  // Extra small phones
```

Remove the entire `fontSize` block (lines 22-31) since it redeclares Tailwind defaults:
```js
// DELETE entire fontSize key:
fontSize: {
  'xs': ['0.75rem', { lineHeight: '1rem' }],
  // ... all entries ...
  '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
},
```

- [ ] **Step 5: Build and verify**

Run: `npx vite build`
Expected: Build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add src/index.css tailwind.config.js
git commit -m "fix: global CSS cleanup — remove forced transitions, fix overflow, add print styles"
```

---

### Task 2: Fix Navbar Spacer and Z-Index Stacking

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/WhatsAppCTA.jsx`
- Modify: `src/components/Notice.jsx`
- Modify: `src/components/StickyATC.jsx`
- Modify: `src/pages/Address.jsx`

- [ ] **Step 1: Fix navbar spacer in App.jsx**

In `src/App.jsx`, the spacer at line 83 is hardcoded. Make it conditional on the announcement bar visibility. Add the same route check the Navbar uses:

Replace:
```jsx
{!isHome && <div className="h-[100px] sm:h-[92px]" />}
```

With:
```jsx
{!isHome && (
  <div className={
    /^(?:\/category\/discounted)(?:\/|$)/i.test(location.pathname)
      ? "h-16 sm:h-14"
      : "h-[100px] sm:h-[92px]"
  } />
)}
```

- [ ] **Step 2: Fix WhatsAppCTA position and z-index**

In `src/components/WhatsAppCTA.jsx` line 67, change:
```jsx
className={`fixed right-4 bottom-20 sm:bottom-6 z-40 ${show ? 'animate-slide-up' : 'opacity-0'}`}
```

To:
```jsx
className={`fixed right-4 bottom-28 sm:bottom-6 z-30 ${show ? 'animate-slide-up' : 'opacity-0'}`}
```

Also remove the inline safe-area style on line 68:
```jsx
style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
```

Replace with empty (remove the style prop entirely).

- [ ] **Step 3: Fix Notice toast position**

In `src/components/Notice.jsx` line 10, change:
```jsx
className="fixed left-1/2 -translate-x-1/2 bottom-[84px] z-[60] pointer-events-none"
```

To:
```jsx
className="fixed left-1/2 -translate-x-1/2 bottom-[124px] sm:bottom-[84px] z-[60] pointer-events-none"
```

- [ ] **Step 4: Fix StickyATC safe-area double-padding**

In `src/components/StickyATC.jsx` lines 12-13, change:
```jsx
<div className="sm:hidden fixed inset-x-0 bottom-[56px] z-30 bg-white border-t
                pb-[max(env(safe-area-inset-bottom),0px)]">
```

To:
```jsx
<div className="sm:hidden fixed inset-x-0 bottom-[56px] z-30 bg-white border-t">
```

- [ ] **Step 5: Fix Address.jsx sticky header**

In `src/pages/Address.jsx`, the sticky header at line 278 uses `bg-white border-b sticky top-0 z-10`. Change to remove sticky:

Replace:
```jsx
<div className="bg-white border-b sticky top-0 z-10">
```

With:
```jsx
<div className="bg-white border-b">
```

- [ ] **Step 6: Build and verify**

Run: `npx vite build`
Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/App.jsx src/components/WhatsAppCTA.jsx src/components/Notice.jsx src/components/StickyATC.jsx src/pages/Address.jsx
git commit -m "fix: z-index stacking — fix WhatsApp/StickyATC overlap, notice position, navbar spacer"
```

---

### Task 3: BottomDock Clearance Across All Pages

**Files:**
- Modify: `src/pages/Home.jsx`
- Modify: `src/pages/Product.jsx`
- Modify: `src/pages/Collection.jsx`
- Modify: `src/pages/Category.jsx`
- Modify: `src/pages/Cart.jsx`
- Modify: `src/pages/Wishlist.jsx`
- Modify: `src/pages/About.jsx`
- Modify: `src/pages/Contact.jsx`
- Modify: `src/pages/Orders.jsx`
- Modify: `src/pages/Login.jsx`
- Modify: `src/pages/Payment.jsx`
- Modify: `src/components/Categories.jsx`
- Modify: `src/components/Footer.jsx`

- [ ] **Step 1: Home.jsx**

In `src/pages/Home.jsx` line 30, change:
```jsx
<div>
```
To:
```jsx
<div className="pb-20 md:pb-0">
```

- [ ] **Step 2: Product.jsx**

In `src/pages/Product.jsx` line 311, change:
```jsx
className="px-4 sm:px-6 lg:px-8 py-8 sm:py-10 max-w-7xl mx-auto"
```
To:
```jsx
className="px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 pb-32 md:pb-10 max-w-7xl mx-auto"
```

- [ ] **Step 3: Collection.jsx**

In `src/pages/Collection.jsx`, find the page root div (the one with `className='border-t pt-14'` or similar). Add `pb-20 md:pb-0` to its className.

- [ ] **Step 4: Category.jsx**

Same as Collection — find the page root div and add `pb-20 md:pb-0`.

- [ ] **Step 5: Cart.jsx**

In `src/pages/Cart.jsx` line 114, change:
```jsx
<div className='border-t pt-14'>
```
To:
```jsx
<div className='border-t pt-14 pb-20 md:pb-0'>
```

- [ ] **Step 6: Wishlist.jsx**

In `src/pages/Wishlist.jsx`, the inner container uses `py-12 sm:py-16`. Change to use separate pt/pb:
```jsx
className="max-w-6xl mx-auto px-4 pt-12 sm:pt-16 pb-20 md:pb-16"
```
Apply to both the empty state container and the populated state container.

- [ ] **Step 7: About.jsx**

In `src/pages/About.jsx` line 80, change:
```jsx
<div className='h-10' />
```
To:
```jsx
<div className='h-20 md:h-10' />
```

- [ ] **Step 8: Contact.jsx**

In `src/pages/Contact.jsx` line 54, change:
```jsx
<div className='border-t'>
```
To:
```jsx
<div className='border-t pb-20 md:pb-0'>
```

- [ ] **Step 9: Orders.jsx**

In `src/pages/Orders.jsx`, the root div `border-t pt-16 px-4 max-w-6xl mx-auto`. Add `pb-20 md:pb-0`:
```jsx
<div className='border-t pt-16 px-4 max-w-6xl mx-auto pb-20 md:pb-0'>
```

- [ ] **Step 10: Login.jsx**

In `src/pages/Login.jsx`, the wrapper div. Add `pb-20 md:pb-0`:
```jsx
className='flex flex-col items-center w-[90%] sm:max-w-md m-auto mt-14 gap-4 text-gray-800 min-h-[60vh] justify-center pb-20 md:pb-0'
```

- [ ] **Step 11: Payment.jsx**

In `src/pages/Payment.jsx` line 110, change:
```jsx
<div className="border-t pt-14">
```
To:
```jsx
<div className="border-t pt-14 pb-32 md:pb-0">
```

- [ ] **Step 12: Categories.jsx**

In `src/components/Categories.jsx`, find the section with `mb-10` and change to `mb-20 md:mb-10`.

- [ ] **Step 13: Footer.jsx**

In `src/components/Footer.jsx` line 8, change:
```jsx
className="bg-primary text-white pt-16 pb-[72px] md:pb-8"
```
To:
```jsx
className="bg-primary text-white pt-16 pb-24 md:pb-8"
```

- [ ] **Step 14: Build and verify**

Run: `npx vite build`
Expected: Build succeeds.

- [ ] **Step 15: Commit**

```bash
git add src/pages/ src/components/Categories.jsx src/components/Footer.jsx
git commit -m "fix: add BottomDock clearance padding to all pages"
```

---

### Task 4: 320px Overflow Fixes

**Files:**
- Modify: `src/pages/Product.jsx`
- Modify: `src/pages/Orders.jsx`
- Modify: `src/pages/Login.jsx`
- Modify: `src/pages/Wishlist.jsx`
- Modify: `src/pages/Collection.jsx`
- Modify: `src/pages/Category.jsx`
- Modify: `src/pages/Address.jsx`
- Modify: `src/components/CartRecommendations.jsx`
- Modify: `src/components/RelatedProducts.jsx`
- Modify: `src/components/BottomDock.jsx`
- Modify: `src/components/CartDrawer.jsx`

- [ ] **Step 1: Product.jsx CTA buttons**

In `src/pages/Product.jsx` line 580, change the CTA container from a single flex row to a stacked layout on mobile:

Replace:
```jsx
<motion.div variants={fadeInUp} className="mt-8 flex gap-3">
```

With:
```jsx
<motion.div variants={fadeInUp} className="mt-8 flex flex-col sm:flex-row gap-3">
```

Then for the wishlist heart button (line 611), wrap it to be inline with "Add to Cart" on mobile. Change the "Add to Cart" button and heart to be in a sub-row:

Actually, the simplest fix: just make the whole row `flex-col sm:flex-row`. On mobile, all 3 buttons stack vertically. "Add to Cart" gets full width, "Buy Now" gets full width, heart gets auto width. This is clean and standard for e-commerce.

- [ ] **Step 2: Orders.jsx button row**

In `src/pages/Orders.jsx`, find `<div className="flex gap-3">` and change to:
```jsx
<div className="flex flex-col sm:flex-row gap-3">
```

- [ ] **Step 3: Login.jsx button row**

In `src/pages/Login.jsx`, find `<div className='flex gap-3 mt-4'>` and change to:
```jsx
<div className='flex flex-col sm:flex-row gap-3 mt-4'>
```

- [ ] **Step 4: Wishlist.jsx header**

In `src/pages/Wishlist.jsx` line 67, change:
```jsx
<div className="flex items-center justify-between mb-8">
```
To:
```jsx
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
```

- [ ] **Step 5: Collection.jsx product grid**

In `src/pages/Collection.jsx`, find the product grid className that starts with `grid grid-cols-3`. Change `grid-cols-3` to `grid-cols-2`:
```
grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4
```

- [ ] **Step 6: Category.jsx product grid**

Same as Collection — find the product grid and change `grid-cols-3` to `grid-cols-2 sm:grid-cols-3`.

- [ ] **Step 7: CartRecommendations.jsx grid**

In `src/components/CartRecommendations.jsx` line 178, change:
```jsx
className="mt-4 grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4 lg:gap-6"
```
To:
```jsx
className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4 lg:gap-6"
```

- [ ] **Step 8: RelatedProducts.jsx grid**

In `src/components/RelatedProducts.jsx` line 28, change:
```jsx
className='grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4 lg:gap-6'
```
To:
```jsx
className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4 lg:gap-6'
```

- [ ] **Step 9: Address.jsx name fields**

In `src/pages/Address.jsx`, find the name fields grid (line ~310):
```jsx
<div className="grid grid-cols-2 gap-3">
```
Change to:
```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
```

- [ ] **Step 10: BottomDock label**

In `src/components/BottomDock.jsx`, change the Categories label:
```jsx
<span className="text-[10px] font-medium">Categories</span>
```
To:
```jsx
<span className="text-[10px] font-medium">Shop</span>
```

- [ ] **Step 11: CartDrawer quantity stepper buttons**

In `src/components/CartDrawer.jsx`, the minus button (line ~207-210) and plus button (line ~216-220) both use `min-w-[44px] min-h-[44px]`. Change to `min-w-[36px] min-h-[36px] sm:min-w-[44px] sm:min-h-[44px]` for both.

- [ ] **Step 12: Build and verify**

Run: `npx vite build`
Expected: Build succeeds.

- [ ] **Step 13: Commit**

```bash
git add src/pages/ src/components/CartRecommendations.jsx src/components/RelatedProducts.jsx src/components/BottomDock.jsx src/components/CartDrawer.jsx
git commit -m "fix: 320px overflow — stack buttons, 2-col grids, smaller touch targets in drawer"
```

---

### Task 5: Tablet Breakpoint Gaps (768px)

**Files:**
- Modify: `src/pages/Product.jsx`
- Modify: `src/pages/Collection.jsx`
- Modify: `src/pages/Category.jsx`
- Modify: `src/pages/About.jsx`
- Modify: `src/pages/Contact.jsx`

- [ ] **Step 1: Product.jsx gallery layout**

In `src/pages/Product.jsx` line 341, change:
```jsx
className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12"
```
To:
```jsx
className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-12"
```

- [ ] **Step 2: Collection.jsx sidebar visibility**

In `src/pages/Collection.jsx`, find the sidebar `aside` that has `hidden sm:block` and change to `hidden md:block`. Also find `min-w-60` and change to `md:min-w-60` (only enforce min-width at tablet+).

- [ ] **Step 3: Category.jsx sidebar visibility**

Same as Collection — change `hidden sm:block` to `hidden md:block` for the sidebar, and `min-w-60` to `md:min-w-60`.

- [ ] **Step 4: Category.jsx sub-category tiles**

In `src/pages/Category.jsx`, find the sub-category tile grid that uses `grid-cols-3` (the `lg:hidden` version). Add `sm:grid-cols-4`:
```
grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4
```

- [ ] **Step 5: About.jsx card grids**

In `src/pages/About.jsx` lines 39 and 60, change both:
```jsx
className='grid md:grid-cols-3 gap-6 text-sm'
```
To:
```jsx
className='grid sm:grid-cols-2 md:grid-cols-3 gap-6 text-sm'
```

- [ ] **Step 6: Contact.jsx info cards**

In `src/pages/Contact.jsx` line 66, change:
```jsx
className='grid sm:grid-cols-2 gap-4 text-sm animate-soft-reveal'
```
To:
```jsx
className='grid grid-cols-2 gap-4 text-sm animate-soft-reveal'
```

- [ ] **Step 7: Build and verify**

Run: `npx vite build`
Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/pages/Product.jsx src/pages/Collection.jsx src/pages/Category.jsx src/pages/About.jsx src/pages/Contact.jsx
git commit -m "fix: tablet breakpoints — md:grid-cols-2 for product, sidebar at md, 2-col cards"
```

---

### Task 6: Font Fix, StickyATC, Cart Mobile UX

**Files:**
- Modify: `src/components/Hero.jsx`
- Modify: `src/components/CartDrawer.jsx`
- Modify: `src/pages/Login.jsx`
- Modify: `src/pages/Category.jsx`
- Modify: `src/pages/Product.jsx`
- Modify: `src/pages/Cart.jsx`
- Modify: `src/components/Footer.jsx`

- [ ] **Step 1: Fix prata-regular font references**

Replace `prata-regular` with `font-serif` in all files. Use find-and-replace:

In `src/components/Hero.jsx` line 33:
```jsx
// OLD:
className="prata-regular text-3xl sm:text-4xl md:text-4xl text-white leading-tight tracking-tight"
// NEW:
className="font-serif text-3xl sm:text-4xl md:text-4xl text-white leading-tight tracking-tight"
```

In `src/components/CartDrawer.jsx` line 125:
```jsx
// OLD:
className="text-xl font-medium prata-regular"
// NEW:
className="text-xl font-medium font-serif"
```

In `src/pages/Login.jsx`, find `prata-regular` and replace with `font-serif`.

In `src/pages/Category.jsx`, find all `prata-regular` (2 occurrences) and replace with `font-serif`.

Also check `src/components/CategoryCard.jsx` for `prata-regular` and replace.

- [ ] **Step 2: Import and render StickyATC on Product page**

In `src/pages/Product.jsx`, add the import near the top (with other imports):
```jsx
import StickyATC from '../components/StickyATC';
```

Then render it inside the return, after the main content but before the closing `</motion.div>`. Find a good spot near the end of the JSX, before the closing tag:

```jsx
<StickyATC
  priceText={`${currency}${product.price?.toLocaleString('en-IN') || 0}`}
  disabled={hasSizes && !selectedSize}
  onClick={handleAdd}
/>
```

The `handleAdd` function already exists in Product.jsx and handles the add-to-cart logic.

- [ ] **Step 3: Cart "Move to wishlist" on mobile**

In `src/pages/Cart.jsx` line 187, the desktop-only action links use `hidden sm:flex`. Change to show on all sizes but with different layouts:

Replace lines 187-200:
```jsx
<div className='mt-3 hidden sm:flex items-center gap-6 text-xs text-gray-500'>
  <Button variant="link" size="sm" onClick={() => requestRemove(item._id, item.size)} className="text-xs">Remove</Button>
  <Button 
    variant="link" 
    size="sm" 
    onClick={() => {
      addToWishlist(item._id);
      updateQuantity(item._id, item.size, 0);
    }}
    className="text-xs"
  >
    Move to wishlist
  </Button>
</div>
```

With:
```jsx
<div className='mt-3 flex items-center gap-6 text-xs text-gray-500'>
  <Button variant="link" size="sm" onClick={() => requestRemove(item._id, item.size)} className="text-xs hidden sm:inline-flex">Remove</Button>
  <Button 
    variant="link" 
    size="sm" 
    onClick={() => {
      addToWishlist(item._id);
      updateQuantity(item._id, item.size, 0);
    }}
    className="text-xs"
  >
    <span className="hidden sm:inline">Move to wishlist</span>
    <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  </Button>
</div>
```

- [ ] **Step 4: Uncomment CartStickyBar on Cart page**

In `src/pages/Cart.jsx` line 11, uncomment:
```jsx
// import CartStickyBar from '../components/CartStickyBar';
```
To:
```jsx
import CartStickyBar from '../components/CartStickyBar';
```

Then before the closing `</div>` of the cart page (before the `CartRecommendations` or after it), render:
```jsx
<CartStickyBar
  totalText={`Proceed to checkout`}
  buttonText="CHECKOUT"
  onClick={() => navigate('/address')}
  disabled={cartData.length === 0}
/>
```

- [ ] **Step 5: Cart item image responsive sizing**

In `src/pages/Cart.jsx` line 161, change:
```jsx
className='w-20 h-20 rounded-md object-cover border hover:opacity-80 transition-opacity'
```
To:
```jsx
className='w-16 h-16 sm:w-20 sm:h-20 rounded-md object-cover border hover:opacity-80 transition-opacity'
```

Also update the width/height attributes on the same SafeImg:
```jsx
width={80}
height={80}
```
Change to:
```jsx
width={64}
height={64}
```

- [ ] **Step 6: Footer email break-words**

In `src/components/Footer.jsx` line 52, change:
```jsx
className="hover:text-white transition-colors break-all"
```
To:
```jsx
className="hover:text-white transition-colors break-words"
```

- [ ] **Step 7: Build and verify**

Run: `npx vite build`
Expected: Build succeeds with no errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/Hero.jsx src/components/CartDrawer.jsx src/pages/Login.jsx src/pages/Category.jsx src/pages/Product.jsx src/pages/Cart.jsx src/components/Footer.jsx src/components/CategoryCard.jsx
git commit -m "fix: font references, StickyATC on product page, cart mobile UX improvements"
```

---

### Task 7: Final Build Verification

- [ ] **Step 1: Full production build**

Run: `npx vite build`
Expected: Build succeeds with zero errors.

- [ ] **Step 2: Check for any remaining prata-regular references**

Run: `grep -r "prata-regular" src/`
Expected: No matches found.

- [ ] **Step 3: Verify no broken imports**

Run: `npx vite build 2>&1 | grep -i error`
Expected: No output (no errors).
