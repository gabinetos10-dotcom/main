/* Ink math and the session accent.
   The palette's "third colors" are never hard-coded — when a canvas
   or shader needs one, it multiplies two inks the way the sheet does. */

import { INKS, INTENTS } from '../config/content.js';
import { store } from './prefs.js';

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

/** Multiply blend of two ink hexes — the overprint result. */
export function overprint(hexA, hexB) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex([0, 1, 2].map((i) => (a[i] * b[i]) / 255));
}

export function ink(name) { return INKS[name] || name; }

/** Promote one ink to the session accent (loader intent / mixer). */
export function setAccent(inkName) {
  const hex = INKS[inkName];
  if (!hex) return;
  document.documentElement.style.setProperty('--accent', hex);
  store.set('accent', inkName);
}

export function getIntent() { return store.get('intent'); }

export function applyStoredSession() {
  const accent = store.get('accent');
  if (accent) setAccent(accent);
  const intent = INTENTS.find((i) => i.id === getIntent());
  return intent || null;
}

/** Read the effective overprint pair of a DOM scope (for canvas games). */
export function scopeInks(el) {
  const cs = getComputedStyle(el);
  return {
    a: cs.getPropertyValue('--op-a').trim() || INKS.indigo,
    b: cs.getPropertyValue('--op-b').trim() || INKS.raspberry,
    accent: cs.getPropertyValue('--accent').trim() || INKS.indigo,
    paper: cs.getPropertyValue('--paper').trim() || '#f3ece3',
    ink: cs.getPropertyValue('--ink').trim() || '#1a1633',
  };
}
