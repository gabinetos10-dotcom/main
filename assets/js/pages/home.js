/* ==========================================================================
   GJS — PAGE ACCUEIL (v2)
   Hero vidéo (pause accessible, parallaxe légère, robot) · Expertises en
   onglets animés · Projets filtrables (GSAP Flip) + panneau de détail ·
   Méthode (frise remplie au scroll + vaisseau) · Arcade (records) ·
   Carrousel de témoignages (glisser, flèches, boutons).
   Tout passe par `scope` : Barba détruit le scope à chaque navigation.
   ========================================================================== */

import { env, $, $$, clamp, store, trapFocus, announce, yieldToMain } from '../core/utils.js';
import { lockScroll, unlockScroll } from '../core/scroll.js';

const { gsap, ScrollTrigger, Flip } = window;

/* ---------- 1. Hero -------------------------------------------------------- */

function initHero(scope, root) {
  const hero = $('.hero', root);
  const video = $('[data-hero-video]', root);
  const toggle = $('[data-video-toggle]', root);
  const label = toggle && $('[data-video-label]', toggle);
  if (!hero || !video) return;

  let userPaused = false;

  const renderUI = () => {
    if (!toggle) return;
    const paused = video.paused;
    if (label) label.textContent = paused ? 'Lecture' : 'Pause';
    toggle.classList.toggle('is-paused', paused);
  };

  const play = () => {
    const p = video.play();
    if (p && p.catch) p.catch(() => renderUI());
  };

  // Économie de données : on coupe le téléchargement, le poster reste affiché
  if (env.saveData) {
    video.removeAttribute('autoplay');
    video.preload = 'none';
    video.querySelectorAll('source').forEach((s) => s.remove());
    video.load();
    video.dataset.disabled = 'true';
    if (toggle) toggle.closest('.hero__controls').hidden = true;
  } else if (env.reducedMotion) {
    // Mouvement réduit : pas de lecture automatique, l'utilisateur choisit
    video.removeAttribute('autoplay');
    video.pause();
    userPaused = true;
  } else {
    play();
  }

  scope.on(video, 'play', renderUI);
  scope.on(video, 'pause', renderUI);
  if (toggle) {
    scope.on(toggle, 'click', () => {
      if (video.dataset.disabled) return;
      if (video.paused) { userPaused = false; play(); } else { userPaused = true; video.pause(); }
    });
  }

  // Pause hors écran (performance), reprise si l'utilisateur n'a pas mis en pause
  scope.intersect(hero, (entry) => {
    if (video.dataset.disabled) return;
    if (!entry.isIntersecting) video.pause();
    else if (!userPaused) play();
  });
  renderUI();

  if (env.reducedMotion) return;

  // Parallaxe douce au scroll : la vidéo descend, la planète remonte
  const planetWrap = $('[data-hero-planet]', hero);
  const st = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
  gsap.to(video, { yPercent: 14, ease: 'none', scrollTrigger: st });
  if (planetWrap) gsap.to(planetWrap, { yPercent: -18, ease: 'none', scrollTrigger: { ...st } });

  // Pointeur : la planète et le robot se décalent en sens opposés (profondeur)
  if (!env.finePointer) return;
  const planet = $('.planet', hero);
  const bot = $('[data-hero-robot]', hero);
  if (!planet || !bot) return;
  const opts = { duration: 1.1, ease: 'power3.out' };
  const px = gsap.quickTo(planet, 'x', opts);
  const py = gsap.quickTo(planet, 'y', opts);
  const rx = gsap.quickTo(bot, 'x', opts);
  const ry = gsap.quickTo(bot, 'y', opts);
  scope.on(hero, 'pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    px(nx * -26); py(ny * -18);
    rx(nx * 16); ry(ny * 12);
  });
  scope.on(hero, 'pointerleave', () => { px(0); py(0); rx(0); ry(0); });
}

/* ---------- 4. Expertises : onglets -------------------------------------- */

