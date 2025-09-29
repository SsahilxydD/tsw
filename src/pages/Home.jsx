import React from 'react'
import Hero from '../components/Hero'
import OurPolicy from '../components/OurPolicy'
import Categories from '../components/Categories'
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
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Solo Wardrobe",
          "url": typeof window !== 'undefined' ? window.location.origin : '',
          "logo": "/favicon.png"
        }}
      />
      <Hero />
      <Categories />
      <OurPolicy />
    </div>
  )
}

export default Home
