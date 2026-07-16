/* ============================================================
   The exhibit shell — one full-screen frame all three games
   share. Opens with an ink-wipe in the visitor's accent ink,
   traps focus, keeps score, remembers the press-room record,
   and closes with the service one-liner.
   ============================================================ */

import { GAMES } from '../config/content.js';
import { inkWipe } from '../core/transitions.js';
import { scopeInks } from '../core/inks.js';
import { store } from '../core/prefs.js';
import { stopScroll } from '../core/motion.js';
import { isMuted, setMuted, blip } from '../core/audio.js';
import { pressNote, paintHighScores } from '../shell/plates.js';

let shellEl = null;
let current = null; // { game, meta }

function buildShell() {
  shellEl = document.createElement('section');
  shellEl.className = 'game-shell';
  shellEl.setAttribute('role', 'dialog');
  shellEl.setAttribute('aria-modal', 'true');
  shellEl.innerHTML = `
    <div class="game-bar">
      <span class="g-title"></span>
      <span class="g-plate"></span>
      <span class="g-score" aria-live="polite">score 0</span>
      <span class="g-hi"></span>
      <button type="button" class="g-mute" aria-label="Toggle sound"></button>
      <button type="button" class="g-close" aria-label="Close exhibit">✕</button>
    </div>
    <div class="game-stage">
      <canvas></canvas>
      <div class="game-panel game-panel--start">
        <div class="gp-inner">
          <h3 class="op"></h3>
          <p class="gp-desc"></p>
          <p class="gp-keys"></p>
          <button type="button" class="btn btn--accent op-box gp-start">Pull the lever</button>
        </div>
      </div>
      <div class="game-panel game-panel--end" hidden>
        <div class="gp-inner">
          <h3 class="op" data-op="Run complete">Run complete</h3>
          <p class="gp-score"></p>
          <p class="gp-newhigh" hidden>New press-room record</p>
          <p class="gp-line"></p>
          <div style="display:flex; gap:0.7rem; flex-wrap:wrap; justify-content:center">
            <button type="button" class="btn btn--accent op-box gp-again">Print another</button>
            <button type="button" class="btn btn--ghost op-frame gp-leave">Back to the almanac</button>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(shellEl);

  shellEl.querySelector('.g-close').addEventListener('click', closeGame);
  shellEl.querySelector('.gp-leave').addEventListener('click', closeGame);
  shellEl.querySelector('.g-mute').addEventListener('click', () => {
    setMuted(!isMuted());
    paintMute();
    blip('tap');
  });
  // document-level so it works no matter where focus sits
  document.addEventListener('keydown', (e) => {
    if (!current || !shellEl.classList.contains('is-open')) return;
    if (e.key === 'Escape') { e.stopPropagation(); closeGame(); }
    if (e.key !== 'Tab') return;
    const f = [...shellEl.querySelectorAll('button:not([hidden])')].filter((b) => b.offsetParent);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  paintMute();
}

function paintMute() {
  const b = shellEl.querySelector('.g-mute');
  b.textContent = isMuted() ? '🔇' : '🔊';
  b.setAttribute('aria-pressed', String(isMuted()));
}

/** API each game receives. */
function makeCtx(meta) {
  const stage = shellEl.querySelector('.game-stage');
  const canvas = shellEl.querySelector('canvas');
  const scoreEl = shellEl.querySelector('.g-score');
  let score = 0;

  return {
    stage,
    canvas,
    inks: () => scopeInks(shellEl),
    setScore(n) {
      score = n;
      scoreEl.textContent = `score ${n}`;
    },
    gameOver(finalScore) {
      const hiKey = `hs-${meta.id}`;
      const prev = store.get(hiKey, 0);
      const isNew = finalScore > prev;
      if (isNew) store.set(hiKey, finalScore);
      const end = shellEl.querySelector('.game-panel--end');
      end.querySelector('.gp-score').textContent = `final score · ${finalScore}`;
      end.querySelector('.gp-newhigh').hidden = !isNew;
      end.querySelector('.gp-line').textContent = meta.endline;
      end.hidden = false;
      blip(isNew ? 'win' : 'stamp');
      end.querySelector('.gp-again').focus();
      paintHighScores();
    },
    resetPanels() {
      shellEl.querySelector('.game-panel--end').hidden = true;
    },
  };
}

const loaders = {
  pressrun: () => import('./pressrun.js'),
  inkrouting: () => import('./inkrouting.js'),
  fieldcollector: () => import('./fieldcollector.js'),
};

export async function openGame(id) {
  const meta = GAMES[id];
  if (!meta || current) return;
  if (!shellEl) buildShell();

  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  const mod = await loaders[id]();

  await inkWipe(accent, () => {
    shellEl.classList.add('is-open');
    document.documentElement.classList.add('is-locked');
    stopScroll(true);

    shellEl.querySelector('.g-title').textContent = meta.title;
    shellEl.querySelector('.g-plate').textContent = `${meta.exhibit} · ${meta.service}`;
    shellEl.querySelector('.g-hi').textContent = `record ${store.get(`hs-${id}`, 0)}`;
    const start = shellEl.querySelector('.game-panel--start');
    start.hidden = false;
    const h3 = start.querySelector('h3');
    h3.textContent = meta.title;
    h3.dataset.op = meta.title;
    start.querySelector('.gp-desc').textContent = meta.desc;
    start.querySelector('.gp-keys').textContent = meta.keys;
    shellEl.querySelector('.game-panel--end').hidden = true;

    const ctx = makeCtx(meta);
    const game = mod.createGame(ctx);
    current = { game, meta, ctx };

    const begin = () => {
      start.hidden = true;
      ctx.resetPanels();
      ctx.setScore(0);
      blip('good');
      game.start();
    };
    start.querySelector('.gp-start').onclick = begin;
    shellEl.querySelector('.gp-again').onclick = () => {
      ctx.resetPanels();
      ctx.setScore(0);
      game.start();
    };
    start.querySelector('.gp-start').focus();
  });
}

export async function closeGame() {
  if (!current) return;
  const { game } = current;
  current = null;
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  await inkWipe(accent, () => {
    game.destroy?.();
    shellEl.classList.remove('is-open');
    document.documentElement.classList.remove('is-locked');
    stopScroll(false);
  });
  pressNote('Exhibit closed — the almanac continues below.');
}

export function initGameLaunchers() {
  document.querySelectorAll('[data-game]').forEach((btn) => {
    btn.addEventListener('click', () => openGame(btn.dataset.game));
  });
}
