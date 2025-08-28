import React from "react";
import { assets } from "../assets/assets";
import { Link } from "react-router-dom";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t bg-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            {assets.logo && (
              <img
                src={assets.logo}
                alt="Solo Wardrobe"
                className="h-10 w-auto object-contain"
                loading="lazy"
              />
            )}
            <p className="text-sm text-gray-500">
              © {year} Solo Wardrobe. All rights reserved.
            </p>
          </div>

          {/* Footer nav */}
          <nav aria-label="Footer">
            <ul className="flex items-center gap-6 text-sm text-gray-700">
              <li><Link to="/about" className="hover:underline">About</Link></li>
              <li><Link to="/contact" className="hover:underline">Contact</Link></li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
