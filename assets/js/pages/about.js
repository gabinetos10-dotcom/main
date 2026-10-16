/* ==========================================================================
   GJS — PAGE QUI SOMMES-NOUS (v2)
   Hero : les lettres G · J · S s'écartent au scroll, le robot décolle de
   derrière l'horizon (sans épinglage, sans rotation ; mouvement réduit :
   état final statique, posé par le CSS) · équipe et valeurs : apparition
   en cascade · frise : rail rempli au scroll, étapes allumées au passage ·
   coulisses : entrée « du désordre à l'ordre » puis visionneuse (dialog).
   ========================================================================== */

import { env, $, $$, trapFocus } from '../core/utils.js';
import { lockScroll, unlockScroll } from '../core/scroll.js';

const { gsap, ScrollTrigger } = window;

/** Position verticale d'un élément dans la page (indépendante des transforms). */
function pageTop(el) {
  let y = 0;
  for (let node = el; node; node = node.offsetParent) y += node.offsetTop;
  return y;
}

/* ---------- 1. Hero ---------------------------------------------------------- */

function initHero(scope, root) {
  const hero = $('[data-about-hero]', root);
  const stage = hero && $('[data-hero-stage]', hero);
  if (!stage) return;
  const [g, j, s] = $$('[data-letter]', stage);
  const dots = $$('[data-dot]', stage);
  const robot = $('[data-hero-robot]', stage);
  const planet = $('[data-hero-planet]', stage);
  if (!g || !j || !s || !robot) return;

  // L'état final (G · J · S écartées, robot en vol) est celui du CSS :
  // sans JS ou en mouvement réduit, on le voit tel quel.
  scope.mm.add('(prefers-reduced-motion: no-preference)', () => {
    // Décalages « serrés » mesurés sur l'état final (offset* ignore les transforms)
    const toJ = () => j.offsetLeft - (g.offsetLeft + g.offsetWidth);
    const fromJ = () => (j.offsetLeft + j.offsetWidth) - s.offsetLeft;
    const lift = () => stage.offsetWidth * 0.32;

    gsap.timeline({
      defaults: { ease: 'none', duration: 1 },
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        // Fin : quand le bas de la scène atteint 35 % de l'écran (jamais moins de 240 px)
        end: () => `+=${Math.max(240, pageTop(stage) + stage.offsetHeight - window.innerHeight * 0.35)}`,
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
    })
      .fromTo(g, { x: toJ }, { x: 0, ease: 'power2.out' }, 0)
      .fromTo(s, { x: fromJ }, { x: 0, ease: 'power2.out' }, 0)
      .fromTo(dots, { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, ease: 'power2.out', duration: 0.5 }, 0.35)
      .fromTo(robot, { y: lift, scale: 0.9 }, { y: 0, scale: 1, ease: 'power2.out' }, 0)
      .fromTo(planet, { y: 0 }, { y: () => -stage.offsetWidth * 0.05 }, 0);
  });
}

/* ---------- 2-3. Cartes : apparition en cascade ------------------------------ */

// Les cartes ont leur propre transform au survol : on efface les styles
// posés par GSAP à la fin, pour que le CSS reprenne la main.
function revealCards(list) {
  if (!list) return;
  const items = Array.from(list.children);
  const vars = env.reducedMotion
    ? { opacity: 0, duration: 0.5, stagger: 0.05 }
    : { opacity: 0, y: 36, duration: 0.9, ease: 'power3.out', stagger: 0.08 };
  gsap.from(items, { ...vars, clearProps: 'opacity,transform', scrollTrigger: { trigger: list, start: 'top 88%', once: true } });
}

/* ---------- 5. Trajectoire ---------------------------------------------------- */

function initTimeline(scope, root) {
  const wrap = $('[data-timeline]', root);
  if (!wrap) return;
  const rail = $('.timeline__rail', wrap);
  const fill = $('[data-rail-fill]', wrap);
  const steps = $$('[data-step]', wrap);
  const dots = steps.map((step) => $('[data-dot]', step));
  if (!rail || !fill || steps.length < 2) return;

  let top = 0;
  let length = 1;
  let marks = [];

  // Le rail relie le premier point au dernier, mesurés dans la frise
  // (rectangles fractionnaires : offsetTop arrondit au pixel)
  const layout = () => {
    const origin = wrap.getBoundingClientRect().top;
    const centers = dots.map((dot) => { const b = dot.getBoundingClientRect(); return b.top + b.height / 2 - origin; });
    top = centers[0];
    length = Math.max(1, centers[centers.length - 1] - top);
    marks = centers.map((c) => (c - top) / length);
    rail.style.top = `${top}px`;
    rail.style.height = `${length}px`;
  };
  layout();
  scope.resize(wrap, layout);

  if (env.reducedMotion) return; // rail plein, toutes les étapes allumées

  wrap.classList.add('is-live');
  scope.cleanup(() => wrap.classList.remove('is-live'));
  const update = (self) => {
    const p = self.progress;
    fill.style.setProperty('--progress', p.toFixed(4));
    steps.forEach((step, i) => step.classList.toggle('is-reached', p > 0 && p >= marks[i] - 0.002));
  };
  ScrollTrigger.create({
    trigger: wrap,
    // La pointe du rail suit la ligne des 60 % de l'écran
    start: () => `top+=${top} 60%`,
    end: () => `top+=${top + length} 60%`,
    onUpdate: update,
    onRefresh: update,
  });
}

