/* The ink cursor — a two-plate nib that follows the pointer with a
   little drag, leaves a fading ink trail, and separates its plates
   over anything interactive (a localized overprint shift).
   Desktop fine-pointers only; never on reduced motion. */

import { finePointer, reducedMotion } from './prefs.js';

const HOT = 'a, button, [role="button"], input, textarea, select, label, summary';

export function initInkCursor() {
  if (!finePointer() || reducedMotion()) return;

  const root = document.documentElement;
  root.classList.add('has-ink-cursor');

  const cur = document.createElement('div');
  cur.className = 'ink-cursor';
  cur.setAttribute('aria-hidden', 'true');
  cur.innerHTML = '<i class="ca"></i><i class="cb"></i>';
  document.body.appendChild(cur);

  let tx = innerWidth / 2, ty = innerHeight / 2; // target
  let x = tx, y = ty;                            // eased position
  let lastTrail = 0;
  let visible = false;
  let raf;

  const pool = [];
  for (let i = 0; i < 14; i++) {
    const d = document.createElement('i');
    d.className = 'ink-trail-dot';
    d.style.display = 'none';
    document.body.appendChild(d);
    pool.push(d);
  }
  let poolIdx = 0;

  function spawnTrail(px, py, ink) {
    const d = pool[poolIdx = (poolIdx + 1) % pool.length];
    d.style.display = 'block';
    d.style.left = `${px}px`;
    d.style.top = `${py}px`;
    d.style.background = ink;
    // restart the fade animation
    d.style.animation = 'none';
    void d.offsetWidth;
    d.style.animation = '';
  }

  document.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    tx = e.clientX; ty = e.clientY;
    if (!visible) { visible = true; cur.style.opacity = '1'; }
    const hot = e.target.closest?.(HOT);
    cur.classList.toggle('is-hot', !!hot);
    // read the local scope's inks so the cursor re-inks per section
    const scope = e.target.closest?.('.plate, .colophon, .game-shell') || document.body;
    const cs = getComputedStyle(scope);
    cur.style.setProperty('--op-a', cs.getPropertyValue('--op-a'));
    cur.style.setProperty('--op-b', cs.getPropertyValue('--op-b'));
    const now = performance.now();
    if (now - lastTrail > 40) {
      lastTrail = now;
      spawnTrail(x, y, cs.getPropertyValue('--op-a').trim() || '#324ea1');
    }
  }, { passive: true });

  document.addEventListener('pointerleave', () => {
    visible = false;
    cur.style.opacity = '0';
  });

  let running = false;
  function tick() {
    x += (tx - x) * 0.22;
    y += (ty - y) * 0.22;
    cur.style.transform = `translate(${x}px, ${y}px)`;
    raf = requestAnimationFrame(tick);
  }
  function start() {
    if (running) return;
    running = true;
    tick();
  }
  cur.style.opacity = '0';
  cur.style.transition = 'opacity 0.25s';
  start();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); running = false; }
    else start();
  });
}
