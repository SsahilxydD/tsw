import React from "react";
import { assets } from "../assets/assets";

const Hero = () => {
  const vidRef = React.useRef(null);

  React.useEffect(() => {
    const v = vidRef.current;
    if (!v) return;
    try {
      v.muted = true;
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
    <div className="w-full h-[85vh] sm:h-[95vh] overflow-hidden bg-black">
      <video
        ref={vidRef}
        className="w-full h-full object-cover"
        src={assets.hero_video}
        playsInline
        muted
        autoPlay
        loop
        preload="auto"
      />
    </div>
  );
};

export default Hero;
