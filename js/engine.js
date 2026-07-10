/* ════════════════════════════════════════════════════════════════════
   GJS AGENCY — CORE ENGINE
   Preloader · 3D hero · particles · nav · cursor · easter eggs
   Vanilla ES6+, rAF-driven, zero dependencies.
   ════════════════════════════════════════════════════════════════════ */
'use strict';

const GJS = (() => {

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const lerp  = (a, b, t) => a + (b - a) * t;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFinePointer = matchMedia('(pointer: fine)').matches;

  /* Shared pointer state — feeds cursor, hero tilt and magnetics */
  const pointer = { x: innerWidth / 2, y: innerHeight / 2, nx: 0, ny: 0 };
  addEventListener('pointermove', (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.nx = (e.clientX / innerWidth) * 2 - 1;   // -1 … 1
    pointer.ny = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });

  /* ══════════════ 1. PRELOADER — SYSTEM BOOT ══════════════ */
  const Preloader = {
    lines: [
      ['BOOT  ', 'gjs.kernel v5.0.2 — cyber-luxury runtime'],
      ['MOUNT ', '/dev/scraper-fleet ................ <span class="ok">OK</span>'],
      ['LINK  ', 'automation.pipeline[340] .......... <span class="ok">OK</span>'],
      ['LOAD  ', 'design.engine --fps=60 --locked ... <span class="ok">OK</span>'],
      ['SCAN  ', 'scraping nodes .................... <span class="cy">4.2M/h</span>'],
      ['SYNC  ', 'neural.matrix ..................... <span class="ok">STABLE</span>'],
      ['AUTH  ', 'visitor.clearance ................. <span class="cy">GRANTED</span>'],
      ['EXEC  ', 'render --mode=invisible-advantage'],
    ],

    run() {
      const el      = $('#preloader');
      const linesEl = $('#boot-lines');
      const bar     = $('#boot-bar');
      const pct     = $('#boot-percent');
      const status  = $('#boot-status');
      const total   = this.lines.length;
      const stepMs  = prefersReducedMotion ? 40 : 260;
      let i = 0;

      const finish = () => {
        status.textContent = 'ONLINE';
        el.classList.add('is-done');
        document.body.dataset.state = 'ready';
        Hero.introScramble();
        setTimeout(() => el.classList.add('is-gone'), 1200);
      };

      const step = () => {
        if (i < total) {
          const [tag, msg] = this.lines[i];
          linesEl.insertAdjacentHTML('beforeend',
            `<span class="cy">▸ ${tag}</span> ${msg}\n`);
          i++;
          const p = i / total;
          bar.style.transform = `scaleX(${p})`;
          pct.textContent = String(Math.round(p * 100)).padStart(3, '0') + '%';
          status.textContent = i < total ? 'LOADING' : 'COMPILING';
          setTimeout(step, stepMs + Math.random() * 160);
        } else {
          setTimeout(finish, 420);
        }
      };
      setTimeout(step, 350);
    },
  };

  /* ══════════════ 2. CUSTOM CURSOR ══════════════ */
  const Cursor = {
    init() {
      if (!isFinePointer || prefersReducedMotion) {
        $('#cursor')?.remove();
        return;
      }
      const root = $('#cursor');
      const dot  = $('.cursor-dot', root);
      const ring = $('.cursor-ring', root);
      let rx = pointer.x, ry = pointer.y;

      const tick = () => {
        dot.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
        rx = lerp(rx, pointer.x, 0.16);
        ry = lerp(ry, pointer.y, 0.16);
        ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      document.addEventListener('pointerover', (e) => {
        root.classList.toggle('is-hover',
          !!e.target.closest('a, button, [data-cursor]'));
      }, { passive: true });
    },
  };

  /* ══════════════ 3. HERO — PSEUDO-3D HOLOGRAPHIC CANVAS ══════════════
     Hand-rolled perspective projection: revolving data nodes on a sphere,
     a wireframe lattice floor and floating holographic code quads.
     Interaction: pointer parallax (desktop) / gyroscope (mobile).       */
  const Hero = {
    canvas: null, ctx: null, dpr: 1, w: 0, h: 0,
    nodes: [], codeBlocks: [], gridPts: [],
    rot: { x: -0.25, y: 0, tx: -0.25, ty: 0 },
    gyro: { x: 0, y: 0 },
    running: false,
    FOV: 420,

    CODE_SNIPPETS: [
      'const edge = await scrape(target)',
      'pipeline.deploy({ silent: true })',
      'fps.lock(60) // non-negotiable',
      'agents.spawn("architect")',
      'if (visible) advantage.hide()',
      'matrix.decrypt(sequence)',
    ],

    init() {
      this.canvas = $('#hero-canvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this.build();
      this.resize();
      addEventListener('resize', () => this.resize(), { passive: true });

      /* gyroscope tilt on mobile */
      addEventListener('deviceorientation', (e) => {
        if (e.beta === null) return;
        this.gyro.y = clamp((e.gamma || 0) / 45, -1, 1);
        this.gyro.x = clamp(((e.beta || 0) - 45) / 45, -1, 1);
      }, { passive: true });

      /* render only while the hero is on screen — saves the battery */
      new IntersectionObserver(([entry]) => {
        this.running = entry.isIntersecting;
        if (this.running) requestAnimationFrame(this.loop);
      }, { threshold: 0.02 }).observe(this.canvas);

      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.running) requestAnimationFrame(this.loop);
      });

      this.loop = this.loop.bind(this);
      requestAnimationFrame(this.loop);

      const hudNodes = $('#hud-nodes');
      if (hudNodes) hudNodes.textContent = `NODES: ${String(this.nodes.length).padStart(3, '0')}`;
    },

    build() {
      /* data nodes distributed on a fibonacci sphere */
      const N = 96, R = 230, GOLDEN = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < N; i++) {
        const y = 1 - (i / (N - 1)) * 2;
        const r = Math.sqrt(1 - y * y);
        const t = GOLDEN * i;
        this.nodes.push({
          x: Math.cos(t) * r * R,
          y: y * R,
          z: Math.sin(t) * r * R,
          hue: Math.random() < 0.72 ? 'cyan' : (Math.random() < 0.5 ? 'violet' : 'matrix'),
          phase: Math.random() * Math.PI * 2,
        });
      }
      /* floating holographic code quads */
      this.codeBlocks = this.CODE_SNIPPETS.map((text, i) => ({
        text,
        angle: (i / this.CODE_SNIPPETS.length) * Math.PI * 2,
        radius: 330 + (i % 3) * 40,
        y: -140 + (i % 4) * 90,
        speed: 0.00016 + (i % 3) * 0.00005,
      }));
      /* lattice floor */
      const G = 9, STEP = 90;
      for (let gx = 0; gx < G; gx++) {
        for (let gz = 0; gz < G; gz++) {
          this.gridPts.push({
            x: (gx - (G - 1) / 2) * STEP,
            y: 260,
            z: (gz - (G - 1) / 2) * STEP,
            gx, gz,
          });
        }
      }
      this.gridSize = G;
    },

    resize() {
      this.dpr = Math.min(devicePixelRatio || 1, 2);
      const rect = this.canvas.getBoundingClientRect();
      this.w = rect.width; this.h = rect.height;
      this.canvas.width  = rect.width * this.dpr;
      this.canvas.height = rect.height * this.dpr;
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    },

    project(x, y, z) {
      const { x: rx, y: ry } = this.rot;
      /* rotate Y then X */
      let cx = Math.cos(ry), sx = Math.sin(ry);
      let px = x * cx - z * sx;
      let pz = x * sx + z * cx;
      let cy = Math.cos(rx), sy = Math.sin(rx);
      let py = y * cy - pz * sy;
      pz = y * sy + pz * cy;
      const depth = this.FOV / (this.FOV + pz + 420);
      return {
        x: this.w / 2 + px * depth,
        y: this.h / 2 + py * depth,
        s: depth,
        z: pz,
      };
    },

    loop(now) {
      if (!this.running || document.hidden) return;
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);

      /* ease rotation toward pointer / gyro target */
      const tiltX = isFinePointer ? pointer.ny : this.gyro.x;
      const tiltY = isFinePointer ? pointer.nx : this.gyro.y;
      this.rot.ty += 0.0016;                              // idle revolve
      this.rot.x = lerp(this.rot.x, -0.25 + tiltX * 0.22, 0.045);
      this.rot.y = lerp(this.rot.y, this.rot.ty + tiltY * 0.35, 0.045);

      if (!prefersReducedMotion) {
        this.drawGrid(ctx);
        this.drawSphere(ctx, now);
        this.drawCodeBlocks(ctx, now);
      } else {
        this.drawSphere(ctx, 0);
      }
      requestAnimationFrame(this.loop);
    },

    drawGrid(ctx) {
      const G = this.gridSize;
      ctx.lineWidth = 0.6;
      for (const p of this.gridPts) {
        p._p = this.project(p.x, p.y, p.z);
      }
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.10)';
      ctx.beginPath();
      for (const p of this.gridPts) {
        const right = p.gx < G - 1 ? this.gridPts[(p.gx + 1) * G + p.gz] : null;
        const down  = p.gz < G - 1 ? this.gridPts[p.gx * G + p.gz + 1]  : null;
        if (right) { ctx.moveTo(p._p.x, p._p.y); ctx.lineTo(right._p.x, right._p.y); }
        if (down)  { ctx.moveTo(p._p.x, p._p.y); ctx.lineTo(down._p.x,  down._p.y); }
      }
      ctx.stroke();
    },

    drawSphere(ctx, now) {
      const colors = {
        cyan:   [0, 242, 254],
        violet: [168, 85, 247],
        matrix: [56, 255, 156],
      };
      /* depth-sort so far nodes render first */
      const projected = this.nodes
        .map((n) => ({ n, p: this.project(n.x, n.y, n.z) }))
        .sort((a, b) => b.p.z - a.p.z);

      /* connection lines between close nodes (front half only) */
      ctx.lineWidth = 0.5;
      const front = projected.filter(({ p }) => p.z < 60);
      for (let i = 0; i < front.length; i++) {
        for (let j = i + 1; j < front.length; j++) {
          const a = front[i].p, b = front[j].p;
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 4200) {
            ctx.strokeStyle = `rgba(0, 242, 254, ${(1 - d2 / 4200) * 0.16})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const { n, p } of projected) {
        const [r, g, b] = colors[n.hue];
        const twinkle = 0.55 + 0.45 * Math.sin(now * 0.002 + n.phase);
        const alpha = clamp(p.s - 0.25, 0.05, 0.95) * twinkle;
        const size = clamp(2.6 * p.s, 0.7, 3.2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
        if (p.s > 0.85) {   // glow halo on near nodes only (cheap)
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.12})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, size * 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },

    drawCodeBlocks(ctx, now) {
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textBaseline = 'middle';
      for (const b of this.codeBlocks) {
        const a = b.angle + now * b.speed;
        const p = this.project(Math.cos(a) * b.radius, b.y, Math.sin(a) * b.radius);
        if (p.z > 140) continue;                          // behind the sphere → hide
        const alpha = clamp(p.s - 0.3, 0, 0.75);
        const w = ctx.measureText(b.text).width + 18;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(p.s, p.s);
        ctx.fillStyle = `rgba(6, 10, 28, ${alpha * 0.82})`;
        ctx.strokeStyle = `rgba(0, 242, 254, ${alpha * 0.5})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(-w / 2, -13, w, 26, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = `rgba(56, 255, 156, ${alpha})`;
        ctx.fillText(b.text, -w / 2 + 9, 1);
        ctx.restore();
      }
    },

    /* decode-scramble on hero headline after boot */
    introScramble() {
      if (prefersReducedMotion) return;
      const CHARS = '█▓▒░<>/\\|01GJS#@%';
      $$('[data-scramble]').forEach((el, idx) => {
        const target = el.textContent;
        let frame = 0;
        const total = 26;
        setTimeout(() => {
          const tick = () => {
            frame++;
            const settled = Math.floor((frame / total) * target.length);
            el.textContent = target.split('').map((ch, i) =>
              ch === ' ' ? ' ' :
              i < settled ? ch :
              CHARS[(Math.random() * CHARS.length) | 0]
            ).join('');
            if (frame < total) requestAnimationFrame(tick);
            else el.textContent = target;
          };
          tick();
        }, 200 + idx * 140);
      });
    },
  };

  /* ══════════════ 4. AMBIENT PARTICLES — DATA DUST ══════════════ */
  const Particles = {
    init() {
      if (prefersReducedMotion) return;
      const canvas = $('#bg-canvas');
      const ctx = canvas.getContext('2d');
      let w, h, dpr;
      const COLORS = ['0,242,254', '168,85,247', '56,255,156', '248,249,250'];
      const dots = [];

      const resize = () => {
        dpr = Math.min(devicePixelRatio || 1, 1.5);
        w = innerWidth; h = innerHeight;
        canvas.width = w * dpr; canvas.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      resize();
      addEventListener('resize', resize, { passive: true });

      const COUNT = Math.min(70, Math.floor(innerWidth / 14));
      for (let i = 0; i < COUNT; i++) {
        dots.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.4 + 0.3,
          vy: Math.random() * 0.35 + 0.08,
          vx: (Math.random() - 0.5) * 0.12,
          c: COLORS[(Math.random() * COLORS.length) | 0],
          a: Math.random() * 0.45 + 0.1,
          phase: Math.random() * Math.PI * 2,
        });
      }

      const loop = (now) => {
        if (document.hidden) { requestAnimationFrame(loop); return; }
        ctx.clearRect(0, 0, w, h);
        for (const d of dots) {
          d.y += d.vy;
          d.x += d.vx + Math.sin(now * 0.0004 + d.phase) * 0.08;
          if (d.y > h + 6) { d.y = -6; d.x = Math.random() * w; }
          if (d.x > w + 6) d.x = -6;
          if (d.x < -6) d.x = w + 6;
          const flicker = 0.7 + 0.3 * Math.sin(now * 0.0016 + d.phase);
          ctx.fillStyle = `rgba(${d.c}, ${d.a * flicker})`;
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          ctx.fill();
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    },
  };

  /* ══════════════ 5. NAVIGATION — HEADER + FULLSCREEN MENU ══════════════ */
  const Nav = {
    init() {
      const header = $('#header');
      const toggle = $('#menu-toggle');
      const menu   = $('#menu');
      let lastY = scrollY;

      /* hide-on-scroll-down, glass shadow after threshold */
      addEventListener('scroll', () => {
        const y = scrollY;
        header.classList.toggle('is-scrolled', y > 40);
        if (!document.body.classList.contains('menu-open')) {
          header.classList.toggle('is-hidden', y > lastY && y > 320);
        }
        lastY = y;
      }, { passive: true });

      const setOpen = (open) => {
        document.body.classList.toggle('menu-open', open);
        menu.classList.toggle('is-open', open);
        menu.setAttribute('aria-hidden', String(!open));
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        if (open) header.classList.remove('is-hidden');
      };

      toggle.addEventListener('click', () =>
        setOpen(!document.body.classList.contains('menu-open')));

      $$('[data-menu-close]', menu).forEach((link) =>
        link.addEventListener('click', () => setOpen(false)));

      addEventListener('keydown', (e) => {
        if (e.key === 'Escape') setOpen(false);
      });
    },
  };

  /* ══════════════ 6. MAGNETIC ELEMENTS ══════════════ */
  const Magnetic = {
    init() {
      if (!isFinePointer || prefersReducedMotion) return;
      $$('.magnetic').forEach((el) => {
        const strength = 14;
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect();
          const dx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
          const dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
          el.style.transform =
            `translate3d(${dx * strength}px, ${dy * strength}px, 0)`;
        });
        el.addEventListener('pointerleave', () => {
          el.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
          el.style.transform = 'translate3d(0,0,0)';
          setTimeout(() => (el.style.transition = ''), 500);
        });
      });
    },
  };

  /* ══════════════ 7. SCROLL REVEAL + COUNTERS ══════════════ */
  const Reveal = {
    init() {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
      $$('.reveal').forEach((el) => io.observe(el));

      /* animated stat counters */
      const cio = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          cio.unobserve(entry.target);
          const el = entry.target;
          const target = parseInt(el.dataset.count, 10);
          const t0 = performance.now();
          const DUR = 1600;
          const tick = (now) => {
            const p = clamp((now - t0) / DUR, 0, 1);
            const eased = 1 - Math.pow(1 - p, 4);
            el.textContent = Math.round(target * eased);
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      }, { threshold: 0.6 });
      $$('[data-count]').forEach((el) => cio.observe(el));
    },
  };

  /* ══════════════ 8. LIVE HUD / FOOTER TELEMETRY ══════════════ */
  const Telemetry = {
    init() {
      const clock  = $('#hud-clock');
      const uptime = $('#footer-uptime');
      const year   = $('#footer-year');
      if (year) year.textContent = new Date().getFullYear();
      const t0 = Date.now();
      const pad = (n) => String(n).padStart(2, '0');
      setInterval(() => {
        const d = new Date();
        if (clock) clock.textContent =
          `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
        if (uptime) {
          const s = Math.floor((Date.now() - t0) / 1000);
          uptime.textContent =
            `UPTIME ${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
        }
      }, 1000);
    },
  };

  /* ══════════════ 9. CONTACT FORM — SIGNAL TRANSMISSION ══════════════ */
  const Contact = {
    init() {
      const form = $('#contact-form');
      if (!form) return;
      const confirmEl = $('#cf-confirm');
      const btn = $('#contact-send');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!form.reportValidity()) return;
        btn.disabled = true;
        const label = btn.querySelector('span');
        const states = ['ENCRYPTING…', 'ROUTING VIA 7 PROXIES…', 'SIGNAL SENT ✓'];
        states.forEach((s, i) => {
          setTimeout(() => {
            label.textContent = s;
            if (i === states.length - 1) {
              confirmEl.textContent =
                '▸ TRANSMISSION RECEIVED — THE ARCHITECTS WILL RESPOND WITHIN 24H.';
              form.reset();
              setTimeout(() => {
                label.textContent = 'Transmit Signal';
                btn.disabled = false;
              }, 2600);
            }
          }, 550 * (i + 1));
        });
      });
    },
  };

  /* ══════════════ 10. EASTER EGG — OVERDRIVE MODE ══════════════
     Triggers: typing "gjs" / "cyber", the Konami code,
     or a triple-tap on the logo (mobile).                        */
  const Overdrive = {
    KONAMI: ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'],
    buffer: '',
    konamiIdx: 0,
    active: false,

    MESSAGE:
`> DECRYPTING CHANNEL ..........
> IDENTITY CONFIRMED: OPERATIVE
>
> You found the frequency.
> Most visitors scroll. You searched.
> That is exactly the kind of mind
> we build invisible advantages for.
>
> The architects are listening.
> — GJS // END OF TRANSMISSION`,

    init() {
      addEventListener('keydown', (e) => {
        /* konami */
        this.konamiIdx = (e.key === this.KONAMI[this.konamiIdx]) ? this.konamiIdx + 1
                       : (e.key === this.KONAMI[0]) ? 1 : 0;
        if (this.konamiIdx === this.KONAMI.length) { this.konamiIdx = 0; this.engage(); }

        /* typed sequences — ignore while typing in a field */
        if (e.target.matches('input, textarea')) return;
        if (e.key.length === 1) {
          this.buffer = (this.buffer + e.key.toLowerCase()).slice(-5);
          if (this.buffer.endsWith('gjs') || this.buffer.endsWith('cyber')) {
            this.buffer = '';
            this.engage();
          }
        }
      });

      /* triple-tap logo (mobile) */
      let taps = 0, tapTimer = null;
      $('#logo').addEventListener('pointerdown', () => {
        taps++;
        clearTimeout(tapTimer);
        if (taps >= 3) { taps = 0; this.engage(); }
        else tapTimer = setTimeout(() => (taps = 0), 600);
      });

      $('#tx-close').addEventListener('click', () => this.disengage());
      $('#tx-contact').addEventListener('click', () => this.disengage());
      addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.active) this.disengage();
      });
    },

    engage() {
      if (this.active) return;
      this.active = true;
      document.body.classList.add('overdrive');
      const tx = $('#transmission');
      tx.classList.add('is-open');
      tx.setAttribute('aria-hidden', 'false');

      /* glitch the section titles briefly */
      const titles = $$('.section-title, .hero-title');
      titles.forEach((t) => t.classList.add('is-glitching'));
      setTimeout(() => titles.forEach((t) => t.classList.remove('is-glitching')), 2400);

      /* type out the secret transmission */
      const body = $('#tx-body');
      body.textContent = '';
      let i = 0;
      const msg = this.MESSAGE;
      clearInterval(this._typer);
      this._typer = setInterval(() => {
        body.textContent = msg.slice(0, ++i);
        if (i >= msg.length) clearInterval(this._typer);
      }, prefersReducedMotion ? 1 : 14);
    },

    disengage() {
      this.active = false;
      clearInterval(this._typer);
      const tx = $('#transmission');
      tx.classList.remove('is-open');
      tx.setAttribute('aria-hidden', 'true');
      /* keep the hyper-neon skin for 4 more seconds, then restore */
      setTimeout(() => document.body.classList.remove('overdrive'), 4000);
    },
  };

  /* ══════════════ BOOT ══════════════ */
  const init = () => {
    Preloader.run();
    Cursor.init();
    Hero.init();
    Particles.init();
    Nav.init();
    Magnetic.init();
    Reveal.init();
    Telemetry.init();
    Contact.init();
    Overdrive.init();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { pointer, lerp, clamp, prefersReducedMotion };
})();
