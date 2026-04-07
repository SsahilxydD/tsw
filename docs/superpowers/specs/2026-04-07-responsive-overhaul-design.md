# Responsive Overhaul — Full Spectrum (320px–1440px+)

**Date:** 2026-04-07
**Scope:** Surgical fix pass across ~40 files. No architecture changes.
**Target:** Every breakpoint from 320px (small phones) through 1440px+ (wide desktop).

---

## Section 1: Global CSS Fixes

### 1.1 Remove forced mobile transition override
**File:** `src/index.css` lines 19–26
**Action:** Delete the `transition-duration: 0.2s !important` rule inside the `@media (max-width: 639px)` block. The `prefers-reduced-motion` block already handles accessibility; this rule overrides Framer Motion and all intentional animation durations.

### 1.2 Fix navbar spacer
**File:** `src/App.jsx` line 83–85
**Action:** Make the spacer height conditional on whether the announcement bar is shown. Currently hardcoded at `h-[100px] sm:h-[92px]` even when the announcement bar is hidden on `/category/discounted`, causing a 36px phantom gap.
**Fix:** Check the same route pattern the Navbar uses (`showAnnouncement`) and conditionally render `h-[64px] sm:h-[56px]` when the bar is hidden, `h-[100px] sm:h-[92px]` when shown.

### 1.3 Add print styles
**File:** `src/index.css`
**Action:** Add a `@media print` block that hides all fixed-position chrome: Navbar, BottomDock, WhatsAppCTA, StickyATC, CartStickyBar, AnnouncementBar, ScrollProgress, Notice.

### 1.4 Fix overflow-x: hidden
**File:** `src/index.css` lines 48–52
**Action:** Move `overflow-x: hidden` from the mobile-only media query to a global rule on `html` only (remove from `body` which breaks Safari iOS sticky positioning).

### 1.5 Remove unused xs breakpoint
**File:** `tailwind.config.js` line 54
**Action:** Remove `'xs': '375px'` — it's defined but never used in any component.

### 1.6 Remove redundant fontSize redeclarations
**File:** `tailwind.config.js` lines 22–31
**Action:** Remove the `fontSize` extension that redeclares Tailwind defaults with identical values.

---

## Section 2: Z-Index & Fixed Element Stacking

### 2.1 WhatsAppCTA overlap with StickyATC
**File:** `src/components/WhatsAppCTA.jsx`
**Action:** Change mobile position from `bottom-20` (80px) to `bottom-28` (112px) to clear the StickyATC bar (occupies ~56–104px from bottom). Lower z-index from `z-40` to `z-30`.

### 2.2 Notice toast behind StickyATC
**File:** `src/components/Notice.jsx`
**Action:** Change from `bottom-[84px]` to `bottom-[124px]` on mobile to clear StickyATC + BottomDock stack.

### 2.3 StickyATC safe-area double-padding
**File:** `src/components/StickyATC.jsx`
**Action:** Remove the `pb-[max(env(safe-area-inset-bottom),0px)]` wrapper padding. StickyATC sits at `bottom-[56px]` above the dock which handles its own safe area. The extra padding pushes it too high on notched iPhones.

### 2.4 Address.jsx sticky header under Navbar
**File:** `src/pages/Address.jsx` line 288
**Action:** Remove `sticky top-0 z-10` from the checkout header. It conflicts with the fixed Navbar. Use normal document flow — the form is short enough that the header scrolls naturally.

---

## Section 3: BottomDock Clearance

Add bottom padding to every page to clear the 56px BottomDock on mobile.

| Page | File | Fix |
|------|------|-----|
| Home | `src/pages/Home.jsx` | Add `pb-20 md:pb-0` to page wrapper |
| Product | `src/pages/Product.jsx` | Change to `pb-32 md:pb-10` (clears StickyATC + dock) |
| Collection | `src/pages/Collection.jsx` | Add `pb-20 md:pb-0` after sentinel |
| Category | `src/pages/Category.jsx` | Same as Collection |
| Cart | `src/pages/Cart.jsx` | Add `pb-20 md:pb-0` to page root |
| Wishlist | `src/pages/Wishlist.jsx` | Change bottom to `pb-20 md:pb-16` |
| About | `src/pages/About.jsx` | Change spacer from `h-10` to `h-20 md:h-10` |
| Contact | `src/pages/Contact.jsx` | Add `pb-20 md:pb-0` to page root |
| Orders | `src/pages/Orders.jsx` | Add `pb-20 md:pb-0` to wrapper |
| Login | `src/pages/Login.jsx` | Add `pb-20 md:pb-0` to wrapper |
| Payment | `src/pages/Payment.jsx` | Add `pb-32 md:pb-0` (has CartStickyBar) |
| CategoriesPage | `src/components/Categories.jsx` | Change `mb-10` to `mb-20 md:mb-10` |
| Footer | `src/components/Footer.jsx` | Change `pb-[72px]` to `pb-24` (96px) |

---

## Section 4: 320px Overflow Fixes

### 4.1 Product.jsx 3 CTA buttons
**File:** `src/pages/Product.jsx` ~line 580
**Action:** Wrap the CTA row as `flex-col sm:flex-row`. "Add to Cart" and "Buy Now" stack vertically below `sm`, wishlist heart stays inline with "Add to Cart".

