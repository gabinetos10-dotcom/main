/* ============================================================
   GJS · OVERPRINT — main.js
   The press operator: wires the loader's six milestones to real
   work, prints the shell, then hands the sheet to the reader.
   ============================================================ */

import './styles/base.css';
import './styles/overprint.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/plates.css';
import './styles/loader.css';
import './styles/games.css';
import './styles/egg.css';

import { createLoader } from './loader/loader.js';
import { applyStoredSession, getIntent, scopeInks } from './core/inks.js';
import { wantsShow, reducedMotion, finePointer } from './core/prefs.js';
import { initMotion, initPlateChoreo, initPageTurn, scrollToEl } from './core/motion.js';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initOverprint } from './core/overprint.js';
import { initHalftoneReveals } from './core/halftone.js';
import { dressPlates } from './core/registration.js';
import { initInkCursor } from './core/cursor.js';
import { initHeader } from './shell/header.js';
import { initMenu } from './shell/menu.js';
import { initPaperFeed } from './shell/scrollbar.js';
import { initMarginalia } from './shell/marginalia.js';
import { initInkMixer } from './shell/inkmixer.js';
import { initColophon } from './shell/colophon.js';
import { renderWork, renderPeople, paintHighScores, applyIntentHighlight } from './shell/plates.js';
import { initGameLaunchers } from './games/shell.js';
import { initMisprint } from './egg/misprint.js';

/* ---- milestone 1–2 are observed inside the loader ---- */
const loader = createLoader();

/* ---- restore the visitor's session (accent, intent, mix) ---- */
const storedIntent = applyStoredSession();

/* ---- milestone 3: the press itself (motion engine ready) ---- */
initMotion();
loader.milestone('press');

/* ---- milestone 4: paper grain keyed (decode the noise tile) ---- */
{
  const probe = new Image();
  const done = () => loader.milestone('grain');
  probe.onload = done;
  probe.onerror = done;
  probe.src = getComputedStyle(document.body, '::after')
    .backgroundImage.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
  setTimeout(done, 600); // the tile is tiny; never let it stall the press
}

/* ---- milestone 5: etch the 3D specimen (prefetch its chunk) ---- */
const specimenTarget = document.getElementById('specimen');
let specimenModule = null;
if (wantsShow() && specimenTarget) {
  import('./three/specimen.js')
    .then((m) => { specimenModule = m; })
    .catch(() => {})
    .finally(() => loader.milestone('specimen'));
} else {
  loader.milestone('specimen'); // nothing to etch — the poster stays
}

/* ---- milestone 6: mount the plates (build the whole shell) ---- */
dressPlates();
renderWork();
renderPeople();
paintHighScores();
initOverprint();
initHeader();
initMenu();
initMarginalia();
initInkMixer();
initColophon();
initGameLaunchers();
initMisprint();
initPlateChoreo();
initPageTurn(document.getElementById('work'));
initHalftoneReveals();
applyIntentHighlight(getIntent());
loader.milestone('plates');

/* ---- global in-page anchors (outside header & index card) ---- */
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || a.closest('.site-header') || a.closest('.index-card')) return;
  const target = document.querySelector(a.getAttribute('href'));
  if (!target) return;
  e.preventDefault();
  scrollToEl(target, -8);
  history.replaceState(null, '', a.getAttribute('href'));
});

/* ---- after handoff: the extras that must never block paint ---- */
loader.handoff.then(() => {
  initPaperFeed();
  if (finePointer() && !reducedMotion()) initInkCursor();

  // the 3D specimen fades in whenever its chunk has streamed in
  if (wantsShow() && specimenTarget) {
    const mount = () => {
      if (!specimenModule) return false;
      specimenModule.initSpecimen({
        container: specimenTarget,
        inks: scopeInks(document.getElementById('cover')),
        scrollDriver(onProgress) {
          ScrollTrigger.create({
            trigger: '#cover',
            endTrigger: '#scraping',
            start: 'top top',
            end: 'bottom center',
            scrub: true,
            onUpdate: (self) => onProgress(self.progress),
          });
        },
      });
      return true;
    };
    if (!mount()) {
      const wait = setInterval(() => { if (mount()) clearInterval(wait); }, 300);
      setTimeout(() => clearInterval(wait), 15000); // give up quietly offline
    }
  }

  // layout has settled (pin spacers, fonts) — re-measure the run
  requestAnimationFrame(() => ScrollTrigger.refresh());
});
