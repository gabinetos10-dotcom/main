"use client";

import { useEffect, useRef } from "react";
import { scrollStore } from "@/lib/store";
import { useIsTouch } from "@/hooks/useMediaQuery";

/**
 * HUD « instrument de mesure » : progression de scroll + statut système.
 * mix-blend-difference → reste lisible sur le footer Mindaro.
 * Mise à jour directe du DOM (aucun re-render React).
 */
export function HUD() {
  const isTouch = useIsTouch();
  const pctRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isTouch) return;
    let raf = 0;
    let last = -1;
    const loop = () => {
      const p = Math.round(scrollStore.progress * 100);
      if (p !== last && pctRef.current) {
        last = p;
        pctRef.current.textContent = String(p).padStart(3, "0");
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isTouch]);

  if (isTouch) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 bottom-0 z-[45] hidden mix-blend-difference lg:block">
      <div className="container-gjs flex items-center justify-between pb-4 font-mono text-[10px] tracking-[0.25em] text-mist/50">
        <span>
          SCROLL ▸ <span ref={pctRef}>000</span>%
        </span>
        <span className="flex items-center gap-2.5">
          SYS·NOMINAL
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-mindaro" />
          48.8566°N — 2.3522°E
        </span>
      </div>
    </div>
  );
}