function initExpertise(scope, root) {
  const group = $('[data-expertise]', root);
  if (!group) return;
  const list = $('[role="tablist"]', group);

  // Orientation annoncée : verticale en desktop, horizontale (défilante) sinon
  const mq = window.matchMedia('(min-width: 1024px)');
  const orient = () => list.setAttribute('aria-orientation', mq.matches ? 'vertical' : 'horizontal');
  orient();
  scope.on(mq, 'change', orient);

  // Liste défilante (mobile) : on masque le dégradé de bord quand on est au bout
  const edge = () => list.classList.toggle('is-end', list.scrollLeft + list.clientWidth >= list.scrollWidth - 4);
  scope.on(list, 'scroll', edge, { passive: true });
  scope.resize(list, edge);

  const reveal = (tab) => {
    if (list.scrollWidth <= list.clientWidth + 1) return;
    const left = tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2;
    list.scrollTo({ left: clamp(left, 0, list.scrollWidth - list.clientWidth), behavior: env.reducedMotion ? 'auto' : 'smooth' });
  };

  scope.on(group, 'tabs:change', (e) => {
    const { panel, tab } = e.detail;
    reveal(tab);
    scope.add(() => {
      if (env.reducedMotion) {
        gsap.fromTo(panel, { opacity: 0 }, { opacity: 1, duration: 0.35, overwrite: true });
        return;
      }
      const media = $('[data-expertise-media]', panel);
      const img = media && $('img', media);
      const body = $('[data-expertise-body]', panel);
      if (media) {
        gsap.fromTo(media, { clipPath: 'inset(0% 0% 0% 42% round 18px)' }, { clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 0.9, ease: 'expo.out', overwrite: true, clearProps: 'clipPath' });
      }
      if (img) gsap.fromTo(img, { scale: 1.14 }, { scale: 1, duration: 1.2, ease: 'expo.out', overwrite: true });
      if (body) gsap.fromTo(body.children, { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.05, ease: 'power3.out', overwrite: true });
    });
  });
}

/* ---------- 5. Projets : filtres Flip + panneau --------------------------- */

function initFilters(scope, root) {
  const grid = $('[data-projects]', root);
  const buttons = $$('[data-filter]', root);
  if (!grid || !buttons.length) return;
  const items = $$('.project', grid);
  let active = 'all';
  let flip = null;

  const matches = (item, filter) => filter === 'all' || item.dataset.cats.split(' ').includes(filter);
  const nameOf = (btn) => btn.firstChild.textContent.trim();

  const apply = (filter, btn) => {
    if (filter === active) return;
    active = filter;
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    const shown = items.filter((it) => matches(it, filter));

    scope.add(() => {
      if (flip) { flip.progress(1); flip.kill(); flip = null; }
      const animate = !env.reducedMotion && Flip;
      const state = animate ? Flip.getState(items) : null;
      const h0 = grid.offsetHeight;
      items.forEach((it) => { it.style.display = shown.includes(it) ? '' : 'none'; });
      if (!animate) {
        gsap.fromTo(shown, { opacity: 0 }, { opacity: 1, duration: 0.3, overwrite: true });
        return;
      }
      const h1 = grid.offsetHeight;
      flip = Flip.from(state, {
        duration: 0.7,
        ease: 'expo.out',
        absoluteOnLeave: true,
        onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.55, delay: 0.12, ease: 'power3.out' }),
        onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.92, duration: 0.3, ease: 'power2.in' }),
        onComplete: () => { flip = null; },
      });
      if (h0 !== h1) flip.fromTo(grid, { height: h0 }, { height: h1, duration: 0.7, ease: 'expo.out', clearProps: 'height' }, 0);
    });

    const n = shown.length;
    const s = n > 1 ? 's' : '';
    announce(`${n} projet${s} affiché${s}${filter === 'all' ? '' : ` : ${nameOf(btn)}`}.`);
  };

  buttons.forEach((btn) => scope.on(btn, 'click', () => apply(btn.dataset.filter, btn)));
  scope.cleanup(() => { if (flip) flip.kill(); });
}

