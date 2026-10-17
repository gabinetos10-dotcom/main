/* ==========================================================================
   GJS — TRANSITION DE PAGE
   La page sortante recule (zoom arrière), un rideau nuit monte, un mini
   vaisseau le traverse en écrivant le nom de la page suivante en cyan, puis
   le rideau sort par le haut pendant que la nouvelle page se pose (zoom avant).
   Mouvement réduit : fondu court, sans vaisseau ni zoom.
   ========================================================================== */

import { env, clamp } from './utils.js';

const { gsap, ScrollTrigger } = window;

const NAMES = {
  index: 'Accueil',
  offres: 'Nos offres',
  'a-propos': 'Qui sommes-nous',
  contact: 'Contact',
  'mentions-legales': 'Mentions légales',
  'politique-confidentialite': 'Confidentialité',
  'politique-cookies': 'Cookies',
  'exercer-vos-droits': 'Vos droits',
};

// « / » et « /index.html » désignent la même page (accueil servi à la racine)
export function pageSlug(path = '') {
  const last = path.split('?')[0].split('#')[0].replace(/\/+$/, '').split('/').pop() || '';
  return last.replace(/\.html?$/, '') || 'index';
}

export function pageName(path) {
  const slug = pageSlug(path);
  return NAMES[slug] ?? 'Hors trajectoire';
}

let root;
let curtain;
let content;
let nameFill;
let nameGhost;
let nameBox;
let pathLabel;
let ship;

export function initTransition() {
  root = document.querySelector('.page-transition');
  if (!root) return;
  curtain = root.querySelector('.page-transition__curtain');
  content = root.querySelector('.page-transition__content');
  nameFill = root.querySelector('[data-transition-name]');
  nameGhost = root.querySelector('[data-transition-ghost]');
  nameBox = root.querySelector('.page-transition__name');
  pathLabel = root.querySelector('[data-transition-path]');
  ship = root.querySelector('.page-transition__ship');
  // État initial posé par GSAP (un transform CSS serait additionné à yPercent)
  gsap.set(root, { autoAlpha: 0 });
  gsap.set([curtain, content], { yPercent: 100 });
}

/** Couvre l'écran. Résout quand la page courante est totalement masquée. */
export function curtainIn(path) {
  if (!root) return Promise.resolve();
  const name = pageName(path);
  nameFill.textContent = name;
  nameGhost.textContent = name;
  const slug = pageSlug(path);
  pathLabel.textContent = `/${slug === 'index' ? 'accueil' : slug}`;
  nameFill.style.setProperty('--reveal', env.reducedMotion ? '130%' : '-10%');

  return new Promise((resolve) => {
    const tl = gsap.timeline({ onComplete: resolve });
    if (env.reducedMotion) {
      gsap.set([curtain, content], { yPercent: 0 });
      gsap.set(ship, { autoAlpha: 0 });
      tl.fromTo(root, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: 'none' });
      return;
    }
    const pose = { p: 0 };
    const w = window.innerWidth;
    const shipW = ship.offsetWidth || 120;
    const update = () => {
      const x = -shipW * 1.2 + pose.p * (w + shipW * 2.4);
      const y = Math.sin(pose.p * Math.PI * 2) * 18;
      const angle = Math.cos(pose.p * Math.PI * 2) * 6;
      gsap.set(ship, { x, y, rotation: angle });
      const box = nameBox.getBoundingClientRect();
      const tail = x + shipW * 0.15;
      const reveal = box.width ? ((tail - box.left) / box.width) * 100 : 0;
      nameFill.style.setProperty('--reveal', `${clamp(reveal, -10, 130)}%`);
    };

    gsap.set(root, { autoAlpha: 1 });
    gsap.set(ship, { autoAlpha: 1, x: -shipW * 2 });
    tl.fromTo(curtain, { yPercent: 100 }, { yPercent: 0, duration: 0.55, ease: 'expo.inOut' }, 0)
      .fromTo(content, { yPercent: 100 }, { yPercent: 0, duration: 0.55, ease: 'expo.inOut' }, 0)
      .to(pose, { p: 1, duration: 0.72, ease: 'power1.inOut', onUpdate: update }, 0.18);
  });
}

/** Découvre la nouvelle page. onReveal est appelé dès que le rideau commence à sortir. */
export function curtainOut(onReveal) {
  if (!root) { if (onReveal) onReveal(); return Promise.resolve(); }
  return new Promise((resolve) => {
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(root, { autoAlpha: 0 });
        gsap.set([curtain, content], { yPercent: 100 });
        resolve();
      },
    });
    if (env.reducedMotion) {
      tl.add(() => onReveal && onReveal(), 0).to(root, { autoAlpha: 0, duration: 0.3, ease: 'none' }, 0);
      return;
    }
    tl.to([curtain, content], { yPercent: -100, duration: 0.65, ease: 'expo.inOut' }, 0.05)
      .add(() => onReveal && onReveal(), 0.28);
  });
}

/* ---- Zoom des pages ------------------------------------------------------
   Jamais pendant qu'une section est épinglée : un transform sur le conteneur
   ferait sauter l'élément fixé. Les propriétés sont toujours nettoyées.     */

const pinActive = () => ScrollTrigger.getAll().some((t) => t.pin && t.isActive);

/** La page sortante recule pendant que le rideau monte. */
export function pageOut(container) {
  if (!container || env.reducedMotion) return Promise.resolve();
  if (pinActive()) return gsap.to(container, { opacity: 0.35, duration: 0.5, ease: 'power2.in' }).then();
  const originY = window.scrollY + window.innerHeight / 2;
  return gsap.to(container, {
    scale: 0.92,
    y: -24,
    opacity: 0.4,
    transformOrigin: `50% ${originY}px`,
    duration: 0.55,
    ease: 'expo.inOut',
  }).then();
}

/** La nouvelle page se pose : léger zoom avant pendant que le rideau sort. */
export function pageIn(container) {
  if (!container || env.reducedMotion) return;
  gsap.fromTo(container, { scale: 1.06, opacity: 0.6, transformOrigin: `50% ${window.innerHeight / 2}px` }, {
    scale: 1,
    opacity: 1,
    duration: 1.1,
    ease: 'expo.out',
    clearProps: 'transform,transformOrigin,opacity,scale',
  });
}
