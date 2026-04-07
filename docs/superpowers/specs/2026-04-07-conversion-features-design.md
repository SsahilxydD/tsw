# Conversion Features — Sub-project 1

**Date:** 2026-04-07
**Scope:** 4 new display-only components to boost conversion rate and AOV. Zero changes to pricing logic, ShopContext, or cart calculations.

---

## 1. UrgencyBadge

**Component:** `src/components/UrgencyBadge.jsx`

**Props:** `productId` (string), `bestseller` (boolean), `discounted` (boolean)

**Logic:**
- Hash the product ID to a deterministic number 2-7 (same user always sees same number for same product)
- Number 2-3: show "Only X left!" in red with subtle pulse animation
- Number 4-5: show "Selling fast" in orange
- Number 6-7: show nothing
- Bestsellers always show "Selling fast"
- Discounted items always show a badge (use the hashed number to pick between "Only X left" and "Selling fast")

**Hash function:** Simple string hash modulo 6, add 2 to get range 2-7. Must be deterministic (no Math.random).

**Placement:**
- `ProductItem.jsx` — small pill overlay on product card image, bottom-left corner. `text-[10px]`, rounded pill. Positioned opposite the wishlist button (top-right).
- `Product.jsx` — inline badge next to the product name. `text-xs`, same pill style.

**Style:**
- Red variant: `bg-red-50 text-red-600 border border-red-200` + subtle pulse animation (opacity 0.7-1.0, 2s infinite)
- Orange variant: `bg-orange-50 text-orange-600 border border-orange-200`, no animation

---

## 2. PriceDisplay

**Component:** `src/components/PriceDisplay.jsx`

**Props:** `price` (number), `mrp` (number), `currency` (string, default "₹"), `compact` (boolean, default false)

**Display (when mrp > price):**
- Compact mode (cards, drawer, cart items):
  - Sale price bold: `₹1,499`
  - MRP strikethrough gray: `~~₹2,499~~`
  - Small green pill: `SAVE 40%`
- Full mode (product detail page):
  - All of compact, plus:
  - Green text line below: `You save ₹1,000`

**Display (when no mrp or mrp <= price):**
- Just the price in bold, no extras

**Discount calculation:** `Math.round(((mrp - price) / mrp) * 100)` — display only, does NOT modify any pricing state.

**Placement:**
- `ProductItem.jsx` — replace current price rendering with `<PriceDisplay compact />`
- `Product.jsx` — replace current price rendering with `<PriceDisplay />`
- `CartDrawer.jsx` — replace inline price with `<PriceDisplay compact />`
- `Cart.jsx` — replace inline price with `<PriceDisplay compact />`

**Important:** This component ONLY renders. It does not call setCartItems, updateQuantity, getCartTotal, or any state-mutating function. It receives price/mrp as props and displays them.

---

## 3. ShippingProgressBar

**Component:** `src/components/ShippingProgressBar.jsx`

**Props:** none (reads from ShopContext internally)

**Constants:** `FREE_SHIPPING_THRESHOLD = 999` (hardcoded in the component file)

**Logic:**
- Reads `getCartSubtotal()` from ShopContext
- Calculates `remaining = threshold - subtotal`
- Calculates `progress = Math.min(100, (subtotal / threshold) * 100)`
- If remaining > 0: show "Add ₹X more for FREE shipping" + progress bar
- If remaining <= 0: show "You've unlocked FREE shipping!" + full green bar + checkmark

**Placement:**
- `CartDrawer.jsx` — above the totals section in the cart footer
- `Cart.jsx` — above the coupon accordion section

**Style:**
- Bar: `h-1.5 rounded-full bg-gray-200` track, `bg-green-500` fill with `transition-all duration-300`
- Text: `text-xs text-gray-600`, amount in `font-semibold`
- Unlocked state: `text-green-600` text with a small checkmark SVG

**Important:** Display only. Does NOT modify delivery_fee, getCartTotal, getCartSubtotal, or any pricing/cart state. Reads subtotal via getCartSubtotal() for display purposes only.

---

## 4. ShareButton

**Component:** `src/components/ShareButton.jsx`

**Props:** `product` (object with name, price, mrp, _id), `currency` (string, default "₹")

**Logic:**
- Composes a WhatsApp message:
  ```
  Check out this deal on Solo Wardrobe!
  
  *{product.name}* — ₹{price}
  
  {url}
  ```
- If mrp > price, appends "(Save X%!)" after the price
- URL: `${window.location.origin}/product/${product._id}`
- Opens `https://wa.me/?text={encodedMessage}` (no phone number — share to any contact)

**Placement:**
- `Product.jsx` — below the CTA buttons row. Inline text button with WhatsApp SVG icon.

**Style:** `text-sm text-green-600 hover:text-green-700`. WhatsApp SVG icon (16x16) inline before text "Share this deal". No background, no border — just a text link.

---

## Out of Scope

- Cart countdown timer ("reserved for 15:00")
- "X people viewing this" on product pages
- Trust signals / customer count
- Blog/lookbook/SEO pages
- Notify when back in stock
- Price drop alerts
- Any backend changes
- Any changes to ShopContext, cart calculation, or pricing logic
