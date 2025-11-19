import { useMemo, useState, useEffect } from "react";
import { useLocation, matchPath } from "react-router-dom";

// Global cache to store rendered route components
const routeCache = new Map();
const MAX_CACHE = 10;

/**
 * CachedRoute - A route wrapper that keeps components mounted
 * This prevents the "reloading" effect when navigating back
 */
export default function CachedRoute({ path, element, children, exact = false }) {
  const location = useLocation();
  const match = matchPath({ path, end: exact }, location.pathname);
  const isActive = !!match;
  
  const [cache, setCache] = useState(() => {
    // Initialize cache with current route if it matches
    if (isActive) {
      const key = location.pathname;
      if (!routeCache.has(key)) {
        routeCache.set(key, element || children);
      }
      return { [key]: routeCache.get(key) };
    }
    return {};
  });

  // Update cache when route becomes active
  useEffect(() => {
    if (isActive) {
      const key = location.pathname;
      const cached = routeCache.get(key);
      
      if (cached) {
        // Use cached version
        setCache((prev) => ({ ...prev, [key]: cached }));
      } else {
        // Cache the current element
        const elementToCache = element || children;
        routeCache.set(key, elementToCache);
        setCache((prev) => ({ ...prev, [key]: elementToCache }));
      }
      
      // Clean up old cache entries
      if (routeCache.size > MAX_CACHE) {
        const keys = Array.from(routeCache.keys());
        const toRemove = keys.slice(0, keys.length - MAX_CACHE);
        toRemove.forEach((k) => routeCache.delete(k));
      }
    }
  }, [isActive, location.pathname, element, children]);

  // Render cached routes, showing only the active one
  return (
    <>
      {Object.entries(cache).map(([cachedPath, cachedElement]) => (
        <div
          key={cachedPath}
          style={{
            display: cachedPath === location.pathname ? "block" : "none",
          }}
        >
          {cachedElement}
        </div>
      ))}
      {/* Render current route if not cached yet */}
      {isActive && !cache[location.pathname] && (element || children)}
    </>
  );
}

