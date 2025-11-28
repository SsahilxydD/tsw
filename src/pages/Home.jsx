import React from 'react'
import OurPolicy from '../components/OurPolicy'
import Categories from '../components/Categories'
import BestSellersFromTopCategories from '../components/BestSellersFromTopCategories'
import HeroSlider from '../components/HeroSlider'
import SEO from '../components/SEO'

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

      <div className="animate-slide-up opacity-0" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
        <HeroSlider />
      </div>

      <div className="animate-slide-up opacity-0" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
        <BestSellersFromTopCategories />
      </div>

      <div className="animate-slide-up opacity-0" style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}>
        <Categories />
      </div>

      <div className="animate-slide-up opacity-0" style={{ animationDelay: '0.8s', animationFillMode: 'forwards' }}>
        <OurPolicy />
      </div>
    </div>
  )
}

export default Home
