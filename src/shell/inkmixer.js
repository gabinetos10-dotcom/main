/* The Ink Mixer — the visitor picks two spot inks and the whole
   spread re-inks itself through the overprint engine (we only swap
   --op-a/--op-b; every derived color is mixed live by multiply).
   Tap-based so it is equally good on touch and keyboards; the mix
   persists for the session. */

import { INKS, INK_NAMES } from '../config/content.js';
import { overprint } from '../core/inks.js';
import { store } from '../core/prefs.js';
import { blip } from '../core/audio.js';

export function initInkMixer() {
  const mixer = document.querySelector('.ink-mixer');
  if (!mixer) return;
  const scope = mixer.closest('.plate') || document.documentElement;
  const tray = mixer.querySelector('.mixer-tray');
  const slots = [...mixer.querySelectorAll('.mixer-slot i')];
  const note = mixer.querySelector('.mixer-note');

  let pick = [];

  function apply([a, b], silent = false) {
    scope.style.setProperty('--op-a', INKS[a]);
    scope.style.setProperty('--op-b', INKS[b]);
    slots[0].style.setProperty('--slot-ink', INKS[a]);
    slots[1].style.setProperty('--slot-ink', INKS[b]);
    note.textContent =
      `${a} × ${b} overprint to ${overprint(INKS[a], INKS[b])} — mixed on the sheet, not in the file.`;
    store.set('mix', [a, b]);
    if (!silent) blip('good');
  }

  INK_NAMES.forEach((name) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mixer-swatch';
    b.style.setProperty('--dot', INKS[name]);
    b.setAttribute('aria-label', `Ink: ${name}`);
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => {
      blip('tap');
      pick.push(name);
      if (pick.length > 2) pick = [name];
      tray.querySelectorAll('.mixer-swatch').forEach((s) =>
        s.setAttribute('aria-pressed', String(pick.includes(s.getAttribute('aria-label').slice(5)))));
      if (pick.length === 1) {
        slots[0].style.setProperty('--slot-ink', INKS[name]);
        slots[1].style.setProperty('--slot-ink', 'transparent');
        note.textContent = `${name} on plate A — pick a second ink.`;
      }
      if (pick.length === 2) apply(pick);
    });
    tray.appendChild(b);
  });

  // restore the visitor's session mix
  const saved = store.get('mix');
  if (Array.isArray(saved) && saved.every((n) => INKS[n])) {
    pick = [...saved];
    apply(saved, true);
  }
}
