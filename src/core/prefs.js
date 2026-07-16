/* Shared preferences & environment probes. */

export const store = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(`gjs-${key}`);
      return v === null ? fallback : JSON.parse(v);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(`gjs-${key}`, JSON.stringify(value)); } catch { /* private mode */ }
  },
};

const rmQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
export const reducedMotion = () => rmQuery.matches;

export const finePointer = () => window.matchMedia('(pointer: fine)').matches;

/** Low-power heuristic: save-data, few cores, or coarse+small screen. */
export function lowPower() {
  const conn = navigator.connection;
  if (conn?.saveData) return true;
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 3) return true;
  return false;
}

/** Heavy effects (3D, cursor trail) allowed? */
export const wantsShow = () => !reducedMotion() && !lowPower();
