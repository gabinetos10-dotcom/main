"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { usePrefersReducedMotion } from "@/lib/hooks";

// Le canvas de pétales est chargé côté client uniquement, après hydratation.
const PetalCanvas = dynamic(() => import("./PetalCanvas"), { ssr: false });

/** Grain organique en data-URI (aucune requête réseau — compatible CSP stricte). */
const GRAIN =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(#n)' opacity='0.55'/></svg>`
  );

/**
 * Habillage de fond permanent : mesh gradient qui respire, halo solaire qui
 * suit discrètement le scroll, pétales en canvas, grain global. Tout est en
 * pointer-events:none et fixé derrière le contenu.
 */
export default function SiteBackground() {
  const haloRef = useRef<HTMLDivElement | null>(null);
  const reduced = usePrefersReducedMotion();

  // Grain : injecté en variable CSS pour l'overlay global.
  useEffect(() => {
    document.documentElement.style.setProperty("--grain-url", `url("${GRAIN}")`);
  }, []);

  // Halo solaire : léger parallaxe vertical au scroll.
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (haloRef.current) {
          haloRef.current.style.transform = `translate3d(-50%, ${y * 0.12}px, 0)`;
          haloRef.current.style.opacity = `${Math.max(0.35, 0.85 - y / 1600)}`;
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return (
    <>
      {/* Couche mesh + halo */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        style={{ background: "var(--creme)" }}
      >
        {/* Mesh gradient — blobs colorés très flous qui dérivent lentement */}
        <div className="absolute inset-0 opacity-90">
          <div
            className="absolute -left-[10%] -top-[10%] h-[60vmax] w-[60vmax] rounded-full blur-[90px] animate-mesh-drift"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--mood-1) 70%, transparent), transparent 70%)",
            }}
          />
          <div
            className="absolute right-[-15%] top-[5%] h-[55vmax] w-[55vmax] rounded-full blur-[100px] animate-mesh-drift"
            style={{
              animationDelay: "-9s",
              background:
                "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--mood-2) 65%, transparent), transparent 70%)",
            }}
          />
          <div
            className="absolute bottom-[-20%] left-[15%] h-[65vmax] w-[65vmax] rounded-full blur-[110px] animate-mesh-drift"
            style={{
              animationDelay: "-18s",
              background:
                "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--mood-3) 55%, transparent), transparent 72%)",
            }}
          />
          <div
            className="absolute bottom-[-10%] right-[5%] h-[45vmax] w-[45vmax] rounded-full blur-[90px] animate-mesh-drift"
            style={{
              animationDelay: "-5s",
              background:
                "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--blush) 45%, transparent), transparent 70%)",
            }}
          />
        </div>

        {/* Halo solaire chaud en haut de page */}
        <div
          ref={haloRef}
          className="absolute left-1/2 top-[-30vh] h-[80vh] w-[120vw] -translate-x-1/2"
          style={{
            background:
              "radial-gradient(ellipse at 50% 40%, color-mix(in oklab, var(--soleil) 70%, transparent), transparent 60%)",
            filter: "blur(10px)",
          }}
        />
      </div>

      {/* Pétales */}
      <PetalCanvas />

      {/* Grain global */}
      <div className="grain-overlay" aria-hidden />
    </>
  );
}
