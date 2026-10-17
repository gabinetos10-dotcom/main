/* ==========================================================================
   GJS — PAGE ACCUEIL (v3)
   Hero vidéo (zoom d'arrivée, se range en carte au défilement) · Manifeste au
   scrub · Leviers en cartes empilées (la précédente recule) · Projets
   (distorsion au survol + panneau qui s'ouvre en zoom depuis la carte) ·
   Trajectoire de la méthode · Arcade (records) · Carrousel de témoignages.
   Aucun effet ne suit le pointeur.
   ========================================================================== */

import { env, $, $$, clamp, store, trapFocus, yieldToMain } from '../core/utils.js';
import { lockScroll, unlockScroll } from '../core/scroll.js';

const { gsap, ScrollTrigger, Flip } = window;

/* ---------- Hero ----------------------------------------------------------- */

function initHero(scope, root) {
  const hero = $('.hero', root);
  const media = $('[data-hero-media]', root);
  const video = $('[data-hero-video]', root);
  const toggle = $('[data-video-toggle]', root);
  const sound = $('[data-video-sound]', root);
  if (!hero || !video) return;

  let userPaused = false;

  const renderUI = () => {
    const paused = video.paused;
    if (toggle) {
      toggle.textContent = paused ? 'Lire la vidéo' : 'Pause vidéo';
      toggle.setAttribute('aria-pressed', String(paused));
    }
  };

  const play = () => {
    const p = video.play();
    if (p && p.catch) p.catch(() => { renderUI(); });
  };

  // Économie de données : on coupe le téléchargement, le poster reste affiché
  if (env.saveData) {
    video.removeAttribute('autoplay');
    video.preload = 'none';
    video.querySelectorAll('source').forEach((s) => s.remove());
    video.load();
    video.dataset.disabled = 'true';
    if (toggle) toggle.hidden = true;
    if (sound) sound.hidden = true;
  } else if (env.reducedMotion) {
    // Mouvement réduit : pas de lecture automatique, l'utilisateur choisit
    video.pause();
    userPaused = true;
  } else {
    play();
  }

  const togglePlay = () => {
    if (video.dataset.disabled) return;
    if (video.paused) { userPaused = false; play(); } else { userPaused = true; video.pause(); }
  };

  scope.on(video, 'play', renderUI);
  scope.on(video, 'pause', renderUI);
  if (toggle) scope.on(toggle, 'click', togglePlay);
  if (sound) {
    scope.on(sound, 'click', () => {
      video.muted = !video.muted;
      sound.textContent = video.muted ? 'Son : coupé' : 'Son : activé';
      sound.setAttribute('aria-pressed', String(!video.muted));
    });
  }

  // Pause hors écran (performance), reprise si l'utilisateur n'a pas mis en pause
  scope.intersect(hero, (entry) => {
    if (video.dataset.disabled) return;
    if (!entry.isIntersecting) video.pause();
    else if (!userPaused) play();
  });

  renderUI();

  // Au défilement : la vidéo recule en carte arrondie, le texte monte et s'efface
  if (!env.reducedMotion) {
    const small = window.innerWidth < 768;
    gsap.timeline({
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: 'bottom top',
        scrub: 0.5,
        invalidateOnRefresh: true,
      },
    })
      .to(media, { scale: small ? 0.9 : 0.84, borderRadius: small ? 24 : 40, ease: 'none' }, 0)
      .to($('.hero__inner', root), { yPercent: -30, autoAlpha: 0, ease: 'none' }, 0)
      .to($('.hero__foot', root), { autoAlpha: 0, ease: 'none', duration: 0.3 }, 0);
  }
}

/* ---------- Manifeste : les mots s'allument au fil de la lecture ---------- */

function wrapWords(node) {
  Array.from(node.childNodes).forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const parts = child.textContent.split(/(\s+)/);
      const frag = document.createDocumentFragment();
      parts.forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        const span = document.createElement('span');
        span.className = 'mw';
        span.textContent = part;
        frag.appendChild(span);
      });
      child.replaceWith(frag);
    } else if (child.nodeType === Node.ELEMENT_NODE && !child.classList.contains('manifesto__img')) {
      wrapWords(child);
    }
  });
}

