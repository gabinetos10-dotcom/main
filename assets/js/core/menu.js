/* ==========================================================================
   GJS — HEADER « CAPSULE » & MENU MOBILE
   Header : navigation visible dès 1024 px, page courante marquée
   (aria-current), fond renforcé dès qu'on défile, masqué au scroll vers le
   bas puis réapparaît au scroll vers le haut.
   Menu (< 1024 px) : plein écran, focus piégé, Échap pour fermer,
   aria-expanded synchronisé ; il se ferme seul si l'écran s'élargit.
   ========================================================================== */

import { onScroll, lockScroll, unlockScroll, getScroll } from './scroll.js';
import { env, trapFocus, setInertOutside, announce } from './utils.js';

const { gsap } = window;

let header;
let menu;
let toggle;
let isOpen = false;
let tl = null;
let releaseFocus = null;
let lastY = 0;

function onHeaderScroll(y) {
  if (!header) return;
  header.classList.toggle('is-scrolled', y > 24);
  if (isOpen) return;
  const delta = y - lastY;
  if (y < 120) header.classList.remove('is-hidden');
  else if (delta > 6) header.classList.add('is-hidden');
  else if (delta < -6) header.classList.remove('is-hidden');
  lastY = y;
}

export function showHeader() {
  if (header) header.classList.remove('is-hidden');
  lastY = getScroll();
}

function buildTimeline() {
  const links = menu.querySelectorAll('.menu__text > span');
  const nums = menu.querySelectorAll('.menu__num, .menu__item');
  const extras = menu.querySelectorAll('.menu__foot > *');
  const t = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
  if (env.reducedMotion) {
    t.fromTo(menu, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: 'none' });
    return t;
  }
  t.fromTo(menu.querySelector('.menu__bg'), { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'expo.inOut' }, 0)
    .fromTo(links, { yPercent: 115 }, { yPercent: 0, duration: 1, stagger: 0.05 }, 0.36)
    .fromTo(nums, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, stagger: 0.04 }, 0.36)
    .fromTo(extras, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.05 }, 0.55);
  return t;
}

export function openMenu() {
  if (isOpen || !menu) return;
  isOpen = true;
  header.classList.remove('is-hidden');
  header.classList.add('is-menu-open');
  menu.hidden = false;
  toggle.setAttribute('aria-expanded', 'true');
  toggle.setAttribute('aria-label', 'Fermer le menu');
  lockScroll('menu');
  setInertOutside([menu, header], true);
  if (!tl) tl = buildTimeline();
  tl.timeScale(1).play(0);
  releaseFocus = trapFocus(menu, { extra: [toggle], initial: menu.querySelector('.menu__link') });
  announce('Menu ouvert');
}

/** immediate : fermeture sans animation (pendant une transition de page). */
export function closeMenu({ immediate = false, restoreFocus = true } = {}) {
  if (!isOpen || !menu) return Promise.resolve();
  isOpen = false;
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Ouvrir le menu');
  header.classList.remove('is-menu-open');
  setInertOutside([menu, header], false);
  if (releaseFocus) { releaseFocus(); releaseFocus = null; }
  if (restoreFocus) toggle.focus({ preventScroll: true });
  unlockScroll('menu');
  return new Promise((resolve) => {
    const finish = () => { menu.hidden = true; resolve(); };
    if (immediate || !tl) { if (tl) tl.pause(0); finish(); return; }
    tl.eventCallback('onReverseComplete', () => { tl.eventCallback('onReverseComplete', null); finish(); });
    tl.timeScale(2.2).reverse();
  });
}

export const menuIsOpen = () => isOpen;

/** Marque le lien de la page courante (aria-current). */
export function setCurrentPage(namespace) {
  document.querySelectorAll('.menu__link, .header__link, .header__cta').forEach((link) => {
    if (link.dataset.page === namespace) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

export function initMenu() {
  header = document.querySelector('[data-header]');
  menu = document.getElementById('menu');
  toggle = document.querySelector('[data-menu-toggle]');
  if (!header || !menu || !toggle) return;

  onScroll(onHeaderScroll);

  toggle.addEventListener('click', () => (isOpen ? closeMenu() : openMenu()));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) { e.preventDefault(); closeMenu(); }
  });

  // Passage en desktop : la navigation est dans le header, le menu se ferme
  const desktop = window.matchMedia('(min-width: 1024px)');
  desktop.addEventListener('change', (e) => { if (e.matches && isOpen) closeMenu({ restoreFocus: false }); });
  onHeaderScroll(getScroll());
}
