/* ═══ CODE RUSH — Web Creation ═══
   Complete falling code lines before the clock melts. Every correct
   token visibly assembles a little website on the canvas — the payoff
   is literally "we build sites". Desktop: keys 1/2/3. Mobile: tap. */

const C = {
  gold: '#ffc243', apricot: '#eb6a29', raspberry: '#9b2d84',
  cloud: '#a0c3eb', indigo: '#324ea1', blush: '#f0bed9',
  ink: '#1a1633', cream: '#f3ece3',
};

/* Each puzzle: a line with a ___ blank, 3 choices, index of the truth */
const PUZZLES = [
  { line: "const site = await gjs.___('dream')", opts: ['build', 'sleep', 'panic'], ok: 0 },
  { line: 'header.style.vibe = "___"', opts: ['beige', 'warm', 'meh'], ok: 1 },
  { line: 'if (!user.happy) ___()', opts: ['iterate', 'shrug', 'invoice'], ok: 0 },
  { line: 'grid.columns = ___', opts: ['"chaos"', '12', 'maybe'], ok: 1 },
  { line: 'animation.easing = "___"', opts: ['linear', 'jank', 'ease-out'], ok: 2 },
  { line: 'await deploy({ bugs: ___ })', opts: ['0', 'lots', '"later"'], ok: 0 },
  { line: 'font.load("___ Grotesk")', opts: ['Comic', 'Space', 'Papyrus'], ok: 1 },
  { line: 'perf.target = ___fps', opts: ['24', '60', '7'], ok: 1 },
  { line: 'colors.push("#___")', opts: ['ffc243', 'ffffff', '000000'], ok: 0 },
  { line: 'client.expectations.___()', opts: ['ignore', 'exceed', 'lower'], ok: 1 },
  { line: 'while (pixel.off) pixel.___()', opts: ['nudge', 'delete', 'blame'], ok: 0 },
  { line: 'seo.title = "___"', opts: ['Untitled', 'Home', 'GJS ✦'], ok: 2 },
  { line: 'cart.checkout({ friction: ___ })', opts: ['null', 'max', '"some"'], ok: 0 },
  { line: 'lighthouse.score >= ___', opts: ['50', '95', '11'], ok: 1 },
];

const START_TIME = 45; // seconds

