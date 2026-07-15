/* ═══ DATA HARVEST — Scraping ═══
   Steer a little crawler across the grid. Collect gold datasets and
   blue leads, dodge junk and CAPTCHA traps. Speed ramps, combos
   reward taste. Arrows/WASD on desktop, swipe on mobile. 60s. */

const C = {
  gold: '#ffc243', apricot: '#eb6a29', raspberry: '#9b2d84',
  cloud: '#a0c3eb', indigo: '#324ea1', blush: '#f0bed9',
  ink: '#1a1633', cream: '#f3ece3',
};

const GAME_TIME = 60;
const ITEM_KINDS = [
  { kind: 'gold', glyph: '◆', color: C.gold, points: 150, weight: 3 },
  { kind: 'lead', glyph: '●', color: C.cloud, points: 75, weight: 5 },
  { kind: 'junk', glyph: '✕', color: '#6b6787', points: -60, weight: 3 },
  { kind: 'trap', glyph: '🔒', color: C.apricot, points: 0, weight: 2 }, // CAPTCHA — costs a life
];

export function createDataHarvest(api) {
  const { ctx, canvas, sound, isTouch } = api;
  let running = false;
  let cols, rows, cell, ox, oy;
  let bot, dir, nextDir, moveTimer, moveInterval;
  let items, score, combo, lives, timeLeft, lastT, trail, popups;

  function layout() {
    // grid adapts to stage: ~13 cols desktop, fewer on narrow phones
    cell = Math.max(34, Math.min(52, Math.floor(api.w / 13)));
    cols = Math.floor((api.w - 24) / cell);
    rows = Math.floor((api.h - 90) / cell);
    ox = (api.w - cols * cell) / 2;
    oy = 70 + (api.h - 70 - rows * cell) / 2;
  }

  const cellCenter = (c, r) => ({ x: ox + c * cell + cell / 2, y: oy + r * cell + cell / 2 });

  function spawnItem() {
    // weighted random kind, on a free cell away from the bot
    const total = ITEM_KINDS.reduce((s, k) => s + k.weight, 0);
    let roll = Math.random() * total;
    const kind = ITEM_KINDS.find((k) => (roll -= k.weight) <= 0) || ITEM_KINDS[1];
    for (let tries = 0; tries < 40; tries++) {
      const c = Math.floor(Math.random() * cols);
      const r = Math.floor(Math.random() * rows);
      const clash = items.some((it) => it.c === c && it.r === r) ||
        (Math.abs(c - bot.c) < 2 && Math.abs(r - bot.r) < 2);
      if (!clash) { items.push({ ...kind, c, r, born: performance.now() }); return; }
    }
  }

  const DIRS = {
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
    W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0],
  };

  const onKey = (e) => {
    const d = DIRS[e.key];
    if (d) { e.preventDefault(); nextDir = d; }
  };

  /* Swipe steering */
  let touchStart = null;
  const onTouchDown = (e) => { touchStart = { x: e.clientX, y: e.clientY }; };
  const onTouchUp = (e) => {
    if (!touchStart) return;
    const dx = e.clientX - touchStart.x;
    const dy = e.clientY - touchStart.y;
    if (Math.hypot(dx, dy) > 18) {
      nextDir = Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
    }
    touchStart = null;
  };

  function step() {
    // no reversing straight into yourself feels better; allow everything else
    if (nextDir && !(nextDir[0] === -dir[0] && nextDir[1] === -dir[1] && (dir[0] || dir[1]))) dir = nextDir;
    nextDir = null;
    bot.c = (bot.c + dir[0] + cols) % cols;
    bot.r = (bot.r + dir[1] + rows) % rows;
    trail.push({ c: bot.c, r: bot.r, at: performance.now() });
    if (trail.length > 10) trail.shift();

    const hit = items.findIndex((it) => it.c === bot.c && it.r === bot.r);
    if (hit >= 0) {
      const it = items.splice(hit, 1)[0];
      const pos = cellCenter(it.c, it.r);
      if (it.kind === 'trap') {
        lives -= 1;
        combo = 0;
        popups.push({ ...pos, text: 'CAPTCHA!', color: C.apricot, life: 1 });
        sound.fail();
        if (lives <= 0) { end(); return; }
      } else if (it.kind === 'junk') {
        score = Math.max(0, score + it.points);
        combo = 0;
        popups.push({ ...pos, text: `${it.points}`, color: '#6b6787', life: 1 });
        sound.beep(190, 0.12, 'sawtooth');
      } else {
        combo = it.kind === 'gold' ? combo + 1 : combo;
        const mult = 1 + Math.min(combo, 6) * 0.5;
        const gained = Math.round(it.points * mult);
        score += gained;
        popups.push({ ...pos, text: `+${gained}`, color: it.color, life: 1 });
        sound.beep(it.kind === 'gold' ? 740 + combo * 60 : 520, 0.07);
      }
      api.setScore(score);
      spawnItem();
    }
  }

  function frame(t) {
    if (!running) return;
    const dt = Math.min((t - lastT) / 1000, 0.1);
    lastT = t;
    timeLeft -= dt;
    if (timeLeft <= 0) { end(); return; }

    // speed ramps gently over the minute
    moveInterval = Math.max(0.11, 0.24 - (GAME_TIME - timeLeft) * 0.0018);
    moveTimer += dt;
    while (moveTimer >= moveInterval) { moveTimer -= moveInterval; step(); if (!running) return; }

    const { w, h } = api;
    ctx.clearRect(0, 0, w, h);

    // dusk backdrop
    const bg = ctx.createRadialGradient(w / 2, h, 0, w / 2, h, h * 1.2);
    bg.addColorStop(0, 'rgba(155,45,132,0.28)');
    bg.addColorStop(1, 'rgba(26,22,51,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // grid — the "web" being crawled
    ctx.strokeStyle = 'rgba(160,195,235,0.10)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath(); ctx.moveTo(ox + c * cell, oy); ctx.lineTo(ox + c * cell, oy + rows * cell); ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath(); ctx.moveTo(ox, oy + r * cell); ctx.lineTo(ox + cols * cell, oy + r * cell); ctx.stroke();
    }

    // HUD
    ctx.font = "600 13px 'JetBrains Mono', monospace";
    ctx.textAlign = 'left';
    ctx.fillStyle = C.cloud;
    ctx.fillText(`⏱ ${Math.ceil(timeLeft)}s`, 24, 34);
    ctx.fillStyle = C.blush;
    ctx.fillText(`COMBO ×${(1 + Math.min(combo, 6) * 0.5).toFixed(1)}`, 24, 56);
    ctx.textAlign = 'right';
    ctx.fillStyle = C.apricot;
    ctx.fillText('♥'.repeat(Math.max(0, lives)) + '·'.repeat(Math.max(0, 3 - lives)), w - 24, 34);

    // items (traps pulse so they read as danger)
    for (const it of items) {
      const p = cellCenter(it.c, it.r);
      const pulse = it.kind === 'trap' ? 1 + Math.sin(t / 200) * 0.15 : 1;
      ctx.font = `${Math.floor(cell * 0.44 * pulse)}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (it.kind !== 'trap') {
        ctx.shadowColor = it.color;
        ctx.shadowBlur = it.kind === 'gold' ? 18 : 8;
        ctx.fillStyle = it.color;
        ctx.fillText(it.glyph, p.x, p.y);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillText(it.glyph, p.x, p.y);
      }
    }

    // crawler trail — silk thread
    ctx.strokeStyle = 'rgba(240,190,217,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    trail.forEach((seg, i) => {
      const p = cellCenter(seg.c, seg.r);
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // the crawler bot 🕷 — a glowing spider dot with legs
    const bp = cellCenter(bot.c, bot.r);
    ctx.save();
    ctx.translate(bp.x, bp.y);
    ctx.rotate(Math.atan2(dir[1], dir[0]));
    ctx.strokeStyle = C.blush;
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI - Math.PI / 2 + 0.4;
      const wig = Math.sin(t / 90 + i) * 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * (cell * 0.36) + wig, Math.sin(a) * (cell * 0.36));
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a + Math.PI) * (cell * 0.36) - wig, Math.sin(a + Math.PI) * (cell * 0.36));
      ctx.stroke();
    }
    ctx.fillStyle = C.gold;
    ctx.shadowColor = C.gold;
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.arc(0, 0, cell * 0.2, 0, 7);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = C.ink;
    ctx.beginPath(); ctx.arc(cell * 0.07, -cell * 0.05, 2, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(cell * 0.07, cell * 0.05, 2, 0, 7); ctx.fill();
    ctx.restore();

    // score popups
    popups = popups.filter((p) => p.life > 0);
    for (const p of popups) {
      p.life -= dt * 1.4;
      p.y -= dt * 40;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.font = "700 14px 'JetBrains Mono', monospace";
      ctx.textAlign = 'center';
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
      ctx.globalAlpha = 1;
    }
    ctx.textBaseline = 'alphabetic';
  }

  function start() {
    layout();
    bot = { c: Math.floor(cols / 2), r: Math.floor(rows / 2) };
    dir = [1, 0]; nextDir = null;
    moveTimer = 0; moveInterval = 0.24;
    items = []; trail = []; popups = [];
    score = 0; combo = 0; lives = 3; timeLeft = GAME_TIME;
    api.setScore(0);
    for (let i = 0; i < 7; i++) spawnItem();
    running = true;
    lastT = performance.now();
    document.addEventListener('keydown', onKey);
    canvas.addEventListener('pointerdown', onTouchDown);
    canvas.addEventListener('pointerup', onTouchUp);
    if (isTouch) {
      const hint = document.createElement('p');
      hint.className = 'dh-hint mono';
      hint.textContent = 'SWIPE TO STEER';
      api.ui.appendChild(hint);
      setTimeout(() => hint.remove(), 3500);
    }
    api.onFrame(frame);
  }

  function end() {
    stop();
    api.gameOver(score);
  }

  function stop() {
    running = false;
    document.removeEventListener('keydown', onKey);
    canvas.removeEventListener('pointerdown', onTouchDown);
    canvas.removeEventListener('pointerup', onTouchUp);
  }

  return { start, stop, onResize: layout };
}
