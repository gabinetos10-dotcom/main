/* Custom cursor — desktop fine-pointer only, lerped follow,
   morphs + labels over interactive elements. Native cursor stays
   visible underneath for usability. */

export function initCursor() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const el = document.getElementById('cursor');
  const label = el.querySelector('.cursor__label');
  let x = innerWidth / 2, y = innerHeight / 2;
  let tx = x, ty = y;
  let raf = null;

  const loop = () => {
    x += (tx - x) * 0.18;
    y += (ty - y) * 0.18;
    el.style.transform = `translate(${x}px, ${y}px)`;
    raf = requestAnimationFrame(loop);
  };

  window.addEventListener('pointermove', (e) => {
    tx = e.clientX; ty = e.clientY;
    if (!raf) loop();
  }, { passive: true });

  window.addEventListener('pointerdown', () => el.classList.add('is-down'));
  window.addEventListener('pointerup', () => el.classList.remove('is-down'));

  const HOVER_SEL = 'a, button, input, textarea, [data-cursor]';
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest(HOVER_SEL);
    el.classList.toggle('is-hovering', !!t);
    const text = t?.dataset?.cursor;
    el.classList.toggle('has-label', !!text);
    if (text) label.textContent = text;
  });
}
