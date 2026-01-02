import React from 'react'
import { assets } from '../assets/assets'
import { Link } from 'react-router-dom'
import SafeImg from './SafeImg'

const Footer = () => {
  return (
    <footer className="bg-primary text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-12 mb-12">
        {/* Brand */}
        <div className="space-y-6">
          <Link to="/" className="block">
            {assets.logo ? (
              <SafeImg
                src={assets.logo}
                className="h-8 w-8 object-contain brightness-0 invert"
                alt="Solo Wardrobe"
                width={32}
                height={32}
                quality={90}
              />
            ) : (
              <span className="font-serif text-2xl font-bold tracking-tight">SOLO WARDROBE</span>
            )}
          </Link>
          <p className="text-gray-300 text-sm leading-relaxed max-w-xs">
            Curated essentials for the modern individual. Honest prices, premium quality, and timeless design.
          </p>
        </div>

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
              <a href="tel:+919933778870" className="hover:text-white transition-colors">+91 99337 78870</a>
            </li>
            <li>
              <a href="mailto:thesolowardrobe@gmail.com" className="hover:text-white transition-colors">thesolowardrobe@gmail.com</a>
            </li>
            <li className="pt-2">
              <a
                href="https://wa.me/919933778870"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-white border border-white/20 px-4 py-2 rounded hover:bg-white hover:text-black transition-colors"
              >
                Chat on WhatsApp
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-400">
        <p>&copy; {new Date().getFullYear()} Solo Wardrobe. All rights reserved.</p>
        <div className="flex gap-6">
          <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
        </div>
      </div>
    </footer>
  )
}

export default Footer;
