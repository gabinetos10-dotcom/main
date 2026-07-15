/* ═══════════ GJS ARCADE — overlay, lifecycle, scores, sound ═══════════
   Games are modules with:  create(api) → { start(), stop() }
   The arcade owns: overlay open/close, canvas sizing, start/end panels,
   score chrome, localStorage high scores, tiny WebAudio synth, a11y. */

import { GAMES } from '../data/content.js';
import { createCodeRush } from './code-rush.js';
import { createFlowForge } from './flow-forge.js';
import { createDataHarvest } from './data-harvest.js';

const FACTORIES = {
  'code-rush': createCodeRush,
  'flow-forge': createFlowForge,
  'data-harvest': createDataHarvest,
};

const BEST_KEY = 'gjs-arcade-best';
const MUTE_KEY = 'gjs-arcade-muted';

const store = {
  get bests() { try { return JSON.parse(localStorage.getItem(BEST_KEY)) || {}; } catch { return {}; } },
  setBest(slug, score) {
    const b = store.bests;
    b[slug] = Math.max(b[slug] || 0, score);
    try { localStorage.setItem(BEST_KEY, JSON.stringify(b)); } catch { /* private mode */ }
  },
};

/* Minimal warm synth — square/triangle blips, no assets */
function makeSound() {
  let ctx = null;
  let muted = localStorage.getItem(MUTE_KEY) === '1';
  const ensure = () => (ctx ||= new (window.AudioContext || window.webkitAudioContext)());
  return {
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* ok */ }
      return muted;
    },
    beep(freq = 440, dur = 0.08, type = 'triangle', vol = 0.04) {
      if (muted) return;
      try {
        const ac = ensure();
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = type;
        o.frequency.value = freq;
        g.gain.setValueAtTime(vol, ac.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
        o.connect(g).connect(ac.destination);
        o.start();
        o.stop(ac.currentTime + dur);
      } catch { /* audio unavailable */ }
    },
    win()  { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.beep(f, 0.12, 'triangle', 0.05), i * 90)); },
    fail() { [220, 175].forEach((f, i) => setTimeout(() => this.beep(f, 0.16, 'sawtooth', 0.04), i * 110)); },
  };
}

