/* Ink-wipe — a plate of ink sweeps across the screen when opening
   games, the index menu's big jumps, and the loader handoff. */

import gsap from 'gsap';
import { reducedMotion } from './prefs.js';

let wipeEl = null;

function el() {
  if (!wipeEl) {
    wipeEl = document.createElement('div');
    wipeEl.className = 'ink-wipe';
    wipeEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(wipeEl);
  }
  return wipeEl;
}

/** Sweep ink up over the screen, run `between()`, then reveal.
    Returns a promise resolving when the wipe has fully receded. */
export async function inkWipe(inkHex, between) {
  if (reducedMotion()) {
    await between?.();
    return;
  }
  const w = el();
  w.style.setProperty('--wipe-ink', inkHex);
  w.style.visibility = 'visible';

  await gsap.fromTo(w,
    { yPercent: 103, borderRadius: '40% 44% 0 0 / 6% 7% 0 0' },
    { yPercent: 0, borderRadius: '0% 0% 0 0 / 0% 0% 0 0', duration: 0.5, ease: 'power3.in' });

  await between?.();

  await gsap.to(w, {
    yPercent: -103,
    borderRadius: '0 0 42% 46% / 0 0 6% 7%',
    duration: 0.55,
    ease: 'power3.out',
    delay: 0.05,
  });
  w.style.visibility = 'hidden';
}
