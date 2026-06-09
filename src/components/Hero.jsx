import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <div data-hero className="relative w-full hero-viewport overflow-hidden bg-black">
      {/* Mobile hero image */}
      <img
        className="w-full h-full object-cover sm:hidden"
        src="/mobile.webp"
        alt="Solo Wardrobe"
        width={1080}
        height={1935}
        loading="eager"
        fetchPriority="high"
      />
      {/* Desktop hero image */}
      <img
        className="w-full h-full object-cover hidden sm:block"
        src="/pc.webp"
        alt="Solo Wardrobe"
        width={1920}
        height={1072}
        loading="eager"
        fetchPriority="high"
      />

      {/* Dark gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

      {/* Text overlay — bottom-center on mobile, bottom-left on desktop */}
      <div className="absolute bottom-0 left-0 right-0 px-6 pb-12 sm:pb-16 md:pb-20 sm:px-12 lg:px-20">
        <div className="max-w-xl text-center sm:text-left animate-slide-up">
          <h1 className="font-serif text-3xl sm:text-4xl md:text-4xl text-white leading-tight tracking-tight">
            Curated Drops, Honest Prices
          </h1>

          <p className="mt-3 text-sm sm:text-base text-white/80 font-light max-w-md mx-auto sm:mx-0">
            Premium fashion essentials at prices that make sense
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <Link
              to="/collection"
              className="inline-block bg-white text-primary font-medium text-sm tracking-wide px-8 py-3 rounded-full
                         transition-all duration-300 hover:bg-white/90 hover:shadow-lg hover:scale-105
                         active:scale-100"
            >
              Shop Now
            </Link>

            <Link
              to="/category/discounted"
              className="inline-block text-white/90 text-sm font-light tracking-wide
                         transition-colors duration-300 hover:text-white underline underline-offset-4 decoration-white/40
                         hover:decoration-white/80 py-3"
            >
              View Sale &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
