/* Preloader — real progress driven by actual boot milestones
   (fonts, window load, 3D init), eased toward the target so the
   counter feels alive instead of jumping. */

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initLoader(milestones) {
  const el = document.getElementById('loader');
  const countEl = document.getElementById('loader-count');
  const barEl = document.getElementById('loader-bar');
  document.documentElement.style.overflow = 'hidden';

  let target = 8; // something on screen immediately
  let shown = 0;
  const step = 92 / milestones.length;

  milestones.forEach((p) => p.then(() => { target = Math.min(100, target + step); }));
  // Safety valve: never hold the visitor hostage.
  setTimeout(() => { target = 100; }, 6000);

  return new Promise((resolve) => {
    if (REDUCED) {
      // Reduced motion: quick fade, no theatrics.
      Promise.race([Promise.all(milestones), new Promise((r) => setTimeout(r, 2500))]).then(() => {
        countEl.textContent = '100';
        barEl.style.width = '100%';
        finish(el, resolve, true);
      });
      return;
    }

    const start = performance.now();
    const tick = () => {
      shown += (target - shown) * 0.08;
      const val = Math.min(100, Math.round(shown));
      countEl.textContent = val;
      barEl.style.width = `${val}%`;
      const minTimeMet = performance.now() - start > 1400;
      if (val >= 100 && minTimeMet) {
        finish(el, resolve, false);
      } else {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  });
}

function finish(el, resolve, instant) {
  el.classList.add('is-done');
  document.documentElement.style.overflow = '';
  setTimeout(() => {
    el.classList.add('is-removed');
    el.setAttribute('aria-hidden', 'true');
  }, instant ? 50 : 950);
  // Hand off slightly before the curtain fully opens so the hero
  // animation overlaps the reveal — feels choreographed.
  setTimeout(resolve, instant ? 0 : 350);
}
