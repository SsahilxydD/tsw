import React from 'react'
import OurPolicy from '../components/OurPolicy'
import Categories from '../components/Categories'
import Hero from '../components/Hero'
import SEO from '../components/SEO'
// Eagerly import sliders - Vite will still code-split them via manual chunks
import HeroSlider from '../components/HeroSlider'
import AllCategoriesSlider from '../components/AllCategoriesSlider'
import DiscountedSlider from '../components/DiscountedSlider'

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

      {/* Sliders - eagerly loaded but code-split via Vite manual chunks */}
      <HeroSlider />
      <AllCategoriesSlider />
      <DiscountedSlider />
      <Categories />
      <OurPolicy />
    </div>
  )
}

export default Home
