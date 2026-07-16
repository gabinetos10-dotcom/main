/* Halftone reveal — elements resolve from coarse dots into sharp
   detail as they scroll in (dot radius grows until the mask is solid).
   Reserved for imagery and heavy graphics; tiny UI may still fade. */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { reducedMotion } from './prefs.js';

const TILE = 13;      // must match --mask-size in overprint.css
const SOLID = 10;     // radius (px) that over-covers the tile
const COARSE = 1.2;   // starting dot radius

export function initHalftoneReveals() {
  const els = document.querySelectorAll('.ht[data-reveal]');
  if (reducedMotion()) {
    els.forEach((el) => el.style.setProperty('--ht-r', `${SOLID}px`));
    return;
  }
  els.forEach((el) => {
    el.style.setProperty('--ht-r', `${COARSE}px`);
    gsap.to(el, {
      '--ht-r': `${SOLID}px`,
      duration: 1.1,
      ease: 'power2.inOut',
      scrollTrigger: {
        trigger: el,
        start: 'top 82%',
        once: true,
      },
    });
  });
}

/** Manual resolve (games / loader handoff). */
export function resolveHalftone(el, duration = 0.9) {
  if (reducedMotion()) {
    el.style.setProperty('--ht-r', `${SOLID}px`);
    return Promise.resolve();
  }
  el.style.setProperty('--ht-r', `${COARSE}px`);
  return gsap.to(el, { '--ht-r': `${SOLID}px`, duration, ease: 'power2.inOut' }).then();
}

export { TILE, SOLID, COARSE };