function initPanel(scope, root) {
  const projects = $$('[data-project]', root);
  const dialog = $('[data-project-panel]', root);
  if (!projects.length || !dialog) return;
  const panelMedia = $('[data-panel-media]', dialog);
  const panelContent = $('[data-panel-content]', dialog);
  let current = -1;
  let release = null;
  let trigger = null;
  let busy = false;

  const visible = () => projects.filter((p) => p.style.display !== 'none');

  const fill = (index) => {
    const project = projects[index];
    panelContent.innerHTML = $('.project__detail', project).innerHTML;
    const title = $('.project-panel__title', panelContent);
    if (title) title.id = 'project-panel-title';
    const picture = $('picture', project).cloneNode(true);
    const img = $('img', picture);
    img.removeAttribute('loading');
    img.removeAttribute('class');
    img.sizes = '(min-width: 1024px) 56vw, 100vw';
    panelMedia.replaceChildren(picture);
  };

  const open = (index, fromBtn) => {
    if (busy || dialog.open) return;
    busy = true;
    current = index;
    trigger = fromBtn;
    const cardMedia = $('.project__media', projects[index]);
    fill(index);
    lockScroll('project');
    const state = !env.reducedMotion && Flip ? Flip.getState(cardMedia) : null;
    dialog.showModal();
    dialog.scrollTop = 0;
    release = trapFocus(dialog, { restore: false });
    scope.add(() => {
      if (!state) {
        gsap.fromTo(dialog, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, onComplete: () => { busy = false; } });
        return;
      }
      gsap.fromTo(dialog, { '--panel-alpha': 0 }, { '--panel-alpha': 1, duration: 0.6, ease: 'power2.out' });
      panelMedia.dataset.flipId = 'project-media';
      cardMedia.dataset.flipId = 'project-media';
      Flip.from(state, {
        targets: panelMedia,
        duration: 1,
        ease: 'expo.inOut',
        absolute: true,
        onComplete: () => { busy = false; gsap.set(panelMedia, { clearProps: 'all' }); },
      });
      gsap.from(panelContent.children, { y: 36, autoAlpha: 0, stagger: 0.06, duration: 0.85, ease: 'expo.out', delay: 0.4 });
      gsap.from($$('.project-panel__nav, .panel__close', dialog), { autoAlpha: 0, duration: 0.5, delay: 0.6 });
    });
  };

  const finish = () => {
    if (dialog.open) dialog.close();
    gsap.killTweensOf([dialog, panelMedia, panelContent.children]);
    gsap.set([dialog, panelMedia], { clearProps: 'all' });
    unlockScroll('project');
    if (release) { release(); release = null; }
    if (trigger && document.contains(trigger)) trigger.focus({ preventScroll: true });
    busy = false;
  };

  const close = () => {
    if (!dialog.open || busy) return;
    busy = true;
    scope.add(() => {
      if (env.reducedMotion || !Flip) {
        gsap.to(dialog, { autoAlpha: 0, duration: 0.25, onComplete: finish });
        return;
      }
      const cardMedia = $('.project__media', projects[current]);
      gsap.to(panelContent.children, { autoAlpha: 0, y: -16, duration: 0.3, stagger: 0.02 });
      gsap.to(dialog, { '--panel-alpha': 0, duration: 0.7, delay: 0.2 });
      Flip.fit(panelMedia, cardMedia, { duration: 0.8, ease: 'expo.inOut', absolute: true, onComplete: finish });
    });
  };

  const next = () => {
    if (busy) return;
    const list = visible();
    const pos = list.indexOf(projects[current]);
    const index = projects.indexOf(list[(pos + 1) % list.length]);
    busy = true;
    scope.add(() => {
      gsap.to([panelMedia, panelContent], {
        autoAlpha: 0,
        duration: env.reducedMotion ? 0.15 : 0.3,
        onComplete: () => {
          current = index;
          trigger = $('.project__trigger', projects[index]);
          fill(index);
          dialog.scrollTop = 0;
          gsap.to([panelMedia, panelContent], { autoAlpha: 1, duration: 0.4, onComplete: () => { busy = false; } });
          if (!env.reducedMotion) gsap.from(panelContent.children, { y: 26, autoAlpha: 0, stagger: 0.05, duration: 0.7, ease: 'expo.out' });
          const name = $('.project-panel__title', panelContent);
          if (name) announce(`${name.textContent} affiché.`);
        },
      });
    });
  };

  projects.forEach((project, i) => {
    const btn = $('.project__trigger', project);
    scope.on(btn, 'click', () => open(i, btn));
  });
  scope.on(dialog, 'cancel', (e) => { e.preventDefault(); close(); });
  scope.on(dialog, 'click', (e) => {
    if (e.target.closest('[data-panel-close]')) close();
    else if (e.target.closest('[data-panel-next]')) next();
  });
  // Navigation Barba pendant que le panneau est ouvert : on le ferme sans animation
  scope.on(document, 'gjs:before-leave', () => { if (dialog.open) finish(); });
  scope.cleanup(() => { if (dialog.open) finish(); });
}

