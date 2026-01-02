import cart_icon from './cart_icon.png'
import bin_icon from './bin_icon.png'
import dropdown_icon from './dropdown_icon.png'
import exchange_icon from './exchange_icon.png'
import profile_icon from './profile_icon.png'
import quality_icon from './quality_icon.png'
import search_icon from './search_icon.png'
import star_dull_icon from './star_dull_icon.png'
import star_icon from './star_icon.png'
import support_img from './support_img.png'
import menu_icon from './menu_icon.png'
import cross_icon from './cross_icon.png'
import same_day_dispatch from './same_day_dispatch.png'

// IMPORTANT:
// Keep this module small. It is imported by Navbar/Footer/etc.
// Do NOT import demo product images here, otherwise they get bundled into the main JS.

export const assets = {
  // Use the public favicon as logo to avoid bundling a huge source PNG (Lighthouse warns on oversized logo downloads).
  logo: "/favicon.png",
  cart_icon,
  dropdown_icon,
  exchange_icon,
  profile_icon,
  quality_icon,
  search_icon,
  star_dull_icon,
  star_icon,
  bin_icon,
  support_img,
  menu_icon,
  cross_icon,
  same_day_dispatch,
};
