import clsx, { type ClassValue } from "clsx";

/** Petit helper de composition de classes. */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Interpole une valeur — utile pour parallaxe manuelle. */
export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

/** Formate une date ISO en français long. */
export function formatDateFR(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
