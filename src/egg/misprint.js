/* ============================================================
   THE MISPRINT — the director's test print.

   Triggers: the Konami code, or pressing the colophon pressmark
   three times. Plates go gloriously out of register, halftone
   blows up, and a secret zine page prints out: a hand-set note
   from the founders, a promo code, and the hidden strategy
   console (consulting's secret exhibit).

   Remembered in localStorage so it never re-triggers by accident;
   dismissible; cheap (CSS class + one overlay). Devs get an ASCII
   colophon in the console either way.
   ============================================================ */

import { PROMO_CODE } from '../config/content.js';
import { store } from '../core/prefs.js';
import { blip } from '../core/audio.js';
import { pressNote } from '../shell/plates.js';

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

const CONSOLE_REPLIES = {
  help: 'commands: advice · stack · quote · misprint · clear',
  advice: () => [
    'cancel the rewrite. ship the fix.',
    'your CMS is fine; your content model is not.',
    'automate the boring 40%, keep the human 60%.',
    'if the deck is longer than the plan, burn the deck.',
    'measure twice, print once.',
  ][Math.floor(Math.random() * 5)],
  stack: 'vite + vanilla modules + three.js + gsap + lenis. lean is a feature.',
  quote: `your promo code again, since you found the back room: ${PROMO_CODE}`,
  misprint: 'already printed. look around you.',
  clear: '',
};

let zine = null;

function buildZine() {
  zine = document.createElement('div');
  zine.className = 'zine';
  zine.setAttribute('role', 'dialog');
  zine.setAttribute('aria-modal', 'true');
  zine.setAttribute('aria-label', 'The Misprint — secret zine page');
  zine.innerHTML = `
    <article class="zine-page">
      <button type="button" class="zine-close" aria-label="Close the zine">✕</button>
      <p class="zine-kicker">Director's test print · not for distribution · plate ∞</p>
      <h2 class="zine-title op" data-op="You found the misprint.">You found the misprint.</h2>
      <div class="zine-note">
        <!-- PLACEHOLDER COPY: a warm hand-set note from the founders -->
        <p>Every print run hides one sheet where the plates slipped — and it is always
        our favorite. You pulled it out of the stack, which tells us something about you:
        you look closer than most. <em>So here is the back room.</em></p>
        <p style="margin-top:0.8em">Quote the code below when you write to us and we will take a slice
        off your first print run. — G, J &amp; S</p>
      </div>
      <p class="zine-promo">${PROMO_CODE}</p>
      <div class="strategy-console">
        <div class="sc-log">GJS STRATEGY CONSOLE v0.1 — consulting's secret exhibit.
type "help" to begin.</div>
        <form>
          <label class="visually-hidden" for="sc-input">Console command</label>
          <span aria-hidden="true">▸</span>
          <input id="sc-input" autocomplete="off" spellcheck="false" placeholder="help" />
        </form>
      </div>
    </article>`;
  document.body.appendChild(zine);

  zine.querySelector('.zine-close').addEventListener('click', closeZine);
  zine.addEventListener('click', (e) => { if (e.target === zine) closeZine(); });
  zine.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeZine(); });

  const log = zine.querySelector('.sc-log');
  const form = zine.querySelector('form');
  const input = zine.querySelector('input');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const cmd = input.value.trim().toLowerCase();
    if (!cmd) return;
    input.value = '';
    if (cmd === 'clear') { log.textContent = ''; return; }
    const reply = CONSOLE_REPLIES[cmd];
    const out = typeof reply === 'function' ? reply() : reply || `unknown plate: "${cmd}" — try "help"`;
    log.innerHTML += `\n<span class="sc-in">▸ ${cmd}</span>\n${out}`;
    log.scrollTop = log.scrollHeight;
    blip('tap');
  });
}

function openZine() {
  if (!zine) buildZine();
  zine.classList.add('is-open');
  document.documentElement.classList.add('is-locked');
  zine.querySelector('.zine-close').focus();
}

function closeZine() {
  zine?.classList.remove('is-open');
  document.documentElement.classList.remove('is-locked');
  // the wild overprint calms down when the zine is put away
  document.documentElement.classList.remove('misprint');
}

function trigger() {
  const html = document.documentElement;
  if (html.classList.contains('misprint')) return;
  if (document.querySelector('.game-shell.is-open')) return; // not mid-exhibit
  html.classList.add('misprint');
  blip('win');
  store.set('misprint-found', true);
  setTimeout(openZine, 900);
}

export function initMisprint() {
  // Konami code
  let idx = 0;
  addEventListener('keydown', (e) => {
    const expect = KONAMI[idx];
    idx = (e.key === expect || e.key.toLowerCase() === expect) ? idx + 1 : 0;
    if (idx === KONAMI.length) { idx = 0; trigger(); }
  });

  // three presses on the colophon pressmark
  const mark = document.querySelector('.colophon-mark');
  let presses = 0, pressTimer;
  mark?.addEventListener('click', () => {
    presses += 1;
    blip('stamp');
    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => { presses = 0; }, 1600);
    if (presses >= 3) { presses = 0; trigger(); }
  });

  // returning finders get a quiet wink instead of a re-trigger
  if (store.get('misprint-found')) {
    setTimeout(() => pressNote('The misprint remembers you. (↑↑↓↓←→←→BA still works.)'), 6000);
  }

  // the devtools colophon
  console.log(
    `%c
   ✛  G · J · S  —  printed in six warm inks  ✛

        ██████╗       ██╗███████╗
       ██╔════╝       ██║██╔════╝
       ██║  ███╗      ██║███████╗
       ██║   ██║ ██   ██║╚════██║
       ╚██████╔╝ ╚█████╔╝███████║
        ╚═════╝   ╚════╝ ╚══════╝

   histoires en couleurs — overprint everything.
   you read source. we like you. try ↑↑↓↓←→←→BA
`,
    'color:#9b2d84; font-family:monospace; font-size:11px;');
}