function initManifesto(scope, root) {
  const text = $('[data-manifesto]', root);
  if (!text || env.reducedMotion) return;
  wrapWords(text);
  const words = $$('.mw', text);
  const images = $$('.manifesto__img', text);
  // Les mots passent du gris (≥ 3:1, texte large) au blanc : lisibles à tout moment
  gsap.fromTo(words, { color: '#5D6A84' }, {
    color: '#FFFFFF',
    ease: 'none',
    stagger: 0.06,
    scrollTrigger: { trigger: text, start: 'top 78%', end: 'bottom 52%', scrub: 0.5 },
  });
  // Les pastilles d'image grossissent (zoom) à mesure qu'on lit
  gsap.fromTo(images, { scale: 0.2 }, {
    scale: 1,
    ease: 'back.out(1.6)',
    stagger: 0.2,
    scrollTrigger: { trigger: text, start: 'top 70%', end: 'bottom 60%', scrub: 0.8 },
  });
}

/* ---------- Leviers : la carte recouverte recule (zoom arrière) ----------- */

function initServices(scope, root) {
  const items = $$('.service', root);
  if (!items.length || env.reducedMotion) return;
  scope.mm.add('(min-width: 768px)', () => {
    items.forEach((item, i) => {
      const next = items[i + 1];
      const card = $('.service__card', item);
      const img = $('.service__media img', item);
      // L'image dézoome pendant que la carte arrive
      if (img) {
        gsap.fromTo(img, { scale: 1.25 }, {
          scale: 1,
          ease: 'none',
          scrollTrigger: { trigger: item, start: 'top bottom', end: 'top 25%', scrub: true },
        });
      }
      if (!next) return;
      gsap.to(card, {
        scale: 0.9 - (items.length - i) * 0.008,
        '--dim': 0.55,
        ease: 'none',
        scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 30%', scrub: true },
      });
    });
  });
}

/* ---------- Projets : distorsion au survol + panneau Flip ------------------ */

