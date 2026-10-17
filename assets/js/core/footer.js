/* ==========================================================================
   GJS — FOOTER (par page) + SYNCHRONISATION CONFIG
   Heure de Paris en direct, « GJS » révélé au scroll (lettres qui montent),
   retour en haut, compteur de clics secret sur le logo (easter egg n° 4).
   ========================================================================== */

import { CONFIG } from '../config.js';
import { $$, env } from './utils.js';
import { scrollTo } from './scroll.js';

const { gsap } = window;

/** Remplace coordonnées et liens par ceux du CONFIG (un seul endroit à modifier). */
export function hydrateConfig(root = document) {
  $$('[data-config="email"]', root).forEach((el) => {
    if (el.tagName === 'A') el.href = `mailto:${CONFIG.EMAIL}`;
    if (!el.hasAttribute('data-config-keep-text')) el.textContent = CONFIG.EMAIL;
    if (el.dataset.copy !== undefined) el.dataset.copy = CONFIG.EMAIL;
  });
  $$('[data-config="phone"]', root).forEach((el) => {
    if (el.tagName === 'A') el.href = `tel:${CONFIG.PHONE_HREF}`;
    el.textContent = CONFIG.PHONE;
  });
  $$('[data-config="booking"]', root).forEach((el) => { el.href = CONFIG.BOOKING_URL; });
  $$('[data-social]', root).forEach((el) => {
    const social = CONFIG.SOCIALS.find((s) => s.label === el.dataset.social);
    const item = el.closest('li') || el;
    if (!social) { item.hidden = true; return; }
    el.href = social.url;
  });
  $$('[data-config="availability"]', root).forEach((el) => { el.textContent = CONFIG.AVAILABILITY; });
}

export function initFooter(scope, container) {
  const footer = container.querySelector('.footer');
  if (!footer) return;

  // Heure de Paris
  const clock = footer.querySelector('[data-paris-clock]');
  if (clock) {
    const fmt = new Intl.DateTimeFormat('fr-FR', {
      timeZone: CONFIG.LOCATION.timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
    const tick = () => {
      const now = new Date();
      clock.textContent = fmt.format(now);
      clock.setAttribute('datetime', now.toISOString());
    };
    tick();
    scope.interval(tick, 1000);
  }

  $$('[data-year]', footer).forEach((el) => { el.textContent = String(new Date().getFullYear()); });

  scope.on(footer, 'click', (e) => {
    if (e.target.closest('[data-scroll-top]')) {
      e.preventDefault();
      scrollTo(0, { duration: 2 });
      document.getElementById('main')?.focus({ preventScroll: true });
    }
  });

  // « GJS » : les lettres montent une à une quand le footer entre dans l'écran
  const mark = footer.querySelector('[data-footer-logo]');
  if (mark) {
    const letters = mark.querySelectorAll('.footer__letter');
    if (!env.reducedMotion) {
      scope.add(() => {
        gsap.fromTo(letters, { yPercent: 60, opacity: 0.2 }, {
          yPercent: 0,
          opacity: 1,
          ease: 'none',
          stagger: 0.12,
          scrollTrigger: { trigger: footer, start: 'top bottom', end: 'top 45%', scrub: 0.6 },
        });
      });
    }
    // Easter egg : 7 clics rapides sur le logo géant
    let clicks = 0;
    let timer = 0;
    scope.on(mark, 'click', () => {
      clicks += 1;
      clearTimeout(timer);
      timer = setTimeout(() => { clicks = 0; }, 2500);
      if (!env.reducedMotion) gsap.fromTo(mark, { scale: 0.97 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
      if (clicks >= 7) {
        clicks = 0;
        document.dispatchEvent(new CustomEvent('gjs:egg-footer'));
      }
    });
    scope.cleanup(() => clearTimeout(timer));
  }
}
