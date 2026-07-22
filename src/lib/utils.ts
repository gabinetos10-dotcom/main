/** Tiny classnames joiner — avoids a clsx dependency. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export const clamp = (v: number, min: number, max: number): number =>
  Math.min(Math.max(v, min), max);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Maps a value from one range to another. */
export const mapRange = (
  v: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number => outMin + ((v - inMin) * (outMax - outMin)) / (inMax - inMin);

/** Formats a number with thin non‑breaking spaces (French thousands). */
export const formatFr = (n: number): string =>
  n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
