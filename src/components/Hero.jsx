import React from "react";
import { assets } from "../assets/assets";

const Hero = () => {
  const vidRef = React.useRef(null);

  React.useEffect(() => {
    const v = vidRef.current;
    if (!v) return;
    try {
      v.muted = true; // required for autoplay
      v.setAttribute('muted', '');
      v.playsInline = true;
      v.setAttribute('playsinline', '');
      v.setAttribute('webkit-playsinline', '');
      const tryPlay = () => { try { v.play().catch(() => {}); } catch {} };
      tryPlay();
      v.addEventListener('loadeddata', tryPlay);
      v.addEventListener('canplay', tryPlay);
      return () => { try { v.removeEventListener('loadeddata', tryPlay); v.removeEventListener('canplay', tryPlay); } catch {} };
    } catch {}
  }, []);

  return (
    <div className="relative w-full h-[80vh] sm:h-[90vh] border border-gray-400 overflow-hidden">
      <video
        ref={vidRef}
        className="absolute top-0 left-0 w-full h-full object-cover"
        src={assets.hero_video}
        playsInline
        muted
        autoPlay
        loop
        preload="auto"
      />

      {/* overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-white px-4">
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
