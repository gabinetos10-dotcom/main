"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { formatNumberFr } from "@/lib/utils";
import { useReducedMotionPref } from "@/hooks/useMediaQuery";

/**
 * Compteur animé au scroll. Le HTML serveur contient la valeur finale
 * (SEO / no-JS) ; GSAP la rejoue de 0 quand la section entre à l'écran.
 */
export function Counter({ value, suffix = "", className }: { value: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotionPref();

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || reduced) return;
      const render = (v: number) => {
        el.textContent = formatNumberFr(v) + suffix;
      };
      const obj = { v: 0 };
      render(0);
      gsap.to(obj, {
        v: value,
        duration: 2.2,
        ease: "power4.out",
        onUpdate: () => render(obj.v),
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      });
    },
    { dependencies: [reduced, value, suffix], revertOnUpdate: true }
  );

  return (
    <span ref={ref} className={className}>
      {formatNumberFr(value)}
      {suffix}
    </span>
  );
}
