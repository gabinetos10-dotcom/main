"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { usePrefersReducedMotion } from "@/lib/hooks";

/**
 * Smooth scroll Lenis — inertie douce, jamais lourde. Piloté par le ticker GSAP
 * pour rester parfaitement synchronisé avec ScrollTrigger (timeline épinglée).
 * Désactivé sous prefers-reduced-motion (scroll natif).
 */
export default function SmoothScrollProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;

    let lenis: Lenis | null = null;
    let cleanup = () => {};

    // Import dynamique de GSAP pour garder le bundle initial léger.
    (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      lenis = new Lenis({
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // out-expo
        smoothWheel: true,
        touchMultiplier: 1.6,
        wheelMultiplier: 1,
      });

      // Exposé pour le scroll d'ancre (voir useAnchorScroll).
      (window as unknown as { __lenis?: Lenis }).__lenis = lenis;

      lenis.on("scroll", ScrollTrigger.update);

      const raf = (time: number) => {
        lenis?.raf(time * 1000);
      };
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);

      cleanup = () => {
        gsap.ticker.remove(raf);
        lenis?.destroy();
        delete (window as unknown as { __lenis?: Lenis }).__lenis;
      };
    })();

    return () => cleanup();
  }, [reduced]);

  return <>{children}</>;
}