/* ---------- 7. Méthode : frise + vaisseau --------------------------------- */

function initMethod(scope, root) {
  const section = $('[data-method]', root);
  if (!section) return;
  const track = $('[data-method-track]', section);
  const rail = $('[data-method-rail]', section);
  const fill = $('[data-method-fill]', section);
  const ship = $('[data-method-ship]', section);
  const steps = $$('.method__step', section);
  const dots = steps.map((s) => $('.method__dot', s));

  // Mouvement réduit : frise déjà remplie (CSS), toutes les étapes actives, pas de vaisseau
  if (env.reducedMotion) {
    steps.forEach((s) => s.classList.add('is-active'));
    return;
  }

  let horizontal = true;
  let length = 0;
  let size = 0;
  let stops = [];
  let progress = 0;

  const measure = () => {
    horizontal = window.innerWidth >= 1024;
    const box = rail.getBoundingClientRect();
    length = horizontal ? box.width : box.height;
    size = ship.offsetWidth;
    stops = dots.map((d) => {
      const r = d.getBoundingClientRect();
      return horizontal ? r.left + r.width / 2 - box.left : r.top + r.height / 2 - box.top;
    });
  };

  const update = (p) => {
    progress = p;
    if (!length) return;
    const travel = Math.max(0, length - size);
    const center = size / 2 + p * travel;
    if (horizontal) {
      gsap.set(ship, { x: center, y: 1, xPercent: -50, yPercent: -50, rotation: 0 });
      gsap.set(fill, { scaleX: clamp(center / length, 0, 1), scaleY: 1 });
    } else {
      gsap.set(ship, { x: 1, y: center, xPercent: -50, yPercent: -50, rotation: 90 });
      gsap.set(fill, { scaleY: clamp(center / length, 0, 1), scaleX: 1 });
    }
    const nose = center + size / 2;
    steps.forEach((step, i) => step.classList.toggle('is-active', stops[i] <= nose));
  };

  ScrollTrigger.create({
    trigger: track,
    start: 'top 72%',
    end: 'bottom 60%',
    scrub: 0.6,
    onUpdate: (self) => update(self.progress),
    onRefresh: (self) => { measure(); update(self.progress); },
  });
  measure();
  update(progress);
}

/* ---------- 8. Arcade : records + aperçus ---------------------------------- */

function renderScores(root) {
  $$('[data-highscore]', root).forEach((el) => {
    const best = store.get(`gjs-arcade-${el.dataset.highscore}`);
    if (best && best.score !== undefined) el.textContent = best.label || String(best.score);
  });
}

function initArcade(scope, root) {
  const section = $('#arcade', root);
  renderScores(root);
  scope.on(document, 'gjs:highscore', () => renderScores(root));
  if (section) scope.intersect(section, (entry) => section.classList.toggle('is-inview', entry.isIntersecting), { rootMargin: '80px' });
}

/* ---------- 9. Témoignages : carrousel ------------------------------------ */

