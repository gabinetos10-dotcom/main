import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import { useGSAP } from "@gsap/react";

/**
 * Orchestration GSAP centralisée.
 * L'easing « gjs » est LA courbe signature du site : chaque reveal,
 * chaque transition, chaque micro-interaction JS l'utilise.
 */
export const EASE = "gjs";
export const EASE_IO = "gjsIo";

let registered = false;

export function ensureGsap() {
  if (registered || typeof window === "undefined") return gsap;
  gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, useGSAP);
  CustomEase.create(EASE, "0.16, 1, 0.3, 1");
  CustomEase.create(EASE_IO, "0.87, 0, 0.13, 1");
  gsap.defaults({ ease: EASE, duration: 1 });
  registered = true;
  return gsap;
}

// Auto-enregistrement côté client dès l'import du module.
if (typeof window !== "undefined") ensureGsap();

export { gsap, ScrollTrigger, SplitText, useGSAP };
