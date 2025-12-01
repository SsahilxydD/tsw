// Hero image is served from /public for predictable URL and preloading
const HERO_SRC = "/hero.webp";

const Hero = () => {
  return (
    <div className="w-full h-[85vh] sm:h-[95vh] overflow-hidden bg-black">
      <img
        className="w-full h-full object-cover"
        src={HERO_SRC}
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
