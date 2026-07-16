/* ============================================================
   Exhibit C — FIELD COLLECTOR (→ Scraping)

   Steer the little crawler across the printed field. Harvest
   clean data specimens (chained harvests build a combo), dodge
   the junk smudges and the CAPTCHA stamps. Three lives; the
   field gets busier the longer you last.
   ============================================================ */

import { fitCanvas, paintField } from './canvas.js';
import { overprint } from '../core/inks.js';
import { blip } from '../core/audio.js';

const SPECIMEN_GLYPHS = ['€', '%', '◆', '¶', '№', '@'];

export function createGame(ctx) {
  const { canvas, stage } = ctx;
  const cv = fitCanvas(canvas, stage);
  const g = cv.ctx;

  let running = false;
  let raf, last = 0, elapsed = 0;
  let score, lives, combo, comboClock, invuln;
  let player, specimens, smudges, captchas;
  let spawnClock, smudgeClock, captchaClock;

  /* ---- input: keys + virtual joystick ---- */
  const keys = new Set();
  const stick = { active: false, ox: 0, oy: 0, dx: 0, dy: 0 };
  const stickEl = document.createElement('div');
  stickEl.className = 'g-stick';
  stickEl.innerHTML = '<i></i>';
  stage.appendChild(stickEl);

  const onKeyDown = (e) => {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) {
      e.preventDefault();
      keys.add(k);
    }
  };
  const onKeyUp = (e) => keys.delete(e.key.toLowerCase());

  const onDown = (e) => {
    if (e.pointerType === 'mouse') return;
    stick.active = true;
    stick.ox = e.clientX; stick.oy = e.clientY;
    stick.dx = stick.dy = 0;
    const r = stage.getBoundingClientRect();
    stickEl.style.left = `${e.clientX - r.left - 54}px`;
    stickEl.style.top = `${e.clientY - r.top - 54}px`;
    stickEl.classList.add('is-active');
  };
  const onMove = (e) => {
    if (!stick.active) return;
    const mag = 46;
    stick.dx = Math.max(-1, Math.min(1, (e.clientX - stick.ox) / mag));
    stick.dy = Math.max(-1, Math.min(1, (e.clientY - stick.oy) / mag));
    stickEl.querySelector('i').style.transform =
      `translate(${stick.dx * 26}px, ${stick.dy * 26}px)`;
  };
  const onUp = () => {
    stick.active = false;
    stick.dx = stick.dy = 0;
    stickEl.classList.remove('is-active');
    stickEl.querySelector('i').style.transform = '';
  };

  function inputDir() {
    let dx = stick.dx, dy = stick.dy;
    if (keys.has('arrowleft') || keys.has('a')) dx -= 1;
    if (keys.has('arrowright') || keys.has('d')) dx += 1;
    if (keys.has('arrowup') || keys.has('w')) dy -= 1;
    if (keys.has('arrowdown') || keys.has('s')) dy += 1;
    const m = Math.hypot(dx, dy);
    return m > 1 ? [dx / m, dy / m] : [dx, dy];
  }

  /* ---- spawning ---- */
  const rnd = (a, b) => a + Math.random() * (b - a);

  function spawnSpecimen() {
    const { w, h } = cv.state;
    specimens.push({
      x: rnd(30, w - 30), y: rnd(60, h - 60),
      glyph: SPECIMEN_GLYPHS[Math.floor(Math.random() * SPECIMEN_GLYPHS.length)],
      value: 10 + Math.floor(Math.random() * 3) * 10,
      age: 0, ttl: rnd(6, 10),
    });
  }
  function spawnSmudge() {
    const { w, h } = cv.state;
    const edge = Math.floor(Math.random() * 4);
    const speed = rnd(30, 55 + elapsed * 1.6);
    const s = { r: rnd(14, 26), vx: 0, vy: 0, x: 0, y: 0, wob: Math.random() * 9 };
    if (edge === 0) { s.x = -30; s.y = rnd(0, h); s.vx = speed; s.vy = rnd(-20, 20); }
    if (edge === 1) { s.x = w + 30; s.y = rnd(0, h); s.vx = -speed; s.vy = rnd(-20, 20); }
    if (edge === 2) { s.x = rnd(0, w); s.y = -30; s.vy = speed; s.vx = rnd(-20, 20); }
    if (edge === 3) { s.x = rnd(0, w); s.y = h + 30; s.vy = -speed; s.vx = rnd(-20, 20); }
    smudges.push(s);
  }
  function spawnCaptcha() {
    const { w, h } = cv.state;
    captchas.push({ x: rnd(50, w - 50), y: rnd(70, h - 70), size: 46, age: 0, ttl: 6 });
  }

  function hit() {
    if (invuln > 0) return;
    lives -= 1;
    combo = 1;
    invuln = 1.6;
    blip('bad');
    if (lives <= 0) {
      running = false;
      onUp();
      ctx.gameOver(score);
    }
  }

  function draw(dt, inks, third) {
    const { w, h } = cv.state;
    g.clearRect(0, 0, w, h);
    paintField(g, w, h, inks.a, 0.1);

    // CAPTCHA stamps — angular traps with a checkbox that lies
    captchas.forEach((c) => {
      const blink = c.ttl - c.age < 1.5 && Math.sin(c.age * 18) > 0;
      g.save();
      g.translate(c.x, c.y);
      g.rotate(0.06);
      g.globalAlpha = blink ? 0.35 : 0.9;
      g.strokeStyle = inks.ink;
      g.lineWidth = 2;
      g.strokeRect(-c.size / 2, -c.size / 3, c.size, c.size * 0.66);
      g.strokeRect(-c.size / 2 + 7, -6, 12, 12);
      g.font = '700 9px "Spline Sans Mono", monospace';
      g.fillStyle = inks.ink;
      g.fillText('I AM A ROBOT', -c.size / 2 + 24, 4);
      g.restore();
      g.globalAlpha = 1;
    });

    // specimens — the harvest
    specimens.forEach((s) => {
      const fade = Math.min(1, (s.ttl - s.age) / 1.2);
      g.globalAlpha = 0.9 * fade;
      g.fillStyle = s.value >= 30 ? third : inks.b;
      g.font = `700 ${s.value >= 30 ? 26 : 20}px "Spline Sans Mono", monospace`;
      g.textAlign = 'center';
      g.fillText(s.glyph, s.x, s.y + 7);
      g.globalAlpha = 1;
    });

    // smudges — wet junk ink
    smudges.forEach((s) => {
      g.fillStyle = inks.ink;
      g.globalAlpha = 0.8;
      g.beginPath();
      for (let a = 0; a <= Math.PI * 2 + 0.1; a += Math.PI / 8) {
        const rr = s.r * (1 + 0.25 * Math.sin(a * 3 + s.wob + elapsed * 2));
        const px = s.x + Math.cos(a) * rr;
        const py = s.y + Math.sin(a) * rr;
        a === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
      }
      g.fill();
      g.globalAlpha = 1;
    });

    // the crawler — a six-legged collector in the accent ink
    const blinkOut = invuln > 0 && Math.sin(elapsed * 24) > 0;
    if (!blinkOut) {
      g.save();
      g.translate(player.x, player.y);
      const ang = Math.atan2(player.vy, player.vx);
      if (Math.hypot(player.vx, player.vy) > 8) g.rotate(ang);
      g.strokeStyle = inks.accent;
      g.lineWidth = 2;
      for (let l = 0; l < 3; l++) {
        const sway = Math.sin(elapsed * 10 + l) * 3;
        g.beginPath(); g.moveTo(-4 + l * 4, 0); g.lineTo(-8 + l * 5, -12 - sway); g.stroke();
        g.beginPath(); g.moveTo(-4 + l * 4, 0); g.lineTo(-8 + l * 5, 12 + sway); g.stroke();
      }
      g.fillStyle = inks.accent;
      g.beginPath(); g.ellipse(0, 0, 11, 8, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = inks.paper;
      g.beginPath(); g.arc(5, -2, 2, 0, Math.PI * 2); g.fill();
      g.restore();
    }

    // HUD: lives + combo
    for (let i = 0; i < 3; i++) {
      g.fillStyle = i < lives ? inks.b : 'rgba(0,0,0,0.12)';
      g.beginPath(); g.arc(22 + i * 20, 22, 7, 0, Math.PI * 2); g.fill();
    }
    if (combo > 1) {
      g.font = '700 13px "Spline Sans Mono", monospace';
      g.fillStyle = third;
      g.textAlign = 'left';
      g.fillText(`combo ×${combo}`, 14, 48);
    }
  }

  function loop(ts) {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;
    elapsed += dt;
    const { w, h } = cv.state;
    const inks = ctx.inks();
    const third = overprint(inks.a, inks.b);

    // player physics
    const [ix, iy] = inputDir();
    const accel = 900, drag = 5;
    player.vx += ix * accel * dt - player.vx * drag * dt;
    player.vy += iy * accel * dt - player.vy * drag * dt;
    player.x = Math.max(12, Math.min(w - 12, player.x + player.vx * dt));
    player.y = Math.max(12, Math.min(h - 12, player.y + player.vy * dt));

    // spawners ramp with time
    spawnClock -= dt;
    if (spawnClock <= 0 && specimens.length < 8) { spawnSpecimen(); spawnClock = rnd(0.7, 1.4); }
    smudgeClock -= dt;
    if (smudgeClock <= 0) { spawnSmudge(); smudgeClock = Math.max(0.7, 2.6 - elapsed * 0.04); }
    captchaClock -= dt;
    if (captchaClock <= 0) { spawnCaptcha(); captchaClock = rnd(5, 9); }

    // entity updates & collisions
    specimens = specimens.filter((s) => {
      s.age += dt;
      if (s.age > s.ttl) return false;
      if (Math.hypot(s.x - player.x, s.y - player.y) < 22) {
        comboClock = 2.5;
        score += s.value * combo;
        combo = Math.min(combo + 1, 5);
        ctx.setScore(score);
        blip('good');
        return false;
      }
      return true;
    });
    smudges = smudges.filter((s) => {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (Math.hypot(s.x - player.x, s.y - player.y) < s.r + 8) hit();
      return s.x > -60 && s.x < w + 60 && s.y > -60 && s.y < h + 60;
    });
    captchas = captchas.filter((c) => {
      c.age += dt;
      if (Math.abs(c.x - player.x) < c.size / 2 + 8 && Math.abs(c.y - player.y) < c.size / 3 + 8) hit();
      return c.age < c.ttl;
    });

    comboClock -= dt;
    if (comboClock <= 0) combo = 1;
    invuln = Math.max(0, invuln - dt);

    if (running) draw(dt, inks, third);
  }

  return {
    start() {
      const { w, h } = cv.state;
      score = 0; lives = 3; combo = 1; comboClock = 0; invuln = 0; elapsed = 0;
      player = { x: w / 2, y: h / 2, vx: 0, vy: 0 };
      specimens = []; smudges = []; captchas = [];
      spawnClock = 0.4; smudgeClock = 2; captchaClock = 6;
      running = true;
      last = performance.now();
      addEventListener('keydown', onKeyDown);
      addEventListener('keyup', onKeyUp);
      stage.addEventListener('pointerdown', onDown);
      stage.addEventListener('pointermove', onMove);
      stage.addEventListener('pointerup', onUp);
      stage.addEventListener('pointercancel', onUp);
      raf = requestAnimationFrame(loop);
    },
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      removeEventListener('keydown', onKeyDown);
      removeEventListener('keyup', onKeyUp);
      stage.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerup', onUp);
      stage.removeEventListener('pointercancel', onUp);
      stickEl.remove();
      cv.destroy();
    },
  };
}