function initProjects(scope, root) {
  const projects = $$('[data-project]', root);
  const dialog = $('[data-project-panel]', root);
  if (!projects.length || !dialog) return;
  const panelMedia = $('[data-panel-media]', dialog);
  const panelContent = $('[data-panel-content]', dialog);
  const displacement = document.querySelector('#gjs-distort feDisplacementMap');
  let current = -1;
  let release = null;
  let trigger = null;
  let busy = false;

  // Distorsion SVG au survol (desktop) : une onde traverse l'image puis se calme
  if (env.finePointer && !env.reducedMotion && displacement) {
    projects.forEach((project) => {
      const btn = $('.project__trigger', project);
      scope.on(btn, 'pointerenter', () => {
        btn.classList.add('is-distorting');
        gsap.timeline({ overwrite: true })
          .to(displacement, { attr: { scale: 32 }, duration: 0.35, ease: 'power2.out' })
          .to(displacement, { attr: { scale: 0 }, duration: 0.9, ease: 'power3.out', onComplete: () => btn.classList.remove('is-distorting') });
      });
      scope.on(btn, 'pointerleave', () => {
        gsap.to(displacement, { attr: { scale: 0 }, duration: 0.3, overwrite: true, onComplete: () => btn.classList.remove('is-distorting') });
      });
    });
  }

  const fill = (index) => {
    const project = projects[index];
    const detail = $('.project__detail', project);
    panelContent.innerHTML = detail.innerHTML;
    const title = $('.project-panel__title', panelContent);
    if (title) title.id = 'project-panel-title';
    const picture = $('picture', project).cloneNode(true);
    const img = $('img', picture);
    img.removeAttribute('loading');
    img.sizes = '(min-width: 1024px) 58vw, 100vw';
    img.alt = $('img', project).alt;
    panelMedia.replaceChildren(picture);
  };

  const open = (index, fromBtn) => {
    if (busy) return;
    busy = true;
    current = index;
    trigger = fromBtn;
    const cardMedia = $('.project__media', projects[index]);
    fill(index);
    lockScroll('project');
    const state = Flip.getState(cardMedia);
    dialog.showModal();
    dialog.scrollTop = 0;
    release = trapFocus(dialog, { restore: false });
    if (env.reducedMotion) {
      gsap.fromTo(dialog, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, onComplete: () => { busy = false; } });
      return;
    }
    gsap.fromTo(dialog, { backgroundColor: 'rgba(2,5,14,0)' }, { backgroundColor: 'rgba(2,5,14,1)', duration: 0.6, ease: 'power2.out' });
    panelMedia.dataset.flipId = 'project-media';
    cardMedia.dataset.flipId = 'project-media';
    // L'image de la carte s'agrandit jusqu'à sa place dans le panneau
    Flip.from(state, {
      targets: panelMedia,
      duration: 1.05,
      ease: 'expo.inOut',
      absolute: true,
      onComplete: () => { busy = false; gsap.set(panelMedia, { clearProps: 'all' }); },
    });
    gsap.from(panelContent.children, { y: 40, autoAlpha: 0, stagger: 0.07, duration: 0.9, ease: 'expo.out', delay: 0.45 });
    gsap.from($$('.project-panel__nav, .panel__close', dialog), { autoAlpha: 0, duration: 0.6, delay: 0.7 });
  };

  const finish = () => {
    dialog.close();
    gsap.set([dialog, panelMedia], { clearProps: 'all' });
    unlockScroll('project');
    if (release) { release(); release = null; }
    if (trigger) trigger.focus({ preventScroll: true });
    busy = false;
  };

  const close = () => {
    if (!dialog.open || busy) return;
    busy = true;
    if (env.reducedMotion) {
      gsap.to(dialog, { autoAlpha: 0, duration: 0.25, onComplete: finish });
      return;
    }
    const cardMedia = $('.project__media', projects[current]);
    gsap.to(panelContent.children, { autoAlpha: 0, y: -20, duration: 0.3, stagger: 0.02 });
    gsap.to(dialog, { backgroundColor: 'rgba(2,5,14,0)', duration: 0.8, delay: 0.2 });
    Flip.fit(panelMedia, cardMedia, { duration: 0.85, ease: 'expo.inOut', absolute: true, onComplete: finish });
  };

  const next = () => {
    if (busy) return;
    const index = (current + 1) % projects.length;
    busy = true;
    gsap.to([panelMedia, panelContent], {
      autoAlpha: 0,
      duration: 0.3,
      onComplete: () => {
        current = index;
        trigger = $('.project__trigger', projects[index]);
        fill(index);
        dialog.scrollTop = 0;
        gsap.to([panelMedia, panelContent], { autoAlpha: 1, duration: 0.5, onComplete: () => { busy = false; } });
        if (!env.reducedMotion) {
          gsap.fromTo(panelMedia, { scale: 1.08 }, { scale: 1, duration: 0.9, ease: 'expo.out', clearProps: 'transform' });
          gsap.from(panelContent.children, { y: 30, autoAlpha: 0, stagger: 0.06, duration: 0.8, ease: 'expo.out' });
        }
      },
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
  const onLeave = () => { if (dialog.open) finish(); };
  scope.on(document, 'gjs:before-leave', onLeave);
  scope.cleanup(() => { if (dialog.open) finish(); });
}

/* ---------- Méthode : la frise se remplit, le vaisseau la parcourt -------- */

function initMethod(scope, root) {
  const section = $('[data-method]', root);
  if (!section) return;
  const track = $('.method__track', section);
  const fill = $('[data-method-fill]', section);
  const ship = $('[data-method-ship]', section);
  const steps = $$('.method__step', section);
  const dots = steps.map((s) => $('.method__dot', s));
  const rail = $('.method__rail', section);
  let positions = [];
  let horizontal = true;
  let progress = 0;

  const measure = () => {
    horizontal = window.matchMedia('(min-width: 1024px)').matches;
    const box = rail.getBoundingClientRect();
    const length = horizontal ? box.width : box.height;
    positions = dots.map((d) => {
      const r = d.getBoundingClientRect();
      const center = horizontal ? r.left + r.width / 2 - box.left : r.top + r.height / 2 - box.top;
      return length ? center / length : 0;
    });
    update(progress);
  };

  const update = (p) => {
    progress = p;
    const box = rail.getBoundingClientRect();
    if (horizontal) {
      gsap.set(fill, { scaleX: p, scaleY: 1 });
      gsap.set(ship, { x: p * box.width, y: 0 });
    } else {
      gsap.set(fill, { scaleY: p, scaleX: 1 });
      gsap.set(ship, { y: p * box.height, x: 0 });
    }
    steps.forEach((step, i) => step.classList.toggle('is-active', p >= positions[i] - 0.01));
  };

  if (env.reducedMotion) {
    steps.forEach((step) => step.classList.add('is-active'));
    return;
  }

  ScrollTrigger.create({
    trigger: track,
    start: 'top 70%',
    end: 'bottom 55%',
    scrub: 0.6,
    onUpdate: (self) => update(self.progress),
    onRefresh: (self) => { progress = self.progress; measure(); },
  });
  measure();
}

/* ---------- Arcade : records ---------------------------------------------- */

function initArcade(root) {
  $$('[data-highscore]', root).forEach((el) => {
    const best = store.get(`gjs-arcade-${el.dataset.highscore}`);
    if (best && best.score !== undefined) el.textContent = best.label || String(best.score);
  });
}

/* ---------- Témoignages : carrousel (glisser, flèches, clavier) ----------- */

function initCarousel(scope, root) {
  const carousel = $('[data-carousel]', root);
  if (!carousel) return;
  const viewport = $('.carousel__viewport', carousel);
  const track = $('[data-carousel-track]', carousel);
  const slides = $$('.quote', track);
  const status = $('[data-carousel-current]', carousel);
  const bar = $('[data-carousel-bar]', carousel);
  const prev = $('[data-carousel-prev]', carousel);
  const nextBtn = $('[data-carousel-next]', carousel);
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
  // Dernière position utile : la dernière carte collée au bord droit
  const maxShift = () => Math.max(0, track.scrollWidth - viewport.clientWidth + 16);
  const lastIndex = () => {
    const list = offsets();
    const max = maxShift();
    const i = list.findIndex((o) => o >= max - 1);
    return i === -1 ? slides.length - 1 : i;
  };
  const targetOf = (i) => -Math.min(offsets()[i], maxShift());

  // Une carte entièrement hors de la fenêtre est masquée aux technologies d'assistance
  const setActive = (x = targetOf(index)) => {
    const width = viewport.clientWidth;
    slides.forEach((s) => {
      const left = s.offsetLeft - slides[0].offsetLeft + x;
      const visible = left + s.offsetWidth > 8 && left < width - 8;
      s.setAttribute('aria-hidden', String(!visible));
    });
    status.textContent = String(index + 1).padStart(2, '0');
    const last = lastIndex();
    if (bar) bar.style.setProperty('--progress', ((index + 1) / (last + 1)).toFixed(3));
    if (prev) prev.disabled = index <= 0;
    if (nextBtn) nextBtn.disabled = index >= last;
  };

  const goTo = (i, immediate = false) => {
    index = clamp(i, 0, lastIndex());
    const target = targetOf(index);
    gsap.killTweensOf(pos);
    if (immediate || env.reducedMotion) { pos.x = target; apply(); }
    else gsap.to(pos, { x: target, duration: 1, ease: 'expo.out', onUpdate: apply });
    setActive(target);
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
    if (Math.abs(dx) > 4) moved = true;
    let next = startPos + dx;
    // Résistance élastique aux extrémités
    const min = -maxShift();
    if (next > 0) next *= 0.35;
    if (next < min) next = min + (next - min) * 0.35;
    pos.x = next;
    apply();
    const dt = Math.max(1, now - lastT);
    velocity = (e.clientX - lastX) / dt; // px/ms
    lastX = e.clientX;
    lastT = now;
  });

  const release = () => {
    if (!dragging) return;
    dragging = false;
    viewport.classList.remove('is-dragging');
    // Projection inertielle puis aimantation sur la carte la plus proche
    const projected = pos.x + velocity * 320;
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i <= lastIndex(); i += 1) {
      const d = Math.abs(targetOf(i) - projected);
      if (d < best) { best = d; nearest = i; }
    }
    goTo(nearest);
  };

  scope.on(viewport, 'pointerup', release);
  scope.on(viewport, 'pointercancel', release);
  scope.on(viewport, 'click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
  if (prev) scope.on(prev, 'click', () => goTo(index - 1));
  if (nextBtn) scope.on(nextBtn, 'click', () => goTo(index + 1));
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
    const steps = [initHero, initManifesto, initServices, initProjects, initMethod, initCarousel];
    for (const step of steps) {
      if (scope.destroyed) return;
      scope.add(() => step(scope, root));
      await yieldToMain();
    }
    initArcade(root);
    scope.on(document, 'gjs:highscore', () => initArcade(root));
  },
  intro(scope, root, tl) {
    // Arrivée : la vidéo dézoome doucement pendant que le titre monte
    const video = $('[data-hero-video]', root);
    if (video && !env.reducedMotion) tl.fromTo(video, { scale: 1.18 }, { scale: 1, duration: 2.2, ease: 'expo.out', clearProps: 'transform' }, 0);
  },
  destroy() {},
};
