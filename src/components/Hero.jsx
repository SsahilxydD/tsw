import { assets } from "../assets/assets";

const Hero = () => {
  return (
    <div className="w-full h-[85vh] sm:h-[95vh] overflow-hidden bg-black">
      <img
        className="w-full h-full object-cover"
        src={assets.hero_image}
        alt="Hero banner"
        width={1920}
        height={1080}
        fetchPriority="high"
      />
    </div>
  );
};

export default Hero;
