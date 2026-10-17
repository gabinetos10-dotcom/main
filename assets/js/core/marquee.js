/* ==========================================================================
   GJS — MARQUEE INFINI RÉACTIF AU SCROLL
   <div class="marquee" data-marquee data-speed="80" data-direction="-1">
     <div class="marquee__track"><div class="marquee__group">…</div></div>
   </div>
   La vitesse et le sens suivent la vélocité du scroll ; un léger skew
   accompagne les accélérations. Pause automatique hors viewport, au survol,
   au focus, et bouton pause/lecture (WCAG 2.2.2 : tout contenu qui défile
   plus de 5 s doit pouvoir être arrêté).
   ========================================================================== */

import { getVelocity, getDirection } from './scroll.js';
import { env, clamp, damp } from './utils.js';

const { gsap } = window;

export function createMarquee(el, scope) {
  const track = el.querySelector('.marquee__track');
  const group = el.querySelector('.marquee__group');
  if (!track || !group) return;

  const baseSpeed = parseFloat(el.dataset.speed || '70');
  const baseDir = parseFloat(el.dataset.direction || '-1');

  // Duplique le groupe jusqu'à couvrir 2× la largeur visible (boucle sans couture)
  const fill = () => {
    track.querySelectorAll('[data-clone]').forEach((c) => c.remove());
    const groupW = group.getBoundingClientRect().width || 1;
    const needed = Math.ceil((el.offsetWidth * 2) / groupW) + 1;
    for (let i = 0; i < needed; i += 1) {
      const clone = group.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.dataset.clone = '';
      track.appendChild(clone);
    }
    return groupW;
  };

  let groupW = fill();
  let x = 0;
  let skew = 0;
  let speedBoost = 0;
  let dir = 1;
  let active = true;
  let paused = false;
  let hovered = false;

  if (env.reducedMotion) return;

  // Bouton pause / lecture, aligné sur la marge droite du contenu
  const PAUSE = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><rect x="3.5" y="3" width="3" height="10" rx="1"/><rect x="9.5" y="3" width="3" height="10" rx="1"/></svg>';
  const PLAY = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M5 3.2v9.6a.6.6 0 0 0 .9.5l7.6-4.8a.6.6 0 0 0 0-1L5.9 2.7a.6.6 0 0 0-.9.5Z"/></svg>';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'marquee__toggle';
  const render = () => {
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', paused ? 'Reprendre le défilement' : 'Mettre en pause le défilement');
    toggle.innerHTML = paused ? PLAY : PAUSE;
  };
  render();
  el.appendChild(toggle);
  scope.cleanup(() => toggle.remove());
  scope.on(toggle, 'click', () => { paused = !paused; render(); });
  scope.on(el, 'pointerenter', () => { hovered = true; });
  scope.on(el, 'pointerleave', () => { hovered = false; });
  scope.on(el, 'focusin', () => { hovered = true; });
  scope.on(el, 'focusout', () => { hovered = false; });

  scope.resize(el, () => { groupW = fill(); });
  scope.intersect(el, (entry) => { active = entry.isIntersecting; }, { rootMargin: '100px' });

  const setX = gsap.quickSetter(track, 'x', 'px');
  const setSkew = gsap.quickSetter(track, 'skewX', 'deg');

  scope.ticker((time, deltaMs) => {
    if (!active || paused || hovered) return;
    const dt = Math.min(deltaMs / 1000, 0.05);
    const v = getVelocity();
    // Le sens s'inverse quand on remonte la page
    if (Math.abs(v) > 0.4) dir = getDirection() >= 0 ? 1 : -1;
    speedBoost += (Math.abs(v) * 0.09 - speedBoost) * damp(6, dt);
    const speed = baseSpeed * (1 + clamp(speedBoost, 0, 6));
    x += baseDir * dir * speed * dt;
    if (x <= -groupW) x += groupW;
    if (x > 0) x -= groupW;
    const targetSkew = clamp(-v * 0.35 * baseDir, -9, 9);
    skew += (targetSkew - skew) * damp(8, dt);
    setX(x);
    setSkew(skew);
  });
}
