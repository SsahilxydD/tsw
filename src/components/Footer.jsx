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
        </div>
      </div>
    </footer>
  );
};

export default Footer;

