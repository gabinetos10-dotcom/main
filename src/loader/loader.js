/* ============================================================
   The press loader — honest progress, useful wait.

   Six ink plates = six REAL load milestones. Each one registers
   (misaligned → snapped) as its milestone completes. While the
   press inks up, one tiny question captures intent and promotes
   an ink to the session accent.

   Discipline:
   - hard cap ~2.2s, then hand off regardless ("still inking" note
     if slow assets are genuinely pending);
   - returning visitors get a fast already-printed pass;
   - reduced motion → instant static version, question intact;
   - skippable with Escape; fully keyboard/screen-reader legible.
   ============================================================ */

import { INTENTS } from '../config/content.js';
import { setAccent } from '../core/inks.js';
import { store, reducedMotion } from '../core/prefs.js';
import { blip } from '../core/audio.js';

const MILESTONES = [
  { id: 'sheet',    label: 'paper loaded' },
  { id: 'type',     label: 'type set' },
  { id: 'press',    label: 'press warmed' },
  { id: 'grain',    label: 'grain keyed' },
  { id: 'specimen', label: 'specimen etched' },
  { id: 'plates',   label: 'plates mounted' },
];

const HARD_CAP_MS = 2200;
const RETURN_PASS_MS = 650;

export function createLoader() {
  const el = document.getElementById('press-loader');
  const plates = [...el.querySelectorAll('.loader-plate')];
  const counter = el.querySelector('.loader-counter');
  const stage = el.querySelector('.loader-stage');
  const intentBox = el.querySelector('.loader-intent');

  const returning = !!store.get('visited');
  const done = new Set();
  let finished = false;
  let shownCount = 0;
  let resolveHandoff;
  const handoff = new Promise((r) => { resolveHandoff = r; });

  // scatter each plate's misregistration so no two runs look alike
  plates.forEach((p) => {
    p.style.setProperty('--mx', `${(Math.random() * 44 - 22).toFixed(0)}px`);
    p.style.setProperty('--my', `${(Math.random() * 30 - 15).toFixed(0)}px`);
    p.style.setProperty('--mr', `${(Math.random() * 8 - 4).toFixed(1)}deg`);
  });

  function paintProgress() {
    const target = Math.round((done.size / MILESTONES.length) * 100);
    // count up smoothly but never lie past real progress
    const step = () => {
      if (shownCount < target) {
        shownCount = Math.min(target, shownCount + 3);
        counter.textContent = String(shownCount).padStart(2, '0');
        if (shownCount < target) requestAnimationFrame(step);
      }
    };
    step();
  }

  function milestone(id) {
    if (finished || done.has(id)) return;
    const idx = MILESTONES.findIndex((m) => m.id === id);
    if (idx === -1) return;
    done.add(id);
    plates[idx]?.classList.add('is-registered');
    stage.textContent = MILESTONES[idx].label;
    blip('tap');
    paintProgress();
    if (done.size === MILESTONES.length) finish();
  }

  function finish() {
    if (finished) return;
    finished = true;
    // snap any stragglers in — the cap fired before their asset landed
    const pending = MILESTONES.some((m) => !done.has(m.id));
    plates.forEach((p) => p.classList.add('is-registered'));
    counter.textContent = '100';
    stage.textContent = pending ? 'still inking…' : 'printed';
    blip('stamp');
    store.set('visited', true);

    const delay = reducedMotion() ? 0 : 350;
    setTimeout(() => {
      el.classList.add('is-done');
      document.documentElement.classList.remove('is-loading');
      resolveHandoff();
      // let the slide-up play out, then remove from the tree
      setTimeout(() => { el.hidden = true; }, 900);
    }, delay);
  }

  /* ---- intent capture ---- */
  const options = intentBox.querySelector('.intent-options');
  INTENTS.forEach((intent) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'intent-btn';
    b.style.setProperty('--ib', `var(--${intent.ink})`);
    b.innerHTML = `<span class="ink-dot" aria-hidden="true"></span>${intent.label}`;
    b.addEventListener('click', () => {
      setAccent(intent.ink);
      store.set('intent', intent.id);
      blip('good');
      intentBox.innerHTML =
        `<p role="status">Noted — we pulled the <strong>${intent.ink}</strong> plate for you.</p>`;
    });
    options.appendChild(b);
  });
  intentBox.querySelector('.intent-skip')?.addEventListener('click', () => {
    intentBox.style.visibility = 'hidden';
  });

  // ask only when there is a wait worth using; returning visitors
  // land warm with their stored accent already set
  const askIntent = !returning && !store.get('intent');
  if (askIntent) {
    setTimeout(() => intentBox.classList.add('is-in'), reducedMotion() ? 0 : 450);
  } else {
    intentBox.remove();
  }

  /* ---- skippability & caps ---- */
  const escSkip = (e) => { if (e.key === 'Escape') finish(); };
  document.addEventListener('keydown', escSkip);
  el.addEventListener('click', (e) => { if (!e.target.closest('button')) finish(); });
  handoff.then(() => document.removeEventListener('keydown', escSkip));
  setTimeout(finish, returning ? RETURN_PASS_MS : HARD_CAP_MS);

  /* ---- the real milestones this module can observe itself ---- */
  milestone('sheet'); // DOM parsed — we are executing
  document.fonts.ready.then(() => milestone('type'));
  Promise.all([
    document.fonts.load('600 1em Fraunces'),
    document.fonts.load('450 1em "Spline Sans Mono"'),
  ]).catch(() => {}).finally(() => milestone('type'));

  return { milestone, finish, handoff, returning };
}
