"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/useMediaQuery";

/**
 * Full‑bleed hero video background. Responsive via object-cover (fills the
 * viewport at any aspect ratio), muted+playsInline for mobile autoplay, and a
 * calibrated scrim so the warm‑white headline stays legible. Under
 * prefers‑reduced‑motion the clip is left paused on its first frame.
 */
export function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const reduce = usePrefersReducedMotion();

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (reduce) {
      v.pause();
      return;
    }
    // Some browsers need an explicit play() even with the autoplay attribute.
    const play = () => v.play().catch(() => {});
    if (v.readyState >= 2) play();
    else v.addEventListener("canplay", play, { once: true });
  }, [reduce]);

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[var(--color-bg)]">
      <video
        ref={ref}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-[var(--ease-out-expo)] ${
          ready ? "opacity-100" : "opacity-0"
        }`}
        autoPlay={!reduce}
        muted
        loop
        playsInline
        preload="auto"
        onLoadedData={() => setReady(true)}
        onCanPlay={() => setReady(true)}
      >
        <source src="/hero-background.mp4" type="video/mp4" />
      </video>

      {/* Legibility scrim — left‑weighted for the headline, plus a bottom fade
          that blends the hero into the section below. */}
      <div className="absolute inset-0 bg-black/25" />
      <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(10,10,11,0.9)_0%,rgba(10,10,11,0.55)_38%,rgba(10,10,11,0.1)_68%,transparent_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(to_top,var(--color-bg)_0%,transparent_100%)]" />
      <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(to_bottom,rgba(10,10,11,0.7),transparent)]" />

      {/* faint brand grid over the footage */}
      <div className="grid-lines absolute inset-0 opacity-[0.15]" />
    </div>
  );
}
