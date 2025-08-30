import React from "react";
import { assets } from "../assets/assets";

const Hero = () => {
  // Prefer a lightweight video preload; fall back to image if video missing
  const hasVideo = Boolean(assets.hero_video);
  const poster = assets.hero_poster || assets.hero_image || "";

  return (
    <div className="relative w-full h-[80vh] sm:h-[90vh] border border-gray-400 overflow-hidden animate-fade-in">
      {hasVideo ? (
        <video
          className="absolute top-0 left-0 w-full h-full object-cover"
          src={assets.hero_video}
          playsInline
          muted
          autoPlay
          loop
          preload="metadata"          // faster first paint on mobile
          poster={poster || undefined}
        />
      ) : (
        <img
          className="absolute top-0 left-0 w-full h-full object-cover"
          src={poster}
          alt=""
          loading="eager"
          decoding="async"
          fetchpriority="high"
        />
      )}

      {/* overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-white px-4 animate-blur-up">
        <div className="flex items-center gap-2">
        </div>

        <h1 className="prata-regular text-3xl sm:py-3 lg:text-5xl leading-relaxed">
          THE SOLO WARDROBE
        </h1>

        <div className="flex items-center gap-2 mt-2">
          <p className="font-semibold text-sm md:text-base">HONEST PRICES, CURATED DROPS</p>
          <p className="w-8 md:w-11 h-[1px] bg-white"></p>
        </div>
      </div>
    </div>
  );
};

export default Hero;
