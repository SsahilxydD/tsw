import React, { lazy, Suspense, useEffect, useState } from 'react'
import Hero from '../components/Hero'
import SEO from '../components/SEO'

// Below-the-fold: use dynamic imports so Vite does NOT modulepreload these on initial navigation.
const HeroSlider = lazy(() => import('../components/HeroSlider'))
const AllCategoriesSlider = lazy(() => import('../components/AllCategoriesSlider'))
const DiscountedSlider = lazy(() => import('../components/DiscountedSlider'))
const RecentlyViewed = lazy(() => import('../components/RecentlyViewed'))

const OurPolicy = lazy(() => import('../components/OurPolicy'))

const Home = () => {
  // Defer below-the-fold content so Lighthouse doesn't download dozens of product images during LCP.
  const [showBelowFold, setShowBelowFold] = useState(false);

  useEffect(() => {
    let t;
    // Prefer requestIdleCallback, fallback to a small timeout.
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      // @ts-ignore
      const id = window.requestIdleCallback(() => setShowBelowFold(true), { timeout: 1500 });
      return () => { try { /* @ts-ignore */ window.cancelIdleCallback?.(id); } catch {} };
    }
    t = setTimeout(() => setShowBelowFold(true), 900);
    return () => clearTimeout(t);
  }, []);

  return (
    <div>
      <SEO
        title="Solo Wardrobe – Honest prices, curated drops"
        description="Discover everyday pieces that last. Shop curated apparel, accessories, and more at honest prices."
        url={typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''}
        canonical={typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''}
        image="/favicon.png"
        type="website"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Solo Wardrobe",
            "url": typeof window !== 'undefined' ? window.location.origin : '',
            "logo": "/favicon.png"
          },
          {
            "@context": "https://schema.org",
            "@type": "SiteNavigationElement",
            "name": ["Home", "About", "Contact", "Chat on WhatsApp"],
            "url": [
              typeof window !== 'undefined' ? window.location.origin + '/' : '/',
              typeof window !== 'undefined' ? window.location.origin + '/about' : '/about',
              typeof window !== 'undefined' ? window.location.origin + '/contact' : '/contact',
              "https://wa.me/919933778870"
            ]
          }
        ]}
      />

      <Hero />

      {/* Below-the-fold content */}
      {showBelowFold ? (
        <Suspense fallback={null}>
          <HeroSlider />
          <AllCategoriesSlider />
          <DiscountedSlider />
          <RecentlyViewed maxItems={10} />
          <OurPolicy />
        </Suspense>
      ) : (
        <div className="w-full py-6 bg-gray-50/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="h-6 w-56 bg-gray-200 rounded animate-pulse" />
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Home
