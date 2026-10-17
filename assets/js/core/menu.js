/* ==========================================================================
   GJS — HEADER & MENU PLEIN ÉCRAN (v3)
   Header : capsule qui se range au scroll vers le bas et revient vers le haut,
   s'opacifie dès qu'on défile, fil de progression de lecture, pastille cyan qui
   glisse sous le lien survolé ou focalisé et se pose sur la page courante.
   Menu : ouverture en cercle depuis le bouton, liens qui montent en cascade,
   aperçu fixe qui change (fondu + zoom) selon le lien survolé ou focalisé.
   Focus piégé, Échap pour fermer, aria-expanded synchronisé.
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
let progressBar = null;

/* ---------- Header au défilement ------------------------------------------ */

function onHeaderScroll(y) {
  if (!header) return;
  header.classList.toggle('is-scrolled', y > 24);
  if (progressBar) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.setProperty('--progress', max > 0 ? Math.min(1, Math.max(0, y / max)).toFixed(4) : '0');
  }
  if (isOpen) return;
  const delta = y - lastY;
  if (y < 160) header.classList.remove('is-hidden');
  else if (delta > 6) header.classList.add('is-hidden');
  else if (delta < -6) header.classList.remove('is-hidden');
  lastY = y;
}

export function showHeader() {
  if (!header) return;
  header.classList.remove('is-hidden');
  lastY = getScroll();
  onHeaderScroll(lastY);
}

/* ---------- Pastille de navigation ---------------------------------------- */

let pill;
let links = [];
let currentLink = null;
let pillLink = null;

function placePill(link) {
  if (!pill) return;
  links.forEach((l) => l.classList.toggle('is-pill', l === link));
  pillLink = link;
  if (!link) { pill.style.setProperty('--pill-o', '0'); return; }
  pill.style.setProperty('--pill-x', `${link.offsetLeft}px`);
  pill.style.setProperty('--pill-w', `${link.offsetWidth}px`);
  pill.style.setProperty('--pill-o', '1');
}

function initPill() {
  pill = header.querySelector('[data-header-pill]');
  links = Array.from(header.querySelectorAll('.header__link'));
  if (!pill || !links.length) return;
  const nav = pill.parentElement;
  links.forEach((link) => {
    link.addEventListener('pointerenter', () => placePill(link));
    link.addEventListener('focus', () => placePill(link));
  });
  nav.addEventListener('pointerleave', () => placePill(currentLink));
  nav.addEventListener('focusout', (e) => { if (!nav.contains(e.relatedTarget)) placePill(currentLink); });
  // Les polices changent la largeur des liens : on recale la pastille
  const refit = () => placePill(pillLink);
  window.addEventListener('resize', refit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
}

/* ---------- Menu ----------------------------------------------------------- */

function buildTimeline() {
  const items = menu.querySelectorAll('.menu__text > span');
  const nums = menu.querySelectorAll('.menu__num');
  const extras = menu.querySelectorAll('.menu__foot > *, .menu__preview');
  const bg = menu.querySelector('.menu__bg');
  const t = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
  if (env.reducedMotion) {
    t.fromTo(menu, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: 'none' });
    return t;
  }
  // Le cercle part du bouton menu
  const r = toggle.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const radius = Math.hypot(Math.max(cx, window.innerWidth - cx), Math.max(cy, window.innerHeight - cy));
  t.fromTo(bg, { clipPath: `circle(0px at ${cx}px ${cy}px)` }, { clipPath: `circle(${radius}px at ${cx}px ${cy}px)`, duration: 0.9, ease: 'expo.inOut' }, 0)
    .fromTo(items, { yPercent: 115 }, { yPercent: 0, duration: 1.05, stagger: 0.06 }, 0.38)
    .fromTo(nums, { autoAlpha: 0, x: -12 }, { autoAlpha: 1, x: 0, duration: 0.8, stagger: 0.06 }, 0.5)
    .fromTo(extras, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.05 }, 0.55);
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
  // Recalculé à chaque ouverture : la position du bouton dépend de la largeur
  if (tl) tl.kill();
  tl = buildTimeline();
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
    tl.timeScale(2).reverse();
  });
}

export const menuIsOpen = () => isOpen;

/* ---------- Aperçu fixe (fondu + zoom) ----------------------------------- */

function showPreview(index) {
  menu.querySelectorAll('[data-preview-img]').forEach((img) => {
    img.classList.toggle('is-active', img.dataset.previewImg === String(index));
  });
}

/** Marque la page courante (aria-current) dans le header, le menu et le CTA. */
export function setCurrentPage(namespace) {
  if (!header || !menu) return;
  menu.querySelectorAll('.menu__link').forEach((link) => {
    if (link.dataset.page === namespace) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  currentLink = null;
  header.querySelectorAll('.header__link, .header__cta').forEach((link) => {
    const isCurrent = link.dataset.page === namespace;
    if (isCurrent) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
    if (isCurrent && link.classList.contains('header__link')) currentLink = link;
  });
  placePill(currentLink);
  const active = menu.querySelector('.menu__link[aria-current="page"]');
  showPreview(active ? active.dataset.preview : 0);
}

export function initMenu() {
  header = document.querySelector('[data-header]');
  menu = document.getElementById('menu');
  toggle = document.querySelector('[data-menu-toggle]');
  if (!header || !menu || !toggle) return;
  progressBar = header.querySelector('[data-scroll-progress]');

  onScroll(onHeaderScroll);
  initPill();

  toggle.addEventListener('click', () => (isOpen ? closeMenu() : openMenu()));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) { e.preventDefault(); closeMenu(); }
  });

  menu.querySelectorAll('.menu__link').forEach((link) => {
    link.addEventListener('pointerenter', () => showPreview(link.dataset.preview));
    link.addEventListener('focus', () => showPreview(link.dataset.preview));
  });

}
