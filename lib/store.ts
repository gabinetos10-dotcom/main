/**
 * Micro-stores mutables partagés entre le DOM (curseur, Lenis) et la scène
 * three.js — lus à chaque frame SANS re-render React (performance).
 */
export const pointerStore = {
  /** position en pixels */
  x: 0,
  y: 0,
  /** position normalisée -1 → 1 (centre écran = 0) */
  nx: 0,
  ny: 0,
  /** dernière activité (pour laisser la scène « respirer » quand idle) */
  lastMove: 0,
};

export const scrollStore = {
  y: 0,
  /** progression 0 → 1 sur toute la page */
  progress: 0,
  velocity: 0,
};
