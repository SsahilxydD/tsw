import React from "react";
import { assets } from "../assets/assets";
import { motion } from "framer-motion";

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
      const tryPlay = () => { try { v.play().catch(() => { }); } catch { } };
      tryPlay();
      v.addEventListener('loadeddata', tryPlay);
      v.addEventListener('canplay', tryPlay);
      return () => { try { v.removeEventListener('loadeddata', tryPlay); v.removeEventListener('canplay', tryPlay); } catch { } };
    } catch { }
  }, []);

  return (
    <div className="relative w-full h-[85vh] sm:h-[95vh] overflow-hidden bg-black">
      <video
        ref={vidRef}
        className="absolute top-0 left-0 w-full h-full object-cover opacity-90"
        src={assets.hero_video}
        playsInline
        muted
        autoPlay
        loop
        preload="auto"
      />

      {/* overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />

      {/* content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-white px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl tracking-tight leading-tight mb-4">
            The Solo Wardrobe
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="flex flex-col items-center gap-4"
        >
          <div className="flex items-center gap-3">
            <span className="h-[1px] w-8 sm:w-12 bg-accent/80"></span>
            <p className="font-sans text-sm sm:text-base tracking-[0.2em] uppercase text-accent-light">
              Honest Prices, Curated Drops
            </p>
            <span className="h-[1px] w-8 sm:w-12 bg-accent/80"></span>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="mt-8 px-8 py-3 bg-white text-black font-medium text-sm tracking-widest hover:bg-accent hover:text-white transition-colors duration-300"
            onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
          >
            EXPLORE COLLECTION
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};

export default Hero;
