import React from "react";
import { Helmet } from "react-helmet-async";

export default function SEO({
  title,
  description,
  url,
  image,
  type = "website",
  canonical,
  jsonLd,
}) {
  const safeTitle = title ? String(title) : "Solo Wardrobe";
  const safeDesc = description ? String(description) : "Solo Wardrobe – honest prices, curated drops.";
  const pageUrl = url ? String(url) : "";
  const canonicalUrl = canonical || pageUrl || "";
  const imageUrl = image || "/favicon.png";

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

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      {safeTitle ? <meta name="twitter:title" content={safeTitle} /> : null}
      {safeDesc ? <meta name="twitter:description" content={safeDesc} /> : null}
      {imageUrl ? <meta name="twitter:image" content={imageUrl} /> : null}

      {/* JSON-LD */}
      {Array.isArray(jsonLd)
        ? jsonLd.filter(Boolean).map((obj, i) => (
            <script key={i} type="application/ld+json">{JSON.stringify(obj)}</script>
          ))
        : (jsonLd ? (
            <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
          ) : null)
      }
    </Helmet>
  );
}


