import React from "react";
import { Helmet } from "react-helmet-async";

function safeJsonLd(obj) {
  return JSON.stringify(obj).replace(/<\/script>/gi, '<\\/script>');
}

/**
 * Convert relative image path to absolute HTTPS URL
 * @param {string} imagePath - Image path (relative or absolute)
 * @returns {string} Absolute HTTPS URL
 */
function toAbsoluteUrl(imagePath) {
  if (!imagePath) return "";

  // Already absolute URL
  if (/^https?:\/\//i.test(imagePath)) {
    return imagePath;
  }

  // Get base URL (site domain)
  const baseUrl = "https://thesolowardrobe.com";

  // Handle relative paths
  if (imagePath.startsWith("/")) {
    return `${baseUrl}${imagePath}`;
  }

  return `${baseUrl}/${imagePath}`;
}

export default function SEO({
  title,
  description,
  url,
  image,
  type = "website",
  canonical,
  jsonLd,
  // Product-specific fields
  price,
  currency = "INR",
  imageWidth,
  imageHeight,
}) {
  const safeTitle = title ? String(title) : "Solo Wardrobe";
  const safeDesc = description ? String(description) : "Solo Wardrobe – honest prices, curated drops.";
  const pageUrl = url ? String(url) : "";
  const canonicalUrl = canonical || pageUrl || "";

  // Convert image to absolute HTTPS URL
  const imageUrl = toAbsoluteUrl(image || "/favicon.png");

  return (
    <Helmet>
      {safeTitle ? <title>{safeTitle}</title> : null}
      {safeDesc ? <meta name="description" content={safeDesc} /> : null}
      {canonicalUrl ? <link rel="canonical" href={canonicalUrl} /> : null}

      {/* Open Graph */}
      {safeTitle ? <meta property="og:title" content={safeTitle} /> : null}
      {safeDesc ? <meta property="og:description" content={safeDesc} /> : null}
      {pageUrl ? <meta property="og:url" content={pageUrl} /> : null}
      <meta property="og:type" content={type} />
      {imageUrl ? <meta property="og:image" content={imageUrl} /> : null}
      {imageUrl ? <meta property="og:image:secure_url" content={imageUrl} /> : null}
      {imageWidth ? <meta property="og:image:width" content={String(imageWidth)} /> : null}
      {imageHeight ? <meta property="og:image:height" content={String(imageHeight)} /> : null}
      {imageUrl ? <meta property="og:image:type" content="image/jpeg" /> : null}
      <meta property="og:site_name" content="Solo Wardrobe" />

      {/* Product-specific Open Graph tags */}
      {type === "product" && price ? (
        <>
          <meta property="product:price:amount" content={String(price)} />
          <meta property="product:price:currency" content={currency} />
        </>
      ) : null}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      {safeTitle ? <meta name="twitter:title" content={safeTitle} /> : null}
      {safeDesc ? <meta name="twitter:description" content={safeDesc} /> : null}
      {imageUrl ? <meta name="twitter:image" content={imageUrl} /> : null}

      {/* JSON-LD */}
      {Array.isArray(jsonLd)
        ? jsonLd.filter(Boolean).map((obj, i) => (
            <script key={i} type="application/ld+json">{safeJsonLd(obj)}</script>
          ))
        : (jsonLd ? (
            <script type="application/ld+json">{safeJsonLd(jsonLd)}</script>
          ) : null)
      }
    </Helmet>
  );
}


