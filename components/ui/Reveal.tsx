"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP, EASE } from "@/lib/gsap";
import { useReducedMotionPref } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

/**
 * Reveal générique au scroll (fondu + translation, easing signature).
 * Sans JS le contenu reste visible : l'état caché n'est posé que par GSAP.
 */
export function Reveal({
  children,
  delay = 0,
  y = 36,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotionPref();

  useGSAP(
    () => {
      if (reduced || !ref.current) return;
      gsap.from(ref.current, {
        autoAlpha: 0,
        y,
        duration: 1.1,
        delay,
        ease: EASE,
        scrollTrigger: { trigger: ref.current, start: "top 88%", once: true },
      });
    },
    { dependencies: [reduced], revertOnUpdate: true }
  );

  return (
    <div ref={ref} className={cn("will-change-transform", className)}>
      {children}
    </div>
  );
}
