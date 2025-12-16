import React, { lazy, Suspense } from 'react'
import OurPolicy from '../components/OurPolicy'
import Categories from '../components/Categories'
import Hero from '../components/Hero'
import SEO from '../components/SEO'

// Lazy load heavy slider components (below the fold) to reduce initial bundle
const HeroSlider = lazy(() => import('../components/HeroSlider'))
const AllCategoriesSlider = lazy(() => import('../components/AllCategoriesSlider'))
const DiscountedSlider = lazy(() => import('../components/DiscountedSlider'))

const Home = () => {
  return (
    <div>
      <SEO
        title="Solo Wardrobe – Honest prices, curated drops"
        description="Discover everyday pieces that last. Shop curated apparel, accessories, and more at honest prices."
        url={typeof window !== 'undefined' ? window.location.href : ''}
        canonical={typeof window !== 'undefined' ? window.location.href : ''}
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

      {/* Lazy load sliders below the fold */}
      <Suspense fallback={<div className="h-64 bg-gray-50 animate-pulse" />}>
        <HeroSlider />
      </Suspense>
      <Suspense fallback={<div className="h-64 bg-gray-50 animate-pulse" />}>
        <AllCategoriesSlider />
      </Suspense>
      <Suspense fallback={<div className="h-64 bg-gray-50 animate-pulse" />}>
        <DiscountedSlider />
      </Suspense>
      <Categories />
      <OurPolicy />
    </div>
  )
}

export default Home
