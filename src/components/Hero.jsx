import React from "react";
import { assets } from "../assets/assets";

// Poster image for video - solid color placeholder to prevent CLS
// This ensures the video container has content while video loads
const VIDEO_POSTER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect width="100%" height="100%" fill="%23000000"/></svg>';

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
        poster={VIDEO_POSTER}
        playsInline
        muted
        autoPlay
        loop
        preload="metadata"
        width={1920}
        height={1080}
        fetchPriority="high"
      />
    </div>
  );
};

export default Hero;
