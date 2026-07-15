/* ═══════════════════════════════════════════════════════════
   GJS AGENCY — entry point
   Boot order: styles → content render → loader (tracks real
   milestones) → 3D hero → motion system → shell components →
   arcade → easter eggs.
   ═══════════════════════════════════════════════════════════ */

/* Styles are linked from index.html <head> (not imported here) so the
   design renders even when the page is opened without Vite. */
window.__GJS_BOOTED = true; // tells the no-server helper in index.html we're alive

import { renderAll } from './components/render.js';
import { initLoader } from './components/loader.js';
import { initHeader } from './components/header.js';
import { initCursor } from './components/cursor.js';
import { initForm } from './components/form.js';

renderAll();

/* Real loading milestones the preloader counts through */
const fontsReady = document.fonts?.ready ?? Promise.resolve();
const windowLoaded = new Promise((r) => {
  if (document.readyState === 'complete') r();
  else window.addEventListener('load', r, { once: true });
});

/* Lazy-init the 3D hero (code-split; starts rendering behind the curtain) */
const heroPromise = import('./three/hero.js')
  .then(({ initHero }) => {
    const hero = initHero();
    return hero.ready.then(() => hero);
  })
  .catch(() => {
    document.getElementById('hero').classList.add('no-webgl');
    return { setDream() {}, pulse() {} };
  });

const loaderDone = initLoader([fontsReady, windowLoaded, heroPromise]);

/* Shell — independent of the loader */
initHeader();
initCursor();
initForm();

/* Motion system (Lenis + GSAP) */
const scrollReady = import('./scripts/scroll.js').then(({ initScroll }) => initScroll());

/* Choreographed handoff: curtain opens → hero timeline plays */
Promise.all([loaderDone, scrollReady]).then(([, scroll]) => {
  scroll.playHero?.();
});

/* Arcade + games (lazy — only the module graph, still tiny) */
import('./games/arcade.js').then(({ initArcade }) => initArcade());

/* Easter eggs need the hero handle for dream mode */
heroPromise.then((hero) => {
  import('./scripts/eggs.js').then(({ initEggs }) => initEggs({ hero }));
});
