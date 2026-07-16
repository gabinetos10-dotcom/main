/* ============================================================
   Exhibit B — INK ROUTING (→ Automations)

   The press's plumbing, scrambled. Tap pipes to rotate them and
   route ink from the trigger valve (left) to the action nozzle
   (right) before the reservoir runs dry. Solved routes pump a
   glowing pulse through — the workflow "runs" — then the next,
   bigger board drops in.
   ============================================================ */

import { fitCanvas } from './canvas.js';
import { overprint } from '../core/inks.js';
import { blip } from '../core/audio.js';

// connection bits
const N = 1, E = 2, S = 4, W = 8;
const ROT = { [N]: E, [E]: S, [S]: W, [W]: N };
const rotateMask = (m) => (N & m ? E : 0) | (E & m ? S : 0) | (S & m ? W : 0) | (W & m ? N : 0);
const SHAPES = [N | S, E | W, N | E, E | S, S | W, W | N, N | E | S, E | S | W, S | W | N, W | N | E];

export function createGame(ctx) {
  const { canvas, stage } = ctx;
  const cv = fitCanvas(canvas, stage);
  const g = cv.ctx;

  const hint = document.createElement('p');
  hint.className = 'game-hint';
  hint.textContent = 'tap a pipe to rotate it';
  stage.appendChild(hint);

  let running = false;
  let raf, last = 0;
  let score, level;
  let cols, rowsN, grid, srcRow, dstRow;
  let reservoir, reservoirMax;
  let solvedPath = null; // cells of the winning route
  let flowT = 0;         // pulse animation progress
  let settling = 0;      // pause between levels

  function buildLevel() {
    cols = Math.min(4 + level, 7);
    rowsN = Math.min(4 + Math.floor(level / 2), 6);
    srcRow = Math.floor(Math.random() * rowsN);
    dstRow = Math.floor(Math.random() * rowsN);
    grid = Array.from({ length: rowsN }, () => Array(cols).fill(null));

    // carve a guaranteed route: random walk, always eventually east
    let x = 0, y = srcRow;
    const path = [[x, y]];
    const need = Array.from({ length: rowsN }, () => Array(cols).fill(0));
    need[y][x] |= W; // fed from the source valve
    while (x < cols - 1 || y !== dstRow) {
      let dir;
      if (x === cols - 1) dir = y < dstRow ? S : N;
      else {
        const r = Math.random();
        dir = r < 0.55 ? E : r < 0.78 ? (y > 0 ? N : S) : (y < rowsN - 1 ? S : N);
      }
      let nx = x, ny = y;
      if (dir === E) nx++;
      if (dir === N) ny--;
      if (dir === S) ny++;
      if (ny < 0 || ny >= rowsN) continue;
      // avoid tangling back over the path
      if (path.some(([px, py]) => px === nx && py === ny)) {
        if (x < cols - 1) { nx = x + 1; ny = y; dir = E; }
        else break;
        if (path.some(([px, py]) => px === nx && py === ny)) break;
      }
      const OPP = { [N]: S, [S]: N, [E]: W, [W]: E };
      need[y][x] |= dir;
      need[ny][nx] |= OPP[dir];
      x = nx; y = ny;
      path.push([x, y]);
    }
    // if the walk knotted itself early, carve straight east to the edge
    while (x < cols - 1) {
      need[y][x] |= E;
      x++;
      need[y][x] |= W;
      path.push([x, y]);
    }
    need[y][x] |= E; // out to the action nozzle
    dstRow = y;

    for (let r = 0; r < rowsN; r++) {
      for (let c = 0; c < cols; c++) {
        let mask = need[r][c];
        if (!mask) mask = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        else if (Math.random() < 0.35) mask |= SHAPES[Math.floor(Math.random() * 4)]; // extra stub
        // scramble the rotation
        const turns = Math.floor(Math.random() * 4);
        for (let t = 0; t < turns; t++) mask = rotateMask(mask);
        grid[r][c] = { mask, spin: 0 };
      }
    }

    reservoirMax = Math.max(22, 46 - level * 4);
    reservoir = reservoirMax;
    solvedPath = null;
    flowT = 0;
    // never hand the player an already-solved board
    if (findRoute()) {
      const cell = grid[srcRow][0];
      cell.mask = rotateMask(cell.mask);
      if (findRoute()) buildLevel();
    }
  }

  /** BFS from the source; returns the route to the sink or null. */
  function findRoute() {
    const OPP = { [N]: S, [S]: N, [E]: W, [W]: E };
    const DXY = { [N]: [0, -1], [S]: [0, 1], [E]: [1, 0], [W]: [-1, 0] };
    if (!(grid[srcRow][0].mask & W)) return null;
    const seen = new Set([`0,${srcRow}`]);
    const prev = new Map();
    const q = [[0, srcRow]];
    while (q.length) {
      const [cx, cy] = q.shift();
      if (cx === cols - 1 && cy === dstRow && grid[cy][cx].mask & E) {
        const route = [[cx, cy]];
        let k = `${cx},${cy}`;
        while (prev.has(k)) {
          k = prev.get(k);
          route.unshift(k.split(',').map(Number));
        }
        return route;
      }
      for (const d of [N, E, S, W]) {
        if (!(grid[cy][cx].mask & d)) continue;
        const [dx, dy] = DXY[d];
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rowsN) continue;
        if (!(grid[ny][nx].mask & OPP[d])) continue;
        const key = `${nx},${ny}`;
        if (seen.has(key)) continue;
        seen.add(key);
        prev.set(key, `${cx},${cy}`);
        q.push([nx, ny]);
      }
    }
    return null;
  }

  function metrics() {
    const { w, h } = cv.state;
    const pad = 24;
    const cell = Math.min((w - pad * 2) / cols, (h - pad * 2 - 90) / rowsN, 92);
    const bx = (w - cell * cols) / 2;
    const by = (h - cell * rowsN) / 2;
    return { cell, bx, by };
  }

  function onTap(e) {
    if (!running || solvedPath) return;
    const rect = canvas.getBoundingClientRect();
    const { cell, bx, by } = metrics();
    const c = Math.floor((e.clientX - rect.left - bx) / cell);
    const r = Math.floor((e.clientY - rect.top - by) / cell);
    if (c < 0 || r < 0 || c >= cols || r >= rowsN) return;
    const tile = grid[r][c];
    tile.mask = rotateMask(tile.mask);
    tile.spin = 1;
    blip('tap');
    const route = findRoute();
    if (route) {
      solvedPath = route;
      flowT = 0;
      const bonus = Math.round(reservoir);
      score += level * 100 + bonus;
      ctx.setScore(score);
      blip('win');
      settling = 1.6;
    }
  }

  function drawTile(r, c, cell, bx, by, inks, third) {
    const t = grid[r][c];
    const cx = bx + c * cell + cell / 2;
    const cy = by + r * cell + cell / 2;
    const len = cell / 2 - 4;
    const onPath = solvedPath?.some(([px, py]) => px === c && py === r);

    g.save();
    g.translate(cx, cy);
    if (t.spin > 0) g.rotate(-t.spin * Math.PI / 2); // settle from the turn
    g.lineCap = 'round';
    g.lineWidth = Math.max(7, cell * 0.16);
    g.strokeStyle = onPath ? third : inks.a;
    g.globalAlpha = onPath ? 1 : 0.82;
    const dirs = [[N, 0, -len], [E, len, 0], [S, 0, len], [W, -len, 0]];
    dirs.forEach(([d, dx, dy]) => {
      if (!(t.mask & d)) return;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(dx, dy);
      g.stroke();
    });
    g.fillStyle = onPath ? third : inks.a;
    g.beginPath();
    g.arc(0, 0, g.lineWidth * 0.62, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  function draw(dt) {
    const { w, h } = cv.state;
    const inks = ctx.inks();
    const third = overprint(inks.a, inks.b);
    const { cell, bx, by } = metrics();
    g.clearRect(0, 0, w, h);

    // board frame
    g.strokeStyle = inks.ink;
    g.globalAlpha = 0.25;
    g.strokeRect(bx, by, cell * cols, cell * rowsN);
    g.globalAlpha = 0.12;
    for (let r = 1; r < rowsN; r++) { g.beginPath(); g.moveTo(bx, by + r * cell); g.lineTo(bx + cols * cell, by + r * cell); g.stroke(); }
    for (let c = 1; c < cols; c++) { g.beginPath(); g.moveTo(bx + c * cell, by); g.lineTo(bx + c * cell, by + rowsN * cell); g.stroke(); }
    g.globalAlpha = 1;

    for (let r = 0; r < rowsN; r++) for (let c = 0; c < cols; c++) {
      grid[r][c].spin = Math.max(0, grid[r][c].spin - dt * 5);
      drawTile(r, c, cell, bx, by, inks, third);
    }

    // trigger valve & action nozzle
    const sy = by + srcRow * cell + cell / 2;
    const dy = by + dstRow * cell + cell / 2;
    g.fillStyle = inks.b;
    g.beginPath(); g.arc(bx - 16, sy, 10, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(bx + cols * cell + 16, dy, 10, 0, Math.PI * 2); g.fill();
    g.font = '600 10px "Spline Sans Mono", monospace';
    g.fillStyle = inks.ink;
    g.globalAlpha = 0.65;
    g.textAlign = 'center';
    g.fillText('trigger', bx - 16, sy + 26);
    g.fillText('action', bx + cols * cell + 16, dy + 26);
    g.globalAlpha = 1;

    // solved: pump a pulse along the route
    if (solvedPath) {
      flowT = Math.min(1, flowT + dt * 1.4);
      const steps = Math.floor(flowT * solvedPath.length);
      g.fillStyle = inks.b;
      for (let i = 0; i < steps; i++) {
        const [pc, pr] = solvedPath[i];
        g.beginPath();
        g.arc(bx + pc * cell + cell / 2, by + pr * cell + cell / 2, cell * 0.1, 0, Math.PI * 2);
        g.fill();
      }
    }

    // reservoir gauge
    const gw = Math.min(w - 48, 360);
    g.fillStyle = 'rgba(0,0,0,0.1)';
    g.fillRect((w - gw) / 2, h - 34, gw, 8);
    g.fillStyle = reservoir / reservoirMax < 0.25 ? inks.b : inks.a;
    g.fillRect((w - gw) / 2, h - 34, gw * (reservoir / reservoirMax), 8);
    g.fillStyle = inks.ink;
    g.globalAlpha = 0.6;
    g.textAlign = 'center';
    g.fillText(`level ${level} · reservoir`, w / 2, h - 44);
    g.globalAlpha = 1;
  }

  function loop(ts) {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;

    if (settling > 0) {
      settling -= dt;
      if (settling <= 0) { level += 1; buildLevel(); }
    } else if (!solvedPath) {
      reservoir -= dt;
      if (reservoir <= 0) {
        running = false;
        ctx.gameOver(score);
        return;
      }
    }
    draw(dt);
  }

  return {
    start() {
      score = 0; level = 1;
      buildLevel();
      ctx.setScore(0);
      running = true;
      last = performance.now();
      canvas.addEventListener('pointerdown', onTap);
      raf = requestAnimationFrame(loop);
    },
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', onTap);
      hint.remove();
      cv.destroy();
    },
  };
}
