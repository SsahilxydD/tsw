import { useEffect, useState, useMemo } from "react";
import { useLocation, useRoutes, matchRoutes } from "react-router-dom";

/**
 * CachedRoutes - Keeps route components mounted to preserve state
 * This prevents remounting and data loss when navigating back
 * 
 * Uses useRoutes to render routes, but keeps all visited routes mounted
 */
const routeCache = new Map();
const MAX_CACHE = 15;

export default function CachedRoutes({ routes }) {
  const location = useLocation();
  const currentPath = location.pathname;
  
  // Get current route element
  const currentElement = useRoutes(routes);
  
  const [cache, setCache] = useState(() => {
    const cached = routeCache.get(currentPath);
    return cached ? { [currentPath]: cached } : {};
  });

  // Cache current route element - React will keep it mounted as long as it's rendered
  useEffect(() => {
    if (currentElement) {
      routeCache.set(currentPath, currentElement);
      setCache((prev) => ({
        ...prev,
        [currentPath]: currentElement,
      }));
    }
  }, [currentPath, currentElement]);

  // Clean up old cache entries
  useEffect(() => {
    if (routeCache.size > MAX_CACHE) {
      const keys = Array.from(routeCache.keys());
      const toRemove = keys
        .filter((k) => k !== currentPath)
        .slice(0, keys.length - MAX_CACHE);
      toRemove.forEach((k) => routeCache.delete(k));
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
