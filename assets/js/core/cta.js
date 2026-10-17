/* ==========================================================================
   GJS — CTA DE FIN DE PAGE (v3)
   Mouvement piloté par le défilement (jamais par le pointeur) : le titre
   glisse légèrement, le halo cyan grossit à mesure que la section passe.
   ========================================================================== */

import { env } from './utils.js';

const { gsap } = window;

export function initCta(scope, container) {
  if (env.reducedMotion) return;
  container.querySelectorAll('[data-cta]').forEach((section) => {
    const title = section.querySelector('[data-cta-title]');
    const glow = section.querySelector('.cta__glow');
    const trigger = { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true };
    if (title) gsap.fromTo(title, { xPercent: 5 }, { xPercent: -3, ease: 'none', scrollTrigger: trigger });
    if (glow) gsap.fromTo(glow, { scale: 0.55, opacity: 0.35 }, { scale: 1.15, opacity: 1, ease: 'none', scrollTrigger: { ...trigger } });
  });
}
