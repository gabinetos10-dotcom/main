/* ═══ FLOW FORGE — Automations ═══
   Drag wires from trigger outputs (●) to matching action inputs (○).
   Correct wires glow and carry data pulses; wrong ones spark. Three
   levels of rising complexity, then the whole pipeline "runs".
   Built for touch first — dragging is the whole game. */

const C = {
  gold: '#ffc243', apricot: '#eb6a29', raspberry: '#9b2d84',
  cloud: '#a0c3eb', indigo: '#324ea1', blush: '#f0bed9',
  ink: '#1a1633', cream: '#f3ece3',
};

/* Node positions are fractions of the stage so levels scale anywhere.
   Edges name the required connections (left node → right node). */
const LEVELS = [
  {
    name: 'Hello, automation',
    nodes: [
      { id: 'form', label: 'New lead', icon: '📥', x: 0.22, y: 0.3, side: 'out' },
      { id: 'mail', label: 'Send email', icon: '✉️', x: 0.75, y: 0.3, side: 'in' },
      { id: 'clock', label: 'Every 9am', icon: '⏰', x: 0.22, y: 0.66, side: 'out' },
      { id: 'report', label: 'Build report', icon: '📊', x: 0.75, y: 0.66, side: 'in' },
    ],
    edges: [['form', 'mail'], ['clock', 'report']],
  },
  {
    name: 'Branching out',
    nodes: [
      { id: 'order', label: 'New order', icon: '🛒', x: 0.18, y: 0.48, side: 'out' },
      { id: 'invoice', label: 'Invoice', icon: '🧾', x: 0.62, y: 0.22, side: 'in' },
      { id: 'slack', label: 'Ping team', icon: '💬', x: 0.72, y: 0.5, side: 'in' },
      { id: 'stock', label: 'Update stock', icon: '📦', x: 0.6, y: 0.78, side: 'in' },
    ],
    edges: [['order', 'invoice'], ['order', 'slack'], ['order', 'stock']],
  },
  {
    name: 'The full machine',
    nodes: [
      { id: 'scrape', label: 'Price change', icon: '🔭', x: 0.15, y: 0.26, side: 'out' },
      { id: 'signup', label: 'New signup', icon: '✨', x: 0.15, y: 0.72, side: 'out' },
      { id: 'compare', label: 'Compare', icon: '⚖️', x: 0.48, y: 0.26, side: 'both' },
      { id: 'crm', label: 'Add to CRM', icon: '🗂️', x: 0.48, y: 0.72, side: 'in' },
      { id: 'alert', label: 'Price alert', icon: '🚨', x: 0.82, y: 0.26, side: 'in' },
      { id: 'welcome', label: 'Welcome kit', icon: '🎁', x: 0.82, y: 0.72, side: 'in' },
    ],
    edges: [['scrape', 'compare'], ['compare', 'alert'], ['signup', 'crm'], ['crm', 'welcome']],
  },
];

const NODE_W = 128, NODE_H = 54;

