import SafeImg from "./SafeImg";

// Hero image - Cloudflare Images (resized via URL params by SafeImg)
const HERO_CLOUDFLARE = "https://imagedelivery.net/Ysm_SanI713eaOY5mRhkPQ/33b43c5b-c26c-4f5b-3adf-fec4eaada300/public";

const Hero = () => {
  return (
    <div data-hero className="w-full hero-viewport overflow-hidden bg-black">
      {/* Mobile hero image */}
      <SafeImg
        className="w-full h-full object-cover sm:hidden"
        src={HERO_CLOUDFLARE}
        alt="Hero banner"
        width={750}
        height={1000}
        loading="eager"
        fetchPriority="high"
        quality={80}
      />
      {/* Desktop hero image from Cloudflare Images */}
      <SafeImg
        className="w-full h-full object-cover hidden sm:block"
        src={HERO_CLOUDFLARE}
        alt="Hero banner"
        width={1600}
        height={900}
        loading="eager"
        fetchPriority="high"
        quality={80}
      />
    </div>
  );
};

export default Hero;