export function initArcade() {
  const overlay = document.getElementById('arcade');
  const canvas = document.getElementById('arcade-canvas');
  const ui = document.getElementById('arcade-ui');
  const titleEl = document.getElementById('arcade-title');
  const scoreEl = document.getElementById('arcade-score');
  const bestEl = document.getElementById('arcade-best');
  const muteBtn = document.getElementById('arcade-mute');
  const closeBtn = document.getElementById('arcade-close');
  const stage = document.getElementById('arcade-stage');
  const ctx2d = canvas.getContext('2d');
  const sound = makeSound();

  let current = null;      // running game instance
  let currentSlug = null;
  let lastFocused = null;
  let raf = null;

  const isTouch = matchMedia('(hover: none)').matches;

  const size = { w: 0, h: 0, dpr: 1 };
  const resize = () => {
    size.dpr = Math.min(devicePixelRatio || 1, 2);
    size.w = stage.clientWidth;
    size.h = stage.clientHeight;
    canvas.width = size.w * size.dpr;
    canvas.height = size.h * size.dpr;
    ctx2d.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    current?.onResize?.();
  };
  window.addEventListener('resize', () => { if (overlay.classList.contains('is-open')) resize(); });

  const refreshBests = () => {
    const bests = store.bests;
    document.querySelectorAll('[data-best]').forEach((n) => {
      const b = bests[n.dataset.best];
      n.textContent = b ? `BEST ${b}` : 'NEW ✦';
    });
  };
  refreshBests();

  muteBtn.addEventListener('click', () => {
    const muted = sound.toggle();
    muteBtn.textContent = muted ? '♪ OFF' : '♪ ON';
    muteBtn.setAttribute('aria-pressed', String(muted));
  });
  if (sound.muted) { muteBtn.textContent = '♪ OFF'; muteBtn.setAttribute('aria-pressed', 'true'); }

  /* ── The API every game receives ── */
  const api = {
    canvas, ctx: ctx2d, ui, sound, isTouch,
    get w() { return size.w; },
    get h() { return size.h; },
    setScore(n) { scoreEl.textContent = `SCORE ${n}`; },
    onFrame(fn) {
      const loop = (t) => { fn(t); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
    },
    stopFrames() { cancelAnimationFrame(raf); raf = null; },
    gameOver(score) { showEnd(score); },
  };

  const meta = (slug) => GAMES.find((g) => g.slug === slug);

  function showStart(slug) {
    const g = meta(slug);
    ui.innerHTML = `
      <div class="game-panel">
        <span class="game-panel__glyph" aria-hidden="true">${g.glyph}</span>
        <h3 class="game-panel__title">${g.title}</h3>
        <p class="game-panel__pitch">${g.pitch}</p>
        <p class="game-panel__how mono">${g.how}</p>
        <button class="btn btn--primary btn--lg" data-action="start">Insert coin ▸</button>
      </div>`;
    ui.querySelector('[data-action="start"]').addEventListener('click', () => {
      ui.innerHTML = '';
      sound.beep(660, 0.1);
      current.start();
    });
    ui.querySelector('[data-action="start"]').focus();
  }

  function showEnd(score) {
    current?.stop?.();
    api.stopFrames();
    const prevBest = store.bests[currentSlug] || 0;
    const isBest = score > prevBest;
    store.setBest(currentSlug, score);
    refreshBests();
    bestEl.textContent = `BEST ${store.bests[currentSlug] || 0}`;
    isBest && score > 0 ? sound.win() : sound.fail();
    const g = meta(currentSlug);
    ui.innerHTML = `
      <div class="game-panel">
        <span class="game-panel__glyph" aria-hidden="true">${isBest && score > 0 ? '🏆' : g.glyph}</span>
        <h3 class="game-panel__title">${score > 0 ? 'Nice run.' : 'Ouch.'}</h3>
        <p class="game-panel__score mono">SCORE ${score}</p>
        ${isBest && score > 0 ? '<p class="game-panel__newbest mono">✦ NEW HIGH SCORE ✦</p>' : ''}
        <p class="game-panel__pitch">${score > 0
          ? 'Imagine that energy pointed at your project.'
          : 'Even our robots have off days. Again?'}</p>
        <div style="display:flex; gap:0.8rem; flex-wrap:wrap; justify-content:center;">
          <button class="btn btn--primary" data-action="retry">Once more ▸</button>
          <button class="btn btn--ghost" data-action="quit">Back to reality</button>
        </div>
      </div>`;
    ui.querySelector('[data-action="retry"]').addEventListener('click', () => {
      ui.innerHTML = '';
      sound.beep(660, 0.1);
      current.start();
    });
    ui.querySelector('[data-action="quit"]').addEventListener('click', close);
    ui.querySelector('[data-action="retry"]').focus();
  }

  function open(slug) {
    if (!FACTORIES[slug]) return;
    lastFocused = document.activeElement;
    currentSlug = slug;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    resize();
    titleEl.textContent = `GJS ARCADE — ${meta(slug).title.toUpperCase()}`;
    api.setScore(0);
    bestEl.textContent = `BEST ${store.bests[slug] || 0}`;
    current = FACTORIES[slug](api);
    showStart(slug);
  }

  function close() {
    current?.stop?.();
    api.stopFrames();
    current = null;
    ui.innerHTML = '';
    ctx2d.clearRect(0, 0, size.w, size.h);
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
    lastFocused?.focus?.();
  }

  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('is-open')) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab') return;
    // focus trap inside the overlay
    const f = [...overlay.querySelectorAll('button, a[href], input')].filter((n) => n.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  });

  /* Launchers: game cards + service hints */
  document.addEventListener('click', (e) => {
    const card = e.target.closest('[data-game]');
    if (card) { open(card.dataset.game); return; }
    const hint = e.target.closest('[data-launch]');
    if (hint) { e.preventDefault(); open(hint.dataset.launch); }
  });

  return { open, close };
}
