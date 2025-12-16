import React, { lazy, Suspense } from 'react'
import OurPolicy from '../components/OurPolicy'
import Categories from '../components/Categories'
import Hero from '../components/Hero'
import SEO from '../components/SEO'
import ErrorBoundary from '../components/ErrorBoundary'

// Lazy load heavy slider components (below the fold) to reduce initial bundle
// Add error handling for failed imports
const HeroSlider = lazy(() => 
  import('../components/HeroSlider').catch(err => {
    console.error('Failed to load HeroSlider:', err);
    return { default: () => <div className="h-64 bg-gray-50 animate-pulse" /> };
  })
);
const AllCategoriesSlider = lazy(() => 
  import('../components/AllCategoriesSlider').catch(err => {
    console.error('Failed to load AllCategoriesSlider:', err);
    return { default: () => <div className="h-64 bg-gray-50 animate-pulse" /> };
  })
);
const DiscountedSlider = lazy(() => 
  import('../components/DiscountedSlider').catch(err => {
    console.error('Failed to load DiscountedSlider:', err);
    return { default: () => <div className="h-64 bg-gray-50 animate-pulse" /> };
  })
);

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
      <ErrorBoundary fallback={<div className="h-64 bg-gray-50 animate-pulse" />}>
        <Suspense fallback={<div className="h-64 bg-gray-50 animate-pulse" />}>
          <HeroSlider />
        </Suspense>
      </ErrorBoundary>
      <ErrorBoundary fallback={<div className="h-64 bg-gray-50 animate-pulse" />}>
        <Suspense fallback={<div className="h-64 bg-gray-50 animate-pulse" />}>
          <AllCategoriesSlider />
        </Suspense>
      </ErrorBoundary>
      <ErrorBoundary fallback={<div className="h-64 bg-gray-50 animate-pulse" />}>
        <Suspense fallback={<div className="h-64 bg-gray-50 animate-pulse" />}>
          <DiscountedSlider />
        </Suspense>
      </ErrorBoundary>
      <Categories />
      <OurPolicy />
    </div>
  )
}

export default Home
