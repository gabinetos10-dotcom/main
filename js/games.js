/* ════════════════════════════════════════════════════════════════════
   GJS AGENCY — THE PLAYGROUND
   G.01 Scraping Matrix · G.02 Automation Pipeline · G.03 Visual Hacking Lab
   Warm dream-tech skin · Vanilla ES6+, rAF-driven, zero dependencies.
   ════════════════════════════════════════════════════════════════════ */
'use strict';

(() => {

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const rand  = (min, max) => min + Math.random() * (max - min);

  /* ══════════════ TAB SWITCHER ══════════════ */
  const Tabs = {
    init() {
      const tabs = $$('.hub-tab');
      tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
          tabs.forEach((t) => {
            const active = t === tab;
            t.classList.toggle('is-active', active);
            t.setAttribute('aria-selected', String(active));
          });
          $$('.game-panel').forEach((panel) => {
            const active = panel.id === `game-${tab.dataset.game}`;
            panel.classList.toggle('is-active', active);
            panel.hidden = !active;
          });
          ScrapeGame.pause();                 // leaving the matrix pauses it
          if (tab.dataset.game === 'pipeline') PipelineGame.layout();
        });
      });
    },
  };

  /* ══════════════ G.01 — THE SCRAPING MATRIX ══════════════
     Tap cyan data nodes (+10) and gold nodes (+50); firewalls cost -20.
     30 seconds on the clock, best score persisted locally.        */
  const ScrapeGame = {
    canvas: null, ctx: null, w: 0, h: 0, dpr: 1,
    entities: [], bursts: [],
    score: 0, timeLeft: 30, playing: false,
    spawnAcc: 0, lastTs: 0, raf: 0,

    init() {
      this.canvas = $('#scrape-canvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this.resize();
      addEventListener('resize', () => this.resize(), { passive: true });

      this.bestEl  = $('#scrape-best');
      this.scoreEl = $('#scrape-score');
      this.timeEl  = $('#scrape-time');
      this.best = parseInt(localStorage.getItem('gjs-scrape-best') || '0', 10);
      this.bestEl.textContent = this.best;

      $('#scrape-start').addEventListener('click', () => this.start());
      this.canvas.addEventListener('pointerdown', (e) => this.tap(e));
      this.loop = this.loop.bind(this);
    },

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      if (!rect.width) return;
      this.dpr = Math.min(devicePixelRatio || 1, 2);
      this.w = rect.width; this.h = rect.height;
      this.canvas.width  = rect.width * this.dpr;
      this.canvas.height = rect.height * this.dpr;
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    },

    start() {
      this.resize();
      $('#scrape-overlay').classList.remove('is-active');
      this.entities = [];
      this.bursts = [];
      this.score = 0;
      this.timeLeft = 30;
      this.playing = true;
      this.spawnAcc = 0;
      this.startTs = this.lastTs = performance.now();
      cancelAnimationFrame(this.raf);
      this.raf = requestAnimationFrame(this.loop);
    },

    pause() {
      if (!this.playing) return;
      this.playing = false;
      cancelAnimationFrame(this.raf);
      this.showOverlay('HARVEST PAUSED', `Basket set down at ${this.score} berries of data. They will wait — data is patient here.`, 'Resume the Harvest');
    },

    end() {
      this.playing = false;
      cancelAnimationFrame(this.raf);
      const newBest = this.score > this.best;
      if (newBest) {
        this.best = this.score;
        localStorage.setItem('gjs-scrape-best', String(this.best));
        this.bestEl.textContent = this.best;
      }
      this.showOverlay(
        newBest ? 'NEW HARVEST RECORD ✧' : 'HARVEST COMPLETE',
        `${this.score} records gathered in 30 golden seconds. ${newBest ? 'The orchard applauds you.' : 'Our production engines pick 4.2M an hour — imagine the jam we could make.'}`,
        'One More Round'
      );
    },

    showOverlay(title, desc, cta) {
      const ov = $('#scrape-overlay');
      ov.querySelector('.go-title').textContent = title;
      ov.querySelector('.go-desc').textContent = desc;
      $('#scrape-start').querySelector('span').textContent = cta;
      ov.classList.add('is-active');
    },

    spawn() {
      const roll = Math.random();
      const type = roll < 0.62 ? 'data' : roll < 0.72 ? 'gold' : 'firewall';
      this.entities.push({
        type,
        x: rand(30, this.w - 30),
        y: -24,
        vy: rand(60, 130) * (1 + (30 - this.timeLeft) / 45),  // speeds up
        vx: rand(-14, 14),
        r: type === 'gold' ? 13 : type === 'firewall' ? 17 : 11,
        rot: rand(0, Math.PI * 2),
        vr: rand(-1.4, 1.4),
        label: type === 'data' ? `0x${((Math.random() * 0xfff) | 0).toString(16).toUpperCase()}` : '',
      });
    },

    tap(e) {
      if (!this.playing) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      for (let i = this.entities.length - 1; i >= 0; i--) {
        const ent = this.entities[i];
        const dx = ent.x - x, dy = ent.y - y;
        if (dx * dx + dy * dy < (ent.r + 16) ** 2) {
          this.entities.splice(i, 1);
          if (ent.type === 'firewall') {
            this.score = Math.max(0, this.score - 20);
            this.burst(ent.x, ent.y, '231,112,200', 'FIREWALL!');
            this.canvas.animate(
              [{ filter: 'hue-rotate(0)' }, { filter: 'hue-rotate(140deg)' }, { filter: 'hue-rotate(0)' }],
              { duration: 220 });
          } else {
            const pts = ent.type === 'gold' ? 50 : 10;
            this.score += pts;
            this.burst(ent.x, ent.y, ent.type === 'gold' ? '240,190,217' : '255,194,67', `+${pts}`);
          }
          this.scoreEl.textContent = this.score;
          return;
        }
      }
    },

    burst(x, y, color, label) {
      for (let i = 0; i < 10; i++) {
        const a = rand(0, Math.PI * 2);
        this.bursts.push({
          x, y,
          vx: Math.cos(a) * rand(40, 160),
          vy: Math.sin(a) * rand(40, 160),
          life: 1, color, label: i === 0 ? label : '',
        });
      }
    },

    loop(ts) {
      if (!this.playing) return;
      /* dt caps at 0.25s so the game stays real-time even when rAF is
         throttled (low-end devices, software rendering) without letting
         a background-tab pause teleport everything off-screen          */
      const dt = Math.min((ts - this.lastTs) / 1000, 0.25);
      this.lastTs = ts;

      this.timeLeft = 30 - (ts - this.startTs) / 1000;   // wall-clock honest
      this.timeEl.textContent = Math.max(0, this.timeLeft).toFixed(1);
      if (this.timeLeft <= 0) { this.end(); return; }

      /* spawn cadence tightens as time runs out */
      this.spawnAcc += dt;
      const interval = clamp(0.55 - (30 - this.timeLeft) * 0.011, 0.22, 0.55);
      while (this.spawnAcc > interval) {
        this.spawnAcc -= interval;
        this.spawn();
      }

      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);

      /* faint drifting starlight in the night window */
      ctx.fillStyle = 'rgba(160,195,235,0.16)';
      ctx.font = '10px "DM Mono", monospace';
      for (let i = 0; i < 8; i++) {
        const cx = (this.w / 8) * i + 12;
        ctx.fillText('✧', cx, (ts / 9 + i * 140) % this.h);
      }

      for (let i = this.entities.length - 1; i >= 0; i--) {
        const ent = this.entities[i];
        ent.y += ent.vy * dt;
        ent.x += ent.vx * dt;
        ent.rot += ent.vr * dt;
        if (ent.y > this.h + 30) { this.entities.splice(i, 1); continue; }
        this.drawEntity(ctx, ent);
      }

      for (let i = this.bursts.length - 1; i >= 0; i--) {
        const b = this.bursts[i];
        b.life -= dt * 2.2;
        if (b.life <= 0) { this.bursts.splice(i, 1); continue; }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        ctx.fillStyle = `rgba(${b.color}, ${b.life})`;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 2.2 * b.life, 0, Math.PI * 2);
        ctx.fill();
        if (b.label) {
          ctx.font = '600 12px "JetBrains Mono", monospace';
          ctx.fillText(b.label, b.x + 8, b.y - 8);
        }
      }

      this.raf = requestAnimationFrame(this.loop);
    },

    drawEntity(ctx, ent) {
      ctx.save();
      ctx.translate(ent.x, ent.y);
      ctx.rotate(ent.rot);
      if (ent.type === 'firewall') {
        ctx.strokeStyle = 'rgba(231,112,200,0.95)';
        ctx.fillStyle = 'rgba(155,45,132,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * ent.r, Math.sin(a) * ent.r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = 'rgba(231,112,200,0.85)';
        ctx.beginPath();
        ctx.moveTo(-5, -5); ctx.lineTo(5, 5);
        ctx.moveTo(5, -5);  ctx.lineTo(-5, 5);
        ctx.stroke();
      } else {
        const c = ent.type === 'gold' ? '240,190,217' : '255,194,67';
        ctx.shadowColor = `rgb(${c})`;
        ctx.shadowBlur = 12;
        ctx.strokeStyle = `rgba(${c},0.95)`;
        ctx.fillStyle = `rgba(${c},0.14)`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();               // diamond
        ctx.moveTo(0, -ent.r); ctx.lineTo(ent.r, 0);
        ctx.lineTo(0, ent.r);  ctx.lineTo(-ent.r, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        if (ent.label) {
          ctx.rotate(-ent.rot);
          ctx.fillStyle = `rgba(${c},0.5)`;
          ctx.font = '8px "JetBrains Mono", monospace';
          ctx.fillText(ent.label, ent.r + 4, 3);
        }
      }
      ctx.restore();
    },
  };

  /* ══════════════ G.02 — THE AUTOMATION PIPELINE ══════════════
     Rebuild the chain TRIGGER → SCRAPE → TRANSFORM → ENRICH → ACTION.
     Tap two nodes to weld a cable; wrong pairs short-circuit.       */
  const PipelineGame = {
    CHAIN: [
      { id: 'trigger',   label: 'TRIGGER',   x: 14, y: 26, icon: '<svg viewBox="0 0 24 24"><path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>' },
      { id: 'scrape',    label: 'SCRAPE',    x: 74, y: 20, icon: '<svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M15 15l6 6" stroke="currentColor" stroke-width="1.6"/></svg>' },
      { id: 'transform', label: 'TRANSFORM', x: 32, y: 62, icon: '<svg viewBox="0 0 24 24"><path d="M4 8h12l-3-4M20 16H8l3 4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>' },
      { id: 'enrich',    label: 'ENRICH',    x: 84, y: 66, icon: '<svg viewBox="0 0 24 24"><path d="M12 3v18M3 12h18" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>' },
      { id: 'action',    label: 'ACTION',    x: 50, y: 86, icon: '<svg viewBox="0 0 24 24"><path d="M5 12h12M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>' },
    ],
    links: [], selected: null, built: false, nodes: {},

    init() {
      this.board  = $('#pipe-board');
      this.svg    = $('#pipe-svg');
      if (!this.board) return;
      this.linksEl  = $('#pipe-links');
      this.statusEl = $('#pipe-status');

      this.CHAIN.forEach((spec) => {
        const el = document.createElement('button');
        el.className = 'pipe-node';
        el.style.left = spec.x + '%';
        el.style.top  = spec.y + '%';
        el.style.animationDelay = `${Math.random() * -4}s`;
        el.innerHTML = `${spec.icon}<span>${spec.label}</span>`;
        el.setAttribute('aria-label', `Pipeline node ${spec.label}`);
        el.addEventListener('click', () => this.pick(spec.id));
        this.board.appendChild(el);
        this.nodes[spec.id] = el;
      });

      $('#pipe-start').addEventListener('click', () => {
        $('#pipe-overlay').classList.remove('is-active');
        this.reset();
      });
      $('#pipe-replay').addEventListener('click', () => {
        $('#pipe-victory').classList.remove('is-active');
        this.reset();
      });
      addEventListener('resize', () => this.redraw(), { passive: true });
    },

    reset() {
      this.links = [];
      this.selected = null;
      this.built = false;
      Object.values(this.nodes).forEach((el) =>
        el.classList.remove('is-selected', 'is-linked', 'is-error'));
      this.updateHud();
      this.redraw();
    },

    updateHud() {
      this.linksEl.textContent = `${this.links.length}/4`;
      this.statusEl.textContent =
        this.built ? 'HUMMING ✧' : this.links.length ? 'WELDING' : 'DOZING';
    },

    pick(id) {
      if (this.built) return;
      const el = this.nodes[id];
      if (this.selected === id) {                    // deselect
        el.classList.remove('is-selected');
        this.selected = null;
        return;
      }
      if (!this.selected) {
        this.selected = id;
        el.classList.add('is-selected');
        return;
      }
      const a = this.selected, b = id;
      this.nodes[a].classList.remove('is-selected');
      this.selected = null;

      const ia = this.CHAIN.findIndex((n) => n.id === a);
      const ib = this.CHAIN.findIndex((n) => n.id === b);
      const valid = Math.abs(ia - ib) === 1 &&
        !this.links.some(([la, lb]) => (la === a && lb === b) || (la === b && lb === a));

      if (valid) {
        this.links.push(ia < ib ? [a, b] : [b, a]);
        this.nodes[a].classList.add('is-linked');
        this.nodes[b].classList.add('is-linked');
        this.updateHud();
        this.redraw();
        if (this.links.length === 4) this.compile();
      } else {
        [a, b].forEach((n) => {
          const nel = this.nodes[n];
          nel.classList.remove('is-error');
          void nel.offsetWidth;                      // restart animation
          nel.classList.add('is-error');
        });
        this.flashBadCable(a, b);
      }
    },

    center(id) {
      const el = this.nodes[id];
      const br = this.board.getBoundingClientRect();
      const nr = el.getBoundingClientRect();
      return { x: nr.left - br.left + nr.width / 2, y: nr.top - br.top + nr.height / 2 };
    },

    cablePath(a, b) {
      const p1 = this.center(a), p2 = this.center(b);
      const mx = (p1.x + p2.x) / 2;
      const sag = Math.abs(p2.x - p1.x) * 0.12 + 18;
      return `M ${p1.x} ${p1.y} Q ${mx} ${Math.max(p1.y, p2.y) + sag} ${p2.x} ${p2.y}`;
    },

    redraw() {
      if (!this.svg) return;
      this.svg.innerHTML = '';
      this.links.forEach(([a, b]) => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', this.cablePath(a, b));
        path.setAttribute('class', 'pipe-cable');
        this.svg.appendChild(path);
      });
    },

    flashBadCable(a, b) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', this.cablePath(a, b));
      path.setAttribute('class', 'pipe-cable');
      path.style.stroke = 'rgba(255,59,92,0.9)';
      path.style.filter = 'drop-shadow(0 0 6px rgba(255,59,92,0.8))';
      this.svg.appendChild(path);
      path.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, easing: 'ease-out' })
          .onfinish = () => path.remove();
    },

    compile() {
      this.built = true;
      this.updateHud();
      /* light pulse travels the whole chain, then victory */
      const order = this.CHAIN.map((n) => n.id);
      const segments = [];
      for (let i = 0; i < order.length - 1; i++) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', this.cablePath(order[i], order[i + 1]));
        segments.push(path);
      }
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('r', '6');
      dot.setAttribute('class', 'pipe-pulse');
      this.svg.appendChild(dot);

      let seg = 0, t0 = performance.now();
      const SEG_MS = 420;
      const step = (now) => {
        const p = (now - t0) / SEG_MS;
        if (p >= 1) {
          seg++;
          t0 = now;
          if (seg >= segments.length) {
            dot.remove();
            setTimeout(() => $('#pipe-victory').classList.add('is-active'), 250);
            return;
          }
        }
        const path = segments[Math.min(seg, segments.length - 1)];
        const len = path.getTotalLength();
        const pt = path.getPointAtLength(clamp(p, 0, 1) * len);
        dot.setAttribute('cx', pt.x);
        dot.setAttribute('cy', pt.y);
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },

    layout() { this.redraw(); },
  };

  /* ══════════════ G.03 — THE VISUAL HACKING LAB ══════════════
     Simon-style light-rhythm decryption across 5 rounds.
     WebAudio tones, zero assets.                              */
  const SimonGame = {
    ROUNDS: 5,
    sequence: [], inputIdx: 0, round: 0,
    state: 'idle', audio: null,
    TONES: [293.66, 369.99, 440.00, 554.37],

    init() {
      this.pads = $$('.simon-pad');
      if (!this.pads.length) return;
      this.roundEl = $('#simon-round');
      this.stateEl = $('#simon-state');

      this.pads.forEach((pad) =>
        pad.addEventListener('pointerdown', () => this.press(+pad.dataset.pad)));
      $('#simon-start').addEventListener('click', () => {
        $('#simon-overlay').classList.remove('is-active');
        this.start();
      });
      $('#simon-replay').addEventListener('click', () => {
        $('#simon-victory').classList.remove('is-active');
        this.start();
      });
    },

    tone(i, dur = 0.22) {
      try {
        this.audio ??= new (window.AudioContext || window.webkitAudioContext)();
        const osc = this.audio.createOscillator();
        const gain = this.audio.createGain();
        osc.type = 'sine';
        osc.frequency.value = this.TONES[i] ?? 220;
        gain.gain.setValueAtTime(0.0001, this.audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.12, this.audio.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.audio.currentTime + dur);
        osc.connect(gain).connect(this.audio.destination);
        osc.start();
        osc.stop(this.audio.currentTime + dur + 0.05);
      } catch { /* audio is a garnish, never a blocker */ }
    },

    setState(state, label) {
      this.state = state;
      this.stateEl.textContent = label;
      this.pads.forEach((p) => p.classList.toggle('is-locked', state !== 'input'));
    },

    start() {
      this.sequence = [];
      this.round = 0;
      this.nextRound();
    },

    nextRound() {
      this.round++;
      this.roundEl.textContent = `${this.round}/${this.ROUNDS}`;
      this.sequence.push((Math.random() * 4) | 0);
      this.playback();
    },

    async playback() {
      this.setState('showing', 'OBSERVE');
      await this.wait(700);
      for (const i of this.sequence) {
        this.flash(i);
        await this.wait(560);
      }
      this.inputIdx = 0;
      this.setState('input', 'REPLICATE');
    },

    flash(i, error = false) {
      const pad = this.pads[i];
      pad.classList.add('is-lit');
      if (error) pad.style.color = 'var(--c-red)';
      this.tone(error ? -1 : i);
      setTimeout(() => {
        pad.classList.remove('is-lit');
        pad.style.color = '';
      }, 340);
    },

    press(i) {
      if (this.state !== 'input') return;
      this.flash(i);
      if (i === this.sequence[this.inputIdx]) {
        this.inputIdx++;
        if (this.inputIdx === this.sequence.length) {
          if (this.round === this.ROUNDS) return this.win();
          this.setState('showing', 'ACCEPTED ✓');
          setTimeout(() => this.nextRound(), 900);
        }
      } else {
        this.fail();
      }
    },

    async fail() {
      this.setState('showing', 'CORRUPTED');
      await this.wait(200);
      this.pads.forEach((_, idx) => this.flash(idx, true));
      await this.wait(900);
      /* mercy rule: replay the same round, sequence intact */
      this.playback();
    },

    win() {
      this.setState('idle', 'DECRYPTED');
      /* celebratory cascade */
      this.sequence.slice(-4).forEach((_, k) =>
        setTimeout(() => this.flash(k % 4), k * 130));
      setTimeout(() => $('#simon-victory').classList.add('is-active'), 800);
    },

    wait(ms) { return new Promise((r) => setTimeout(r, ms)); },
  };

  const init = () => {
    Tabs.init();
    ScrapeGame.init();
    PipelineGame.init();
    SimonGame.init();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* dev/debug handle */
  window.__GJS_HUB = { ScrapeGame, PipelineGame, SimonGame };
})();
