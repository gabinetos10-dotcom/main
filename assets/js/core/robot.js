/* ==========================================================================
   GJS — ROBOT (mascotte)
   - Les yeux de chaque robot visible suivent le pointeur (souris, ou le
     dernier toucher sur mobile). Mouvement réduit : regard fixe.
   - [data-robot-talk] : un clic sur le robot affiche la réplique suivante dans
     sa bulle (annoncée aux lecteurs d'écran), qui disparaît après 4,5 s.

   Balisage (voir le générateur, partiel robot()) :
     <div class="robot-talk" data-robot-talk data-messages="Bip !|Bonjour">
       <button class="robot-talk__btn" type="button" aria-label="…">
         <svg class="robot" data-robot>… <g class="robot__pupils">…</g> …</svg>
       </button>
       <p class="robot-talk__bubble" role="status" aria-live="polite"></p>
     </div>
   ========================================================================== */

import { env } from './utils.js';

const { gsap } = window;

const robots = new Map(); // svg -> { pupils, max, visible }
let pointer = null;
let raf = 0;
let listening = false;
let io = null;

function look() {
  raf = 0;
  if (!pointer) return;
  robots.forEach((r, svg) => {
    if (!r.visible) return;
    const box = svg.getBoundingClientRect();
    if (!box.width) return;
    // Centre des yeux : 36 % de la hauteur du robot complet, 50 % du logo
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height * r.eyeY;
    const dx = pointer.x - cx;
    const dy = pointer.y - cy;
    const dist = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, dist / 240);
    r.pupils.style.transform = `translate(${((dx / dist) * r.max * k).toFixed(2)}px, ${((dy / dist) * r.max * 0.75 * k).toFixed(2)}px)`;
  });
}

function onPointer(e) {
  pointer = { x: e.clientX, y: e.clientY };
  if (!raf) raf = requestAnimationFrame(look);
}

function listen() {
  if (listening || env.reducedMotion) return;
  listening = true;
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('pointerdown', onPointer, { passive: true });
}

function observer() {
  if (io || !('IntersectionObserver' in window)) return io;
  io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const r = robots.get(entry.target);
      if (r) r.visible = entry.isIntersecting;
    });
  });
  return io;
}

/** Enregistre les robots de root. Renvoie une fonction de nettoyage. */
export function watchRobots(root = document) {
  const found = Array.from(root.querySelectorAll('svg[data-robot]'));
  found.forEach((svg) => {
    const pupils = svg.querySelector('.robot__pupils');
    if (!pupils || robots.has(svg)) return;
    const isMark = svg.classList.contains('robot--mark');
    robots.set(svg, { pupils, max: isMark ? 3 : 5, eyeY: isMark ? 0.56 : 0.36, visible: !observer() });
    if (io) io.observe(svg);
  });
  if (found.length) listen();
  return () => {
    found.forEach((svg) => {
      robots.delete(svg);
      if (io) io.unobserve(svg);
    });
  };
}

/* ---------- Bulles de dialogue ------------------------------------------- */

function initTalk(el, on) {
  const btn = el.querySelector('.robot-talk__btn');
  const bubble = el.querySelector('.robot-talk__bubble');
  if (!btn || !bubble) return () => {};
  const messages = (el.dataset.messages || 'Bip boup !').split('|').map((m) => m.trim()).filter(Boolean);
  let index = 0;
  let timer = 0;
  const hide = () => { el.classList.remove('is-talking'); };
  const talk = () => {
    clearTimeout(timer);
    bubble.textContent = messages[index % messages.length];
    index += 1;
    el.classList.add('is-talking');
    if (!env.reducedMotion && gsap) {
      gsap.fromTo(btn, { y: 0 }, { y: -10, duration: 0.18, ease: 'power2.out', yoyo: true, repeat: 1, overwrite: true });
    }
    timer = setTimeout(hide, 4500);
  };
  on(btn, 'click', talk);
  on(el, 'keydown', (e) => { if (e.key === 'Escape') hide(); });
  return () => clearTimeout(timer);
}

/** Robots et bulles d'une page (détruits avec son scope). */
export function initRobots(scope, root) {
  scope.cleanup(watchRobots(root));
  root.querySelectorAll('[data-robot-talk]').forEach((el) => {
    scope.cleanup(initTalk(el, (t, type, fn) => scope.on(t, type, fn)));
  });
}

/** Robots de l'interface persistante (header, menu, bandeau cookies). */
export function initChromeRobots() {
  const chrome = Array.from(document.querySelectorAll('[data-header], #menu, #cookies'));
  chrome.forEach((el) => {
    watchRobots(el);
    el.querySelectorAll('[data-robot-talk]').forEach((talk) => initTalk(talk, (t, type, fn) => t.addEventListener(type, fn)));
  });
}
