import { useEffect, useState } from 'react';

// Module-level singleton — first call kicks off the dynamic import, every
// subsequent caller reuses the same Promise so we only ship one icon chunk
// and only fetch it once per page session.
let cachedMap = null;
let inflight = null;

function load() {
  if (cachedMap) return Promise.resolve(cachedMap);
  if (!inflight) {
    inflight = import('./categoryIcons.js').then((m) => {
      cachedMap = m.categoryIconMap;
      return cachedMap;
    });
  }
  return inflight;
}

// useCategoryIconMap — returns the full lucide name→component map, or `null`
// while the chunk is still loading. Components should render a fallback icon
// (usually Laptop or Package) when `null`.
export function useCategoryIconMap() {
  const [map, setMap] = useState(cachedMap);
  useEffect(() => {
    if (cachedMap) return;
    let alive = true;
    load().then((m) => { if (alive) setMap(() => m); });
    return () => { alive = false; };
  }, []);
  return map;
}