function initCarousel(scope, root) {
  const carousel = $('[data-carousel]', root);
  if (!carousel) return;
  const viewport = $('.carousel__viewport', carousel);
  const track = $('[data-carousel-track]', carousel);
  const slides = $$('.quote', track);
  const status = $('[data-carousel-current]', carousel);
  const bar = $('[data-carousel-bar]', carousel);
  const pos = { x: 0 };
  let index = 0;
  let dragging = false;
  let startX = 0;
  let startPos = 0;
  let lastX = 0;
  let lastT = 0;
  let velocity = 0;
  let moved = false;

  const offsets = () => slides.map((s) => s.offsetLeft - slides[0].offsetLeft);
  const apply = () => gsap.set(track, { x: pos.x });
  const minX = () => Math.min(0, viewport.clientWidth - track.scrollWidth);

  const setActive = () => {
    slides.forEach((s, i) => {
      s.classList.toggle('is-active', i === index);
      s.setAttribute('aria-hidden', String(i !== index));
    });
    status.textContent = String(index + 1).padStart(2, '0');
    if (bar) bar.style.transform = `scaleX(${(index + 1) / slides.length})`;
  };

  const goTo = (i, immediate = false) => {
    index = (i + slides.length) % slides.length;
    // La dernière carte reste calée à droite : pas de vide après elle
    const target = Math.max(-offsets()[index], minX());
    gsap.killTweensOf(pos);
    if (immediate || env.reducedMotion) { pos.x = target; apply(); }
    else scope.add(() => gsap.to(pos, { x: target, duration: 0.9, ease: 'expo.out', onUpdate: apply }));
    setActive();
  };

  scope.on(viewport, 'pointerdown', (e) => {
    if (e.button !== 0) return;
    dragging = true;
    moved = false;
    startX = lastX = e.clientX;
    lastT = performance.now();
    startPos = pos.x;
    velocity = 0;
    gsap.killTweensOf(pos);
    viewport.setPointerCapture(e.pointerId);
    viewport.classList.add('is-dragging');
  });

  scope.on(viewport, 'pointermove', (e) => {
    if (!dragging) return;
    const now = performance.now();
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 5) moved = true;
    let nextX = startPos + dx;
    // Résistance élastique aux extrémités
    if (nextX > 0) nextX *= 0.35;
    if (nextX < minX()) nextX = minX() + (nextX - minX()) * 0.35;
    pos.x = nextX;
    apply();
    velocity = (e.clientX - lastX) / Math.max(1, now - lastT); // px/ms
    lastX = e.clientX;
    lastT = now;
  });

  const release = (e) => {
    if (!dragging) return;
    dragging = false;
    viewport.classList.remove('is-dragging');
    if (!moved) {
      // Simple clic sur une carte voisine : on y va
      const hit = slides.findIndex((s) => { const r = s.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right; });
      goTo(hit >= 0 ? hit : index);
      return;
    }
    // Projection inertielle puis aimantation sur la carte la plus proche
    const projected = clamp(pos.x + velocity * 320, minX(), 0);
    let nearest = index;
    let best = Infinity;
    offsets().forEach((o, i) => {
      const d = Math.abs(Math.max(-o, minX()) - projected);
      if (d < best) { best = d; nearest = i; }
    });
    goTo(nearest);
  };

  scope.on(viewport, 'pointerup', release);
  scope.on(viewport, 'pointercancel', release);
  scope.on($('[data-carousel-prev]', carousel), 'click', () => goTo(index - 1));
  scope.on($('[data-carousel-next]', carousel), 'click', () => goTo(index + 1));
  scope.on(carousel, 'keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1); }
  });
  scope.resize(viewport, () => goTo(index, true));
  setActive();
}

/* ---------- Cycle de vie --------------------------------------------------- */

export default {
  async init(scope, root) {
    // Chaque bloc dans sa propre tâche (et dans le contexte GSAP de la page)
    const steps = [initHero, initExpertise, initFilters, initPanel, initMethod, initArcade, initCarousel];
    for (const step of steps) {
      if (scope.destroyed) return;
      scope.add(() => step(scope, root));
      await yieldToMain();
    }
  },
  destroy() {},
};
