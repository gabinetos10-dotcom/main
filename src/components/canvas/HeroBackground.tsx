"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useIsMobile, usePrefersReducedMotion } from "@/hooks/useMediaQuery";

// three.js is heavy — split it out and never SSR it.
const Scene = dynamic(() => import("./Scene"), {
  ssr: false,
  loading: () => null,
});

export function HeroBackground() {
  const isMobile = useIsMobile();
  const reduce = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(false);

  // Defer WebGL a tick past first paint so the hero text lands instantly.
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Reactive grid, always present, cheap. */}
      <div className="grid-lines absolute inset-0 opacity-[0.5]" />

      {/* WebGL cloud — skipped entirely under reduced‑motion. */}
      {mounted && !reduce && <Scene count={isMobile ? 900 : 2600} />}

      {/* Static luminous fallback so the section never looks empty. */}
      {reduce && (
        <div className="absolute inset-0 bg-[radial-gradient(50%_50%_at_50%_40%,rgba(255,90,44,0.14),transparent_70%)]" />
      )}
    </div>
  );
}
