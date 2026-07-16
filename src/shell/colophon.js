/* The colophon prints into view: big soft ink blots drift behind the
   credits, the oversized wordmark wobbles as it lands. Also home to
   one of the two Misprint triggers (the pressmark, pressed thrice). */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { INKS } from '../config/content.js';
import { reducedMotion } from '../core/prefs.js';
import { wobble } from '../core/overprint.js';

export function initColophon() {
  const colophon = document.querySelector('.colophon');
  if (!colophon) return;

  // three big ink shapes, screen-blended into the night sheet
  const blots = document.createElement('div');
  blots.className = 'colophon-inkblots';
  blots.setAttribute('aria-hidden', 'true');
  const spots = [
    { ink: INKS.indigo,    w: 46, x: -8,  y: 10 },
    { ink: INKS.raspberry, w: 38, x: 62,  y: 42 },
    { ink: INKS.apricot,   w: 30, x: 28,  y: 68 },
  ];
  blots.innerHTML = spots.map((s) =>
    `<i style="background:${s.ink};width:${s.w}vmin;height:${s.w * 0.86}vmin;left:${s.x}%;top:${s.y}%"></i>`
  ).join('');
  colophon.prepend(blots);

  if (!reducedMotion()) {
    [...blots.children].forEach((b, i) => {
      gsap.to(b, {
        x: () => 30 * (i % 2 ? -1 : 1),
        y: -24,
        rotation: 12,
        scale: 1.12,
        duration: 9 + i * 3,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      });
    });

    const word = colophon.querySelector('.colophon-word');
    ScrollTrigger.create({
      trigger: colophon,
      start: 'top 70%',
      once: true,
      onEnter: () => wobble(word),
    });
  }
}