export function createFlowForge(api) {
  const { ctx, canvas, sound } = api;
  let running = false;
  let level, nodes, edgesLeft, placed, score, startAt, sparks, pulses, drag, levelIdx, transitionUntil;

  const nodeAt = (id) => nodes.find((n) => n.id === id);
  const px = (n) => ({ x: n.x * api.w, y: n.y * api.h });

  /* CRM appears as an "in" target and an "out" source (side:'both') */
  const canStart = (n) => n.side === 'out' || n.side === 'both';
  const canEnd = (n) => n.side === 'in' || n.side === 'both';

  function loadLevel(i) {
    levelIdx = i;
    level = LEVELS[i];
    nodes = level.nodes.map((n) => ({ ...n }));
    edgesLeft = level.edges.map((e) => [...e]);
    placed = [];
    pulses = [];
    transitionUntil = 0;
  }

  function pointerPos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function pickNode(p, filter) {
    let best = null, bestD = 72; // generous touch radius
    for (const n of nodes) {
      if (!filter(n)) continue;
      const c = px(n);
      const d = Math.hypot(p.x - c.x, p.y - c.y);
      if (d < bestD) { best = n; bestD = d; }
    }
    return best;
  }

  const onDown = (e) => {
    if (!running) return;
    const p = pointerPos(e);
    const n = pickNode(p, canStart);
    if (n) { drag = { from: n, to: p }; canvas.setPointerCapture?.(e.pointerId); }
  };
  const onMove = (e) => { if (drag) drag.to = pointerPos(e); };
  const onUp = (e) => {
    if (!drag) return;
    const p = pointerPos(e);
    const target = pickNode(p, canEnd);
    if (target && target !== drag.from) tryConnect(drag.from, target, p);
    else if (target !== drag.from) spark(p);
    drag = null;
  };

  function tryConnect(a, b, p) {
    const idx = edgesLeft.findIndex(([f, t]) => (f === a.id && t === b.id) || (f === b.id && t === a.id));
    if (idx >= 0) {
      const [f, t] = edgesLeft.splice(idx, 1)[0];
      placed.push([f, t]);
      score += 250;
      api.setScore(score);
      sound.beep(600 + placed.length * 60, 0.09);
      if (edgesLeft.length === 0) completeLevel();
    } else {
      score = Math.max(0, score - 60);
      api.setScore(score);
      spark(p);
      sound.beep(150, 0.18, 'sawtooth');
    }
  }

  function spark(p) {
    for (let i = 0; i < 12; i++) {
      sparks.push({
        x: p.x, y: p.y,
        vx: (Math.random() - 0.5) * 260,
        vy: (Math.random() - 0.5) * 260,
        life: 0.5,
      });
    }
  }

  function completeLevel() {
    // time bonus + run animation, then next level or victory
    const elapsed = (performance.now() - startAt) / 1000;
    score += Math.max(0, Math.round(400 - elapsed * 4));
    api.setScore(score);
    sound.win();
    transitionUntil = performance.now() + 2200;
    // flood the finished pipeline with pulses
    placed.forEach(([f, t], i) => {
      for (let k = 0; k < 4; k++) pulses.push({ f, t, p: -k * 0.25 - i * 0.1, speed: 0.6 });
    });
  }

  function wirePath(a, b) {
    const A = px(a), B = px(b);
    const mx = (A.x + B.x) / 2;
    return { A, B, c1: { x: mx, y: A.y }, c2: { x: mx, y: B.y } };
  }

  function bezier(t, P) {
    const u = 1 - t;
    return {
      x: u ** 3 * P.A.x + 3 * u ** 2 * t * P.c1.x + 3 * u * t ** 2 * P.c2.x + t ** 3 * P.B.x,
      y: u ** 3 * P.A.y + 3 * u ** 2 * t * P.c1.y + 3 * u * t ** 2 * P.c2.y + t ** 3 * P.B.y,
    };
  }

  function drawWire(a, b, color, glow = 8) {
    const P = wirePath(a, b);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = glow;
    ctx.beginPath();
    ctx.moveTo(P.A.x, P.A.y);
    ctx.bezierCurveTo(P.c1.x, P.c1.y, P.c2.x, P.c2.y, P.B.x, P.B.y);
    ctx.stroke();
    ctx.shadowBlur = 0;
    return P;
  }

  function drawNode(n, t) {
    const { x, y } = px(n);
    const hover = drag && drag.from === n;
    ctx.save();
    ctx.translate(x, y);
    const wob = Math.sin(t / 900 + n.x * 9) * 3;
    ctx.translate(0, wob);
    // card
    ctx.fillStyle = 'rgba(36,30,69,0.92)';
    ctx.strokeStyle = hover ? C.gold : 'rgba(160,195,235,0.35)';
    ctx.lineWidth = hover ? 2.5 : 1.5;
    ctx.shadowColor = hover ? C.gold : C.indigo;
    ctx.shadowBlur = hover ? 26 : 14;
    ctx.beginPath();
    ctx.roundRect(-NODE_W / 2, -NODE_H / 2, NODE_W, NODE_H, 14);
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    // label
    ctx.textAlign = 'center';
    ctx.font = '18px system-ui';
    ctx.fillText(n.icon, -NODE_W / 2 + 24, 7);
    ctx.font = "600 12px 'JetBrains Mono', monospace";
    ctx.fillStyle = C.cream;
    ctx.fillText(n.label, 12, 5, NODE_W - 50);
    // ports
    if (canStart(n)) {
      ctx.fillStyle = C.gold;
      ctx.shadowColor = C.gold; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(NODE_W / 2, 0, 7, 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
    }
    if (canEnd(n)) {
      ctx.strokeStyle = C.blush;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(-NODE_W / 2, 0, 7, 0, 7); ctx.stroke();
    }
    ctx.restore();
    return wob;
  }

  function frame(t) {
    if (!running) return;
    const { w, h } = api;
    ctx.clearRect(0, 0, w, h);

    // dotted engineering grid
    ctx.fillStyle = 'rgba(160,195,235,0.10)';
    for (let gx = 20; gx < w; gx += 34)
      for (let gy = 20; gy < h; gy += 34) ctx.fillRect(gx, gy, 1.5, 1.5);

    // HUD
    ctx.font = "600 13px 'JetBrains Mono', monospace";
    ctx.textAlign = 'left';
    ctx.fillStyle = C.cloud;
    ctx.fillText(`LEVEL ${levelIdx + 1}/${LEVELS.length} — ${level.name.toUpperCase()}`, 24, 34);
    ctx.fillStyle = C.blush;
    ctx.fillText(`WIRES LEFT ${edgesLeft.length}`, 24, 56);

    // placed wires + live pulses
    for (const [f, tt] of placed) drawWire(nodeAt(f), nodeAt(tt), C.gold, 12);
    pulses = pulses.filter((pl) => pl.p < 1.15);
    for (const pl of pulses) {
      pl.p += pl.speed / 60;
      if (pl.p < 0 || pl.p > 1) continue;
      const P = wirePath(nodeAt(pl.f), nodeAt(pl.t));
      const pos = bezier(pl.p, P);
      ctx.fillStyle = C.cream;
      ctx.shadowColor = C.gold; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(pos.x, pos.y, 5, 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
    }

    // drag wire preview
    if (drag) {
      const A = px(drag.from);
      ctx.strokeStyle = C.blush;
      ctx.setLineDash([6, 8]);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(drag.to.x, drag.to.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    for (const n of nodes) drawNode(n, t);

    // sparks (wrong wire feedback)
    sparks = sparks.filter((s) => s.life > 0);
    for (const s of sparks) {
      s.life -= 1 / 60;
      s.x += s.vx / 60; s.y += s.vy / 60;
      ctx.fillStyle = `rgba(235,106,41,${s.life * 2})`;
      ctx.fillRect(s.x, s.y, 3, 3);
    }

    // level transition
    if (transitionUntil && performance.now() > transitionUntil) {
      if (levelIdx + 1 < LEVELS.length) {
        loadLevel(levelIdx + 1);
        startAt = performance.now();
      } else {
        end();
        return;
      }
    }
    if (transitionUntil && performance.now() <= transitionUntil) {
      ctx.textAlign = 'center';
      ctx.font = "700 26px 'Space Grotesk', sans-serif";
      ctx.fillStyle = C.gold;
      ctx.shadowColor = C.gold; ctx.shadowBlur = 24;
      ctx.fillText(levelIdx + 1 < LEVELS.length ? 'PIPELINE RUNNING ✦' : 'ALL SYSTEMS FLOWING ✦', w / 2, h / 2);
      ctx.shadowBlur = 0;
    }
  }

  function start() {
    score = 0; sparks = []; drag = null;
    api.setScore(0);
    loadLevel(0);
    startAt = performance.now();
    running = true;
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    api.onFrame(frame);
  }

  function end() {
    stop();
    api.gameOver(score);
  }

  function stop() {
    running = false;
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointercancel', onUp);
  }

  return { start, stop };
}