### 4.2 Orders.jsx button row
**File:** `src/pages/Orders.jsx` ~line 28
**Action:** Change `flex gap-3` to `flex flex-col sm:flex-row gap-3`.

### 4.3 Login.jsx button row
**File:** `src/pages/Login.jsx` ~line 19
**Action:** Change `flex gap-3` to `flex flex-col sm:flex-row gap-3`.

### 4.4 Wishlist.jsx header overflow
**File:** `src/pages/Wishlist.jsx` ~line 67
**Action:** Change header from `flex items-center justify-between` to `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`.

### 4.5 Collection/Category product grid
**Files:** `src/pages/Collection.jsx`, `src/pages/Category.jsx`
**Action:** Change `grid-cols-3` to `grid-cols-2 sm:grid-cols-3` for the product grid.

### 4.6 CartRecommendations and RelatedProducts grids
**Files:** `src/components/CartRecommendations.jsx`, `src/components/RelatedProducts.jsx`
**Action:** Change `grid-cols-3` to `grid-cols-2 sm:grid-cols-3`.

### 4.7 Address.jsx name fields
**File:** `src/pages/Address.jsx` ~line 310
**Action:** Change `grid-cols-2` to `grid-cols-1 sm:grid-cols-2` for the name row.

### 4.8 BottomDock "Categories" label
**File:** `src/components/BottomDock.jsx`
**Action:** Shorten label from "Categories" to "Shop" to prevent text wrapping with 5 dock items at 320px.

### 4.9 CartDrawer quantity stepper
**File:** `src/components/CartDrawer.jsx` ~line 207–222
**Action:** Reduce mobile stepper button size from `min-w-[44px] min-h-[44px]` to `min-w-[36px] min-h-[36px]` inside the drawer.

---

## Section 5: Tablet Breakpoint Gaps (768px)

### 5.1 Product.jsx gallery layout
**File:** `src/pages/Product.jsx` ~line 341
**Action:** Change `grid-cols-1 lg:grid-cols-2` to `grid-cols-1 md:grid-cols-2`.

### 5.2 Collection/Category sidebar and grid
**Files:** `src/pages/Collection.jsx`, `src/pages/Category.jsx`
**Action:** Change sidebar visibility from `hidden sm:block` to `hidden md:block`. Keep `min-w-60` but apply only at `md:min-w-60`. Add `md:grid-cols-3` to the product grid explicitly.

### 5.3 Category sub-category tiles
**File:** `src/pages/Category.jsx` ~line 513
**Action:** Add `sm:grid-cols-4` to the sub-category tile grid (mobile version).

### 5.4 About.jsx cards
**File:** `src/pages/About.jsx` ~lines 39, 60
**Action:** Change card grids to `grid-cols-1 sm:grid-cols-2 md:grid-cols-3`.

### 5.5 Contact.jsx info cards
**File:** `src/pages/Contact.jsx` ~line 66
**Action:** Change `sm:grid-cols-2` to `grid-cols-2` (always 2 columns — cards are small enough).

### 5.6 CartRecommendations/RelatedProducts tablet
**Files:** `src/components/CartRecommendations.jsx`, `src/components/RelatedProducts.jsx`
**Action:** Add `md:grid-cols-4` to fill tablet space.

---

## Section 6: Broken Font, Mobile UX, Remaining Fixes

### 6.1 Fix prata-regular font reference
**Files:** `src/components/Hero.jsx`, `src/components/CartDrawer.jsx`, `src/pages/Login.jsx`, `src/pages/Category.jsx` (2 places), `src/components/CategoryCard.jsx`
**Action:** Replace all `prata-regular` class usages with `font-serif` (maps to Source Serif 4 in Tailwind config).

### 6.2 Import and render StickyATC on Product page
**File:** `src/pages/Product.jsx`
**Action:** Import `StickyATC` component. Render it below `sm` breakpoint, showing product name + price + "Add to Cart" button, positioned at `bottom-[56px]` above the BottomDock.

### 6.3 Cart "Move to wishlist" on mobile
**File:** `src/pages/Cart.jsx` ~line 187
**Action:** Change the "Move to wishlist" link from `hidden sm:flex` to always visible. On mobile, show as a compact heart icon button next to the delete icon. On `sm+`, show the full text link.

### 6.4 Uncomment CartStickyBar on Cart page
**File:** `src/pages/Cart.jsx` ~line 11
**Action:** Uncomment the `CartStickyBar` import and render it at the bottom of the cart page with total + "Proceed to Checkout" button.

### 6.5 Cart item image responsive sizing
**File:** `src/pages/Cart.jsx` ~line 161
**Action:** Change `w-20 h-20` to `w-16 h-16 sm:w-20 sm:h-20`.

### 6.6 Footer email break-words
**File:** `src/components/Footer.jsx` ~line 52
**Action:** Change `break-all` to `break-words` for semantic word-boundary breaks.

---

## Out of Scope

- Slider CLS/skeleton height mismatches (low priority, no user-visible breakage)
- `--rvh` CSS variable consolidation (only used in MobileFilters, works as-is)
- Carousel.css raw font-size values (legacy component, minimal impact)
- index.html cleanup script for apple-mobile-web-app-capable (inert, harmless)
- Landscape orientation handling (significant UX redesign, separate effort)
