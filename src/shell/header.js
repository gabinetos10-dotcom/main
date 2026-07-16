/* Header wiring: condensed/inverted states, magnetic nav,
   active-plate highlight, wobble on the pressmark. */

import { initHeaderState, initMagnetic, scrollToEl } from '../core/motion.js';

export function initHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  initHeaderState(header);
  initMagnetic(header.querySelectorAll('.header-nav a'));

  // smooth-scroll in-page links through Lenis
  header.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      scrollToEl(target, -8);
      history.replaceState(null, '', a.getAttribute('href'));
    });
  });

  // active plate marker
  const links = [...header.querySelectorAll('.header-nav a')];
  if (links.length) {
    const byId = new Map(links.map((l) => [l.getAttribute('href').slice(1), l]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((l) => l.classList.remove('is-active'));
        byId.get(en.target.id)?.classList.add('is-active');
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    byId.forEach((_, id) => {
      const s = document.getElementById(id);
      if (s) io.observe(s);
    });
  }
}