export function createCodeRush(api) {
  const { ctx, ui, sound } = api;
  let running = false;
  let score, combo, timeLeft, built, puzzle, order, pIdx, lastT, flash;
  let choicesEl = null;

  const nextPuzzle = () => {
    pIdx = (pIdx + 1) % order.length;
    if (pIdx === 0) order.sort(() => Math.random() - 0.5);
    puzzle = PUZZLES[order[pIdx]];
    renderChoices();
  };

  function renderChoices() {
    choicesEl.innerHTML = puzzle.opts
      .map((o, i) => `<button data-i="${i}"><span class="mono" style="opacity:.5">${i + 1}·</span> ${o}</button>`)
      .join('');
  }

  function answer(i, btn) {
    if (!running) return;
    if (i === puzzle.ok) {
      combo += 1;
      const gain = 100 * Math.min(combo, 8);
      score += gain;
      timeLeft = Math.min(timeLeft + 1.2, 60);
      built += 1;
      flash = { color: C.gold, until: performance.now() + 180 };
      btn?.classList.add('is-right');
      sound.beep(520 + combo * 40, 0.07);
      setTimeout(nextPuzzle, 120);
    } else {
      combo = 0;
      timeLeft -= 4;
      flash = { color: C.apricot, until: performance.now() + 220 };
      btn?.classList.add('is-wrong');
      sound.beep(180, 0.15, 'sawtooth');
      setTimeout(renderChoices, 220);
    }
    api.setScore(score);
  }

  const onKey = (e) => {
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 3) answer(n - 1, choicesEl?.children[n - 1]);
  };

  /* Draws the little website that assembles as you score.
     Stages: frame → header → hero → text → images → button → glow. */
  function drawSite(x, y, w, h) {
    const stage = built;
    ctx.save();
    ctx.translate(x, y);
    // browser frame
    ctx.fillStyle = 'rgba(160,195,235,0.08)';
    ctx.strokeStyle = C.cloud;
    ctx.lineWidth = 1.5;
    roundRect(0, 0, w, h, 12);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.blush;
    [14, 30, 46].forEach((cx) => { ctx.beginPath(); ctx.arc(cx, 14, 4, 0, 7); ctx.fill(); });
    const pad = 12, top = 28;
    if (stage >= 1) { // header bar
      ctx.fillStyle = C.indigo;
      roundRect(pad, top, w - pad * 2, 14, 5); ctx.fill();
    }
    if (stage >= 2) { // hero block (sunrise gradient)
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, C.gold); g.addColorStop(0.6, C.apricot); g.addColorStop(1, C.raspberry);
      ctx.fillStyle = g;
      roundRect(pad, top + 22, w - pad * 2, h * 0.3, 8); ctx.fill();
    }
    if (stage >= 3) { // text lines
      ctx.fillStyle = 'rgba(243,236,227,0.5)';
      const ty = top + 30 + h * 0.3;
      [0.9, 0.75, 0.6].forEach((f, i) => { roundRect(pad, ty + i * 12, (w - pad * 2) * f, 6, 3); ctx.fill(); });
    }
    if (stage >= 4) { // image cards
      ctx.fillStyle = C.raspberry;
      const iy = top + 76 + h * 0.3;
      const cw = (w - pad * 2 - 12) / 3;
      for (let i = 0; i < 3; i++) { roundRect(pad + i * (cw + 6), iy, cw, 26, 6); ctx.fill(); }
    }
    if (stage >= 5) { // CTA button
      ctx.fillStyle = C.gold;
      roundRect(w / 2 - 30, h - 26, 60, 14, 7); ctx.fill();
    }
    if (stage >= 6) { // it ships! glow halo
      ctx.shadowColor = C.gold; ctx.shadowBlur = 30;
      ctx.strokeStyle = C.gold;
      roundRect(0, 0, w, h, 12); ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  function frame(t) {
    if (!running) return;
    const dt = Math.min((t - lastT) / 1000, 0.1);
    lastT = t;
    timeLeft -= dt;
    if (timeLeft <= 0) { end(); return; }

    const { w, h } = api;
    ctx.clearRect(0, 0, w, h);

    // warm deep backdrop
    const bg = ctx.createRadialGradient(w / 2, h * 0.15, 0, w / 2, h * 0.15, h);
    bg.addColorStop(0, 'rgba(50,78,161,0.35)');
    bg.addColorStop(1, 'rgba(26,22,51,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // flash feedback
    if (flash && performance.now() < flash.until) {
      ctx.fillStyle = flash.color + '22';
      ctx.fillRect(0, 0, w, h);
    }

    // timer bar
    const tw = Math.max(0, (timeLeft / START_TIME)) * (w - 48);
    ctx.fillStyle = 'rgba(160,195,235,0.15)';
    roundRect(24, 18, w - 48, 6, 3); ctx.fill();
    ctx.fillStyle = timeLeft < 10 ? C.apricot : C.gold;
    roundRect(24, 18, Math.min(tw, w - 48), 6, 3); ctx.fill();

    // combo
    ctx.font = "600 13px 'JetBrains Mono', monospace";
    ctx.fillStyle = C.cloud;
    ctx.textAlign = 'left';
    ctx.fillText(`COMBO ×${Math.min(combo, 8)}`, 24, 48);
    ctx.fillStyle = C.blush;
    ctx.fillText(`${Math.ceil(timeLeft)}s`, 24, 68);

    // the code line to complete
    const compact = w < 640;
    ctx.textAlign = 'center';
    ctx.font = `600 ${compact ? 15 : 22}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = C.cream;
    ctx.shadowColor = C.indigo; ctx.shadowBlur = 18;
    ctx.fillText(puzzle.line.replace('___', '▁▁▁'), w / 2, compact ? h * 0.3 : h * 0.42, w - 40);
    ctx.shadowBlur = 0;
    ctx.font = "500 12px 'JetBrains Mono', monospace";
    ctx.fillStyle = C.cloud;
    ctx.fillText('COMPLETE THE LINE', w / 2, (compact ? h * 0.3 : h * 0.42) - (compact ? 30 : 44));

    // the website being built (right side / below on mobile)
    const sw = compact ? Math.min(w * 0.6, 220) : Math.min(w * 0.24, 260);
    const sh = sw * 0.72;
    drawSite(compact ? (w - sw) / 2 : w - sw - 36, compact ? h * 0.42 : h * 0.5 - sh / 2, sw, sh);

    api.setScore(score);
  }

  function start() {
    score = 0; combo = 0; timeLeft = START_TIME; built = 0; flash = null;
    order = PUZZLES.map((_, i) => i).sort(() => Math.random() - 0.5);
    pIdx = -1;
    running = true;
    lastT = performance.now();

    choicesEl = document.createElement('div');
    choicesEl.className = 'coderush-choices';
    ui.appendChild(choicesEl);
    choicesEl.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b) answer(parseInt(b.dataset.i, 10), b);
    });
    document.addEventListener('keydown', onKey);

    nextPuzzle();
    api.onFrame(frame);
  }

  function end() {
    stop();
    api.gameOver(score);
  }

  function stop() {
    running = false;
    document.removeEventListener('keydown', onKey);
    choicesEl?.remove();
    choicesEl = null;
  }

  return { start, stop };
}