/* ---------- 6. Coulisses ------------------------------------------------------ */

function enterBackstage(grid, shots) {
  if (env.reducedMotion) {
    gsap.from(shots, { opacity: 0, duration: 0.5, stagger: 0.04, clearProps: 'opacity', scrollTrigger: { trigger: grid, start: 'top 85%', once: true } });
    return;
  }
  // Désordre → ordre : les photos partent d'une pile au centre de la grille
  // (jamais hors du conteneur) et rejoignent leur case. clearProps : l'état
  // final est la grille CSS, au pixel près.
  const tilt = [-6, 4, -3, 7, 5, -7, 3, -4];
  const offset = (el, axis) => {
    const c = axis === 'x' ? grid.offsetWidth / 2 : grid.offsetHeight / 2;
    const own = axis === 'x' ? el.offsetLeft + el.offsetWidth / 2 : el.offsetTop + el.offsetHeight / 2;
    return (c - own) * 0.7;
  };
  gsap.from(shots, {
    x: (i, el) => offset(el, 'x'),
    y: (i, el) => offset(el, 'y'),
    rotation: (i) => tilt[i % tilt.length],
    scale: 0.82,
    opacity: 0,
    duration: 1.2,
    ease: 'expo.out',
    stagger: 0.06,
    clearProps: 'transform,opacity',
    scrollTrigger: { trigger: grid, start: 'top 80%', once: true },
  });
}

function initLightbox(scope, section, links) {
  const dialog = $('[data-lightbox]', section);
  if (!dialog || !links.length || typeof dialog.showModal !== 'function') return;
  const media = $('[data-lightbox-media]', dialog);
  const caption = $('[data-lightbox-caption]', dialog);
  const counter = $('[data-lightbox-index]', dialog);
  let index = 0;
  let opener = null;
  let locked = false;
  let release = null;

  const show = (i) => {
    index = (i + links.length) % links.length;
    const link = links[index];
    const picture = link.querySelector('picture').cloneNode(true);
    picture.querySelectorAll('source, img').forEach((node) => node.setAttribute('sizes', '(min-width: 1024px) 70vw, 100vw'));
    const img = picture.querySelector('img');
    img.loading = 'eager';
    img.removeAttribute('class');
    media.replaceChildren(picture);
    caption.textContent = link.closest('figure').querySelector('figcaption').textContent;
    counter.textContent = String(index + 1);
    if (!env.reducedMotion) gsap.fromTo(picture, { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.45, ease: 'power3.out' });
  };

  // Fin de visionneuse : appelée par l'événement close, et directement au
  // démontage de la page (l'événement close est asynchrone).
  const finish = () => {
    if (release) { release(); release = null; }
    if (locked) { unlockScroll('lightbox'); locked = false; }
    gsap.killTweensOf(dialog);
    gsap.set(dialog, { clearProps: 'opacity' });
    media.replaceChildren();
    if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    opener = null;
  };

  const open = (i, from) => {
    if (dialog.open) return;
    opener = from;
    show(i);
    lockScroll('lightbox');
    locked = true;
    dialog.showModal();
    // Le dialog natif laisse Tab sortir vers le navigateur : on boucle dedans
    release = trapFocus(dialog, { restore: false, initial: $('[data-lightbox-close]', dialog) });
    if (!env.reducedMotion) gsap.fromTo(dialog, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });
  };

  const close = () => { if (dialog.open) dialog.close(); };

  links.forEach((link, i) => scope.on(link, 'click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    open(i, link);
  }));
  scope.on($('[data-lightbox-prev]', dialog), 'click', () => show(index - 1));
  scope.on($('[data-lightbox-next]', dialog), 'click', () => show(index + 1));
  scope.on($('[data-lightbox-close]', dialog), 'click', close);
  scope.on(dialog, 'keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1); }
  });
  // Clic dans le vide autour de la photo : fermeture
  scope.on(dialog, 'click', (e) => {
    if (e.target === dialog || e.target.matches('.lightbox__inner, .lightbox__figure, .lightbox__media, .lightbox__media picture')) close();
  });
  scope.on(dialog, 'close', finish);
  scope.on(document, 'gjs:before-leave', close);
  scope.cleanup(() => {
    opener = null;
    if (dialog.open) dialog.close();
    finish();
  });
}

function initBackstage(scope, root) {
  const section = $('[data-backstage]', root);
  if (!section) return;
  const grid = $('[data-backstage-grid]', section);
  const shots = $$('[data-shot]', grid);
  if (!shots.length) return;
  enterBackstage(grid, shots);
  initLightbox(scope, section, $$('[data-shot-open]', grid));
}

/* ---------- Cycle de vie ------------------------------------------------------ */

export default {
  init(scope, root) {
    initHero(scope, root);
    revealCards($('.team__list', root));
    revealCards($('.values__list', root));
    initTimeline(scope, root);
    initBackstage(scope, root);
  },
  destroy() {},
};
