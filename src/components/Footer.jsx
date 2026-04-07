import React from 'react'
import { assets } from '../assets/assets'
import { Link } from 'react-router-dom'
import SafeImg from './SafeImg'

const Footer = () => {
  return (
    <footer className="bg-primary text-white pt-16 pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-12">
        {/* Logo + tagline centered */}
        <div className="flex flex-col items-center text-center mb-10">
          <Link to="/" className="block">
            {assets.logo ? (
              <SafeImg
                src={assets.logo}
                className="h-12 w-auto object-contain"
                alt="Solo Wardrobe"
                width={48}
                height={48}
                quality={90}
              />
            ) : (
              <span className="font-serif text-2xl font-bold tracking-tight">SOLO WARDROBE</span>
            )}
          </Link>
          <p className="text-gray-300 text-sm leading-relaxed max-w-xs mt-4">
            Curated essentials for the modern individual. Honest prices, premium quality, and timeless design.
          </p>
        </div>

        {/* Company + Get in Touch side by side */}
        <div className="grid grid-cols-2 gap-8 max-w-md mx-auto">
          {/* Company */}
          <div>
            <h3 className="font-serif text-lg font-medium mb-6">Company</h3>
            <ul className="space-y-4 text-sm text-gray-300">
              <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              <li><Link to="/orders" className="hover:text-white transition-colors">My Orders</Link></li>
            </ul>
          </div>

          {/* Get in Touch */}
          <div>
            <h3 className="font-serif text-lg font-medium mb-6">Get in Touch</h3>
            <ul className="space-y-4 text-sm text-gray-300">
              <li>
                <a href={`tel:+${import.meta.env.VITE_WHATSAPP_PHONE?.replace(/\D/g, '') || '919933778870'}`} className="hover:text-white transition-colors">{import.meta.env.VITE_WHATSAPP_PHONE || '+91 99337 78870'}</a>
              </li>
              <li>
                <a href="mailto:thesolowardrobe@gmail.com" className="hover:text-white transition-colors break-all">thesolowardrobe@gmail.com</a>
              </li>
            </ul>
          </div>
        </div>

        {/* WhatsApp CTA centered below both columns */}
        <div className="flex justify-center mt-8">
          <a
            href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_PHONE?.replace(/\D/g, '') || '919933778870'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-white border border-white/20 px-5 py-2.5 rounded hover:bg-white hover:text-black transition-colors text-sm"
          >
            Chat on WhatsApp
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-400">
        <p>&copy; {new Date().getFullYear()} Solo Wardrobe. All rights reserved.</p>
        <div className="flex gap-6">
          <span className="hover:text-white transition-colors cursor-default">Privacy Policy</span>
          <span className="hover:text-white transition-colors cursor-default">Terms of Service</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer;
