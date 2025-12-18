import React, { useState } from "react";

const FALLBACK =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="22" fill="%239ca3af">Image unavailable</text></svg>';

/**
 * SafeImg - Optimized image component with Cloudflare Images support
 * 
 * Works with Cloudflare Images (imagedelivery.net) when Flexible Variants is enabled.
 * Automatically resizes images and converts to WebP/AVIF via URL parameters.
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
  fetchPriority,
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

  // Generate Cloudflare Images optimized URL
  const getCFOptimizedUrl = (originalSrc, w, h) => {
    if (!originalSrc || !CF_IMAGE_RESIZING) return originalSrc;
    
    // Skip if already a data URL
    if (originalSrc.startsWith('data:')) return originalSrc;
    
    // Skip local files (relative paths) - they shouldn't be resized
    if (originalSrc.startsWith('/') && !originalSrc.startsWith('//')) return originalSrc;
    
    // Skip R2 URLs and other non-Cloudflare Images URLs
    if (!originalSrc.includes('imagedelivery.net')) return originalSrc;
    
    // Check if this is a Cloudflare Images URL (imagedelivery.net)
    if (originalSrc.includes('imagedelivery.net')) {
      // Cloudflare Images format: https://imagedelivery.net/{account_hash}/{image_id}/{variant}
      // With flexible variants enabled, we can use URL parameters for resizing
      const url = new URL(originalSrc);
      const pathParts = url.pathname.split('/');
      
      // Extract account hash, image ID, and variant
      if (pathParts.length >= 4) {
        const accountHash = pathParts[1];
        const imageId = pathParts[2];
        const variant = pathParts[3] || 'public';
        
        // Build resizing parameters
        const resizeParams = [];
        if (w) resizeParams.push(`w=${w}`);
        if (h) resizeParams.push(`h=${h}`);
        resizeParams.push(`q=${quality}`); // Always include quality
        resizeParams.push('f=auto'); // Auto format (WebP/AVIF when supported)
        if (fit !== 'cover') resizeParams.push(`fit=${fit}`);
        
        // If we have resize params, use them; otherwise use the variant
        if (resizeParams.length > 0) {
          return `https://imagedelivery.net/${accountHash}/${imageId}/${resizeParams.join(',')}`;
        }
        
        // Fallback to variant if no resize params
        return `https://imagedelivery.net/${accountHash}/${imageId}/${variant}`;
      }
    }
    
    // For non-Cloudflare Images URLs, return as-is (or use /cdn-cgi/image/ if on your domain)
    return originalSrc;
  };

  const finalSrc = broken || !src ? FALLBACK : src;

  // Generate srcset for responsive images (only for Cloudflare Images URLs)
  const generateSrcSet = () => {
    if (!src || broken || !width || !CF_IMAGE_RESIZING) return undefined;
    
    // Only generate srcset for Cloudflare Images URLs
    if (!src.includes('imagedelivery.net')) return undefined;
    
    // Skip for local files
    if (src.startsWith('/') && !src.startsWith('//')) return undefined;
    
    const widths = [width, width * 1.5, width * 2].map(Math.round);
    return widths.map(w => {
      const h = height ? Math.round((height / width) * w) : undefined;
      return `${getCFOptimizedUrl(src, w, h)} ${w}w`;
    }).join(', ');
  };

  const srcSet = generateSrcSet();
  
  // Only optimize Cloudflare Images URLs, leave local/R2 files as-is
  const shouldOptimize = CF_IMAGE_RESIZING && width && 
    src && 
    src.includes('imagedelivery.net') && 
    !src.startsWith('/');
  
  const optimizedSrc = shouldOptimize
    ? getCFOptimizedUrl(finalSrc, width, height) 
    : finalSrc;

  // Build props object, handling fetchPriority separately
  const imgProps = {
    src: optimizedSrc,
    srcSet: srcSet,
    sizes: sizes || (width ? `(max-width: 768px) 100vw, ${width}px` : undefined),
    alt: alt,
    width: width,
    height: height,
    loading: loading,
    decoding: loading === "eager" ? "sync" : "async",
    draggable: false,
    onError: () => setBroken(true),
    className: className,
    ...rest
  };

  // Add fetchpriority (lowercase) if fetchPriority is provided
  if (fetchPriority) {
    imgProps.fetchpriority = fetchPriority;
  }

  return <img {...imgProps} />;
}
