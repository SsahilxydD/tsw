import React, { useState } from "react";

const FALLBACK =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="22" fill="%239ca3af">Image unavailable</text></svg>';

export default function SafeImg({ src, alt = "", className = "", loading = "lazy", ...rest }) {
  const [loaded, setLoaded] = useState(false);
  const [broken, setBroken] = useState(false);

  const finalSrc = broken || !src ? FALLBACK : src;

  return (
    <img
      src={finalSrc}
      alt={alt}
      loading={loading}
      draggable={false}
      onLoad={() => setLoaded(true)}
      onError={() => setBroken(true)}
      className={`${className} ${loaded ? "opacity-100" : "opacity-0"} transition-opacity duration-300 ease-out motion-reduce:transition-none`}
    {...rest}
    />
  );
}
