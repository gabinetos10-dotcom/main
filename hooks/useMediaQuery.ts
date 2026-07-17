"use client";

import { useEffect, useState } from "react";

/** SSR-safe : renvoie `false` au premier rendu, puis la vraie valeur. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

export const useIsTouch = () => useMediaQuery("(pointer: coarse)");
export const useReducedMotionPref = () => useMediaQuery("(prefers-reduced-motion: reduce)");
