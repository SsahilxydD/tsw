import React, { useState } from "react";

const FALLBACK =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="22" fill="%239ca3af">Image unavailable</text></svg>';

/**
 * SafeImg - Optimized image component with Cloudflare Image Resizing support
 * 
 * If using Cloudflare with Image Resizing enabled, images are automatically
 * resized and converted to WebP via the /cdn-cgi/image/ endpoint.
 * 
 * Props:
 * - width/height: Display dimensions (used for srcset and aspect ratio)
 * - quality: Image quality 1-100 (default: 80)
 * - fit: How to fit image - "cover", "contain", "scale-down" (default: "cover")
 */
export default function SafeImg({ 
  src, 
  alt = "", 
  className = "", 
  loading = "lazy",
  width,
  height,
  quality = 80,
  fit = "cover",
  sizes,
  ...rest 
}) {
  const [broken, setBroken] = useState(false);

  // Check if Cloudflare Image Resizing is available (set to true if you've enabled it)
  const CF_IMAGE_RESIZING = true; // Set to true after enabling in Cloudflare dashboard

  // Generate Cloudflare optimized URL
  const getCFOptimizedUrl = (originalSrc, w) => {
    if (!originalSrc || !CF_IMAGE_RESIZING) return originalSrc;
    
    // Skip if already a data URL or external URL
    if (originalSrc.startsWith('data:')) return originalSrc;
    
    // Build Cloudflare Image Resizing URL
    // Format: /cdn-cgi/image/width=X,quality=Y,format=auto/original-path
    const params = [`width=${w}`, `quality=${quality}`, 'format=auto', `fit=${fit}`];
    
    // Handle relative and absolute URLs
    if (originalSrc.startsWith('http')) {
      const url = new URL(originalSrc);
      return `${url.origin}/cdn-cgi/image/${params.join(',')}${url.pathname}`;
    }
    
    return `/cdn-cgi/image/${params.join(',')}${originalSrc}`;
  };

  const finalSrc = broken || !src ? FALLBACK : src;

  // Generate srcset for responsive images (if width is provided and CF is enabled)
  const generateSrcSet = () => {
    if (!src || broken || !width || !CF_IMAGE_RESIZING) return undefined;
    
    const widths = [width, width * 1.5, width * 2].map(Math.round);
    return widths.map(w => `${getCFOptimizedUrl(src, w)} ${w}w`).join(', ');
  };

  const srcSet = generateSrcSet();
  const optimizedSrc = CF_IMAGE_RESIZING && width ? getCFOptimizedUrl(finalSrc, width) : finalSrc;

  return (
    <img
      src={optimizedSrc}
      srcSet={srcSet}
      sizes={sizes || (width ? `(max-width: 768px) 100vw, ${width}px` : undefined)}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      decoding="async"
      draggable={false}
      onError={() => setBroken(true)}
      className={className}
      {...rest}
    />
  );
}
