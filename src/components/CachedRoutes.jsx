import { useEffect, useState, useMemo, useRef } from "react";
import { useLocation, useRoutes } from "react-router-dom";

/**
 * CachedRoutes - Keeps route components mounted to preserve state
 * This prevents remounting and data loss when navigating back
 * 
 * Uses useRoutes to render routes, but keeps all visited routes mounted
 */
const routeCache = new Map();
const routeTimestamps = new Map();
const MAX_CACHE = 8;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export default function CachedRoutes({ routes }) {
  const location = useLocation();
  const currentPath = location.pathname;
  const previousPathRef = useRef(currentPath);
  const currentElementRef = useRef(null);
  
  // Get current route element
  const currentElement = useRoutes(routes);
  
  // Store current element in ref to avoid dependency issues
  currentElementRef.current = currentElement;
  
  const [cache, setCache] = useState(() => {
    const cached = routeCache.get(currentPath);
    return cached ? { [currentPath]: cached } : {};
  });

  // Cache current route element only when path changes
  useEffect(() => {
    // Only update cache when path actually changes
    if (currentPath !== previousPathRef.current) {
      previousPathRef.current = currentPath;
      
      // Get the current element from ref
      const element = currentElementRef.current;
      
      if (element) {
        // Only cache if not already cached
        if (!routeCache.has(currentPath)) {
          routeCache.set(currentPath, element);
          routeTimestamps.set(currentPath, Date.now());
          setCache((prev) => {
            // Only update if not already in cache
            if (prev[currentPath]) return prev;
            return {
              ...prev,
              [currentPath]: element,
            };
          });
        }
      }
    }
  }, [currentPath]); // Only depend on currentPath, not currentElement

  // Clean up old cache entries by size and TTL
  useEffect(() => {
    const now = Date.now();
    const toRemove = [];

    // Remove expired entries
    for (const [path, ts] of routeTimestamps) {
      if (path !== currentPath && now - ts > CACHE_TTL_MS) {
        toRemove.push(path);
      }
    }

    // If still over limit, evict oldest entries
    if (routeCache.size - toRemove.length > MAX_CACHE) {
      const sorted = Array.from(routeTimestamps.entries())
        .filter(([k]) => k !== currentPath && !toRemove.includes(k))
        .sort((a, b) => a[1] - b[1]);
      const excess = routeCache.size - toRemove.length - MAX_CACHE;
      for (let i = 0; i < excess && i < sorted.length; i++) {
        toRemove.push(sorted[i][0]);
      }
    }

    if (toRemove.length > 0) {
      toRemove.forEach((k) => { routeCache.delete(k); routeTimestamps.delete(k); });
      setCache((prev) => {
        const newCache = { ...prev };
        toRemove.forEach((k) => delete newCache[k]);
        return newCache;
      });
    }
  }, [currentPath]);

  // Render all cached routes - React keeps components mounted when they're in the tree
  return (
    <>
      {Object.entries(cache).map(([path, cachedElement]) => {
        if (!cachedElement) return null;
        const isActive = path === currentPath;
        return (
          <div
            key={path}
            style={{
              display: isActive ? "block" : "none",
              position: isActive ? "relative" : "absolute",
              visibility: isActive ? "visible" : "hidden",
              pointerEvents: isActive ? "auto" : "none",
              width: isActive ? "100%" : "0",
              height: isActive ? "auto" : "0",
              overflow: isActive ? "visible" : "hidden",
            }}
          >
            {cachedElement}
          </div>
        );
      })}
      {/* Render current route if not cached yet */}
      {!cache[currentPath] && currentElement && (
        <div>{currentElement}</div>
      )}
    </>
  );
}
