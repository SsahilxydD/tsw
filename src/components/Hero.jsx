// Hero images - CDN for desktop, local fallback for mobile
const HERO_DESKTOP = "https://imagedelivery.net/Ysm_SanI713eaOY5mRhkPQ/33b43c5b-c26c-4f5b-3adf-fec4eaada300/public";
const HERO_MOBILE = "/hero.webp";

const Hero = () => {
  return (
    <div className="w-full h-[85vh] sm:h-[95vh] overflow-hidden bg-black">
      {/* Mobile hero image */}
      <img
        className="w-full h-full object-cover sm:hidden"
        src={HERO_MOBILE}
        alt="Hero banner"
        width={750}
        height={1000}
        fetchPriority="high"
        decoding="sync"
      />
      {/* Desktop hero image from Cloudflare CDN */}
      <img
        className="w-full h-full object-cover hidden sm:block"
        src={HERO_DESKTOP}
        alt="Hero banner"
        width={1920}
        height={1080}
        fetchPriority="high"
        decoding="sync"
      />
    </div>
  );
};

export default Hero;
