/* ============================================================
   Exhibit A — PRESS RUN (→ Web Creation)

   Set the type before the press outruns you. A code token is
   called; type it (desktop) or tap the right block (everyone).
   Every correct block prints another row of the page on the
   canvas — halftone coarse, then sharp. Miss three and the run
   is over.
   ============================================================ */

import { fitCanvas, paintField } from './canvas.js';
import { overprint } from '../core/inks.js';
import { blip } from '../core/audio.js';

const TOKENS = [
  '<header>', '<nav>', '<main>', '<section>', '<footer>', '<h1>', '<article>',
  'display:grid', 'gap:1rem', 'color:var(--ink)', 'mix-blend:multiply', '@media',
  'const app', '=> render()', 'await fetch', 'export default', 'import gsap',
  'aria-label', 'alt="…"', ':focus-visible', 'font-display', 'clamp()', '60fps',
];

const ROWS_PER_PAGE = 8;

export function createGame(ctx) {
  const { canvas, stage } = ctx;
  const cv = fitCanvas(canvas, stage);
  const g = cv.ctx;

  let running = false;
  let raf = null;
  let score, lives, level, rows, combo;
  let target, options, typed;
  let timer, timerMax;
  let flash = 0;      // wrong-answer feedback
  let printAnim = 0;  // fresh-row resolve animation
  let last = 0;

  // tap targets under the canvas
  const prompt = document.createElement('div');
  prompt.className = 'pr-prompt';
  stage.appendChild(prompt);

  function pickToken() {
    target = TOKENS[Math.floor(Math.random() * TOKENS.length)];
    const opts = new Set([target]);
    while (opts.size < 3) opts.add(TOKENS[Math.floor(Math.random() * TOKENS.length)]);
    options = [...opts].sort(() => Math.random() - 0.5);
    typed = '';
    timerMax = Math.max(2.4, 5.2 - level * 0.45);
    timer = timerMax;
    prompt.innerHTML = '';
    options.forEach((tok) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pr-choice';
      b.textContent = tok;
      b.addEventListener('click', () => running && (tok === target ? success() : miss()));
      prompt.appendChild(b);
    });
  }

  function success() {
    combo = Math.min(combo + 1, 5);
    score += 10 * combo;
    rows += 1;
    printAnim = 1;
    ctx.setScore(score);
    blip('good');
    if (rows % ROWS_PER_PAGE === 0) {
      level += 1;
      blip('win');
    }
    pickToken();
  }

  function miss() {
    lives -= 1;
    combo = 1;
    flash = 1;
    blip('bad');
    if (lives <= 0) return end();
    pickToken();
  }

  function end() {
    running = false;
    prompt.innerHTML = '';
    ctx.gameOver(score);
  }

  function onKey(e) {
    if (!running || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key.length !== 1) return;
    e.preventDefault();
    if (target[typed.length]?.toLowerCase() === e.key.toLowerCase()) {
      typed += e.key;
      blip('tap');
      if (typed.length === target.length) success();
    } else {
      flash = 0.6;
    }
  }

  function draw(dt) {
    const { w, h } = cv.state;
    const inks = ctx.inks();
    const third = overprint(inks.a, inks.b);
    g.clearRect(0, 0, w, h);
    paintField(g, w, h, inks.a, 0.08);

    // ---- the page being printed ----
    const pw = Math.min(w * 0.62, 420);
    const ph = Math.min(h * 0.56, 460);
    const px = (w - pw) / 2;
    const py = h * 0.10;
    g.strokeStyle = inks.ink;
    g.globalAlpha = 0.5;
    g.strokeRect(px, py, pw, ph);
    g.globalAlpha = 1;

    const rowH = ph / ROWS_PER_PAGE;
    const pageRows = rows % ROWS_PER_PAGE || (rows > 0 ? ROWS_PER_PAGE : 0);
    for (let r = 0; r < pageRows; r++) {
      const isFresh = r === pageRows - 1 && printAnim > 0;
      const y = py + r * rowH + rowH * 0.22;
      const rw = pw * (0.55 + ((r * 37) % 40) / 100);
      if (isFresh) {
        // fresh row resolves from coarse dots to solid ink
        const dots = Math.floor(rw / 14);
        for (let d = 0; d < dots; d++) {
          const radius = 2 + (1 - printAnim) * 5;
          g.fillStyle = d % 2 ? inks.a : inks.b;
          g.beginPath();
          g.arc(px + 12 + d * 14, y + rowH * 0.28, Math.min(radius, 6), 0, Math.PI * 2);
          g.fill();
        }
      } else {
        g.fillStyle = r % 3 === 2 ? third : r % 2 ? inks.b : inks.a;
        g.globalAlpha = 0.85;
        g.fillRect(px + 10, y, rw - 20, rowH * 0.5);
        g.globalAlpha = 1;
      }
    }

    // ---- the roller (press head) sweeps with the timer ----
    const t = 1 - timer / timerMax;
    g.fillStyle = third;
    g.fillRect(px - 14, py + t * ph - 5, pw + 28, 10);
    g.fillStyle = inks.ink;
    g.fillRect(px - 20, py + t * ph - 9, 6, 18);
    g.fillRect(px + pw + 14, py + t * ph - 9, 6, 18);

    // ---- the call: token to set ----
    g.font = `700 ${Math.min(34, w * 0.06)}px "Spline Sans Mono", monospace`;
    g.textAlign = 'center';
    g.fillStyle = flash > 0 ? inks.b : inks.ink;
    g.fillText(target, w / 2, py + ph + 52);
    // typed progress underline
    if (typed.length) {
      g.fillStyle = inks.a;
      const full = g.measureText(target).width;
      g.fillRect(w / 2 - full / 2, py + ph + 62, full * (typed.length / target.length), 4);
    }

    // ---- lives: three small plates ----
    for (let i = 0; i < 3; i++) {
      g.fillStyle = i < lives ? inks.b : 'rgba(0,0,0,0.12)';
      g.fillRect(14 + i * 22, 14, 16, 10);
    }
    g.font = '600 11px "Spline Sans Mono", monospace';
    g.textAlign = 'left';
    g.fillStyle = inks.ink;
    g.globalAlpha = 0.6;
    g.fillText(`page ${level} · row ${pageRows}/${ROWS_PER_PAGE} · combo ×${combo}`, 14, 44);
    g.globalAlpha = 1;

    flash = Math.max(0, flash - dt * 2.5);
    printAnim = Math.max(0, printAnim - dt * 2.2);
  }

  function loop(ts) {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;
    timer -= dt;
    if (timer <= 0) miss();
    if (running) draw(dt);
  }

  return {
    start() {
      score = 0; lives = 3; level = 1; rows = 0; combo = 1;
      running = true;
      last = performance.now();
      pickToken();
      addEventListener('keydown', onKey);
      raf = requestAnimationFrame(loop);
    },
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      removeEventListener('keydown', onKey);
      prompt.remove();
      cv.destroy();
    },
  };
}
