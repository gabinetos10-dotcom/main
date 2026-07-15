/* ════════════════════════════════════════════════════════════════════
   GJS AGENCY — DREAM ENGINE
   Preloader · iridescent 3D hero · bokeh particles · nav · cursor halo
   · easter eggs. Vanilla ES6+, rAF-driven, zero dependencies.
   ════════════════════════════════════════════════════════════════════ */
'use strict';

const GJS = (() => {

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const lerp  = (a, b, t) => a + (b - a) * t;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFinePointer = matchMedia('(pointer: fine)').matches;

  /* brand palette as rgb triplets for canvas work */
  const PALETTE = {
    indigo:    [50, 78, 161],
    cloud:     [160, 195, 235],
    gold:      [255, 194, 67],
    apricot:   [235, 106, 41],
    raspberry: [155, 45, 132],
    blush:     [240, 190, 217],
  };

  /* shared pointer state — feeds cursor, hero tilt and magnetics */
  const pointer = { x: innerWidth / 2, y: innerHeight / 2, nx: 0, ny: 0 };
  addEventListener('pointermove', (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.nx = (e.clientX / innerWidth) * 2 - 1;   // -1 … 1
    pointer.ny = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });

  /* ══════════════ 1. PRELOADER — DREAM COMPILER ══════════════ */
  const Preloader = {
    WORDS: [
      'gathering stardust',
      'warming the gradients',
      'teaching pixels to daydream',
      'tuning the light',
      'folding tiny worlds',
      'almost sunrise…',
    ],

    run() {
      const el      = $('#preloader');
      const wordEl  = $('#dream-word');
      const bar     = $('#dream-bar');
      const pct     = $('#dream-percent');
      const total   = this.WORDS.length;
      const stepMs  = prefersReducedMotion ? 40 : 380;
      let i = 0;

      const finish = () => {
        el.classList.add('is-done');
        document.body.dataset.state = 'ready';
        Hero.introScramble();
        setTimeout(() => el.classList.add('is-gone'), 1500);
      };

      const step = () => {
        if (i < total) {
          wordEl.textContent = this.WORDS[i];
          i++;
          const p = i / total;
          bar.style.transform = `scaleX(${p})`;
          pct.textContent = Math.round(p * 100) + '%';
          setTimeout(step, stepMs + Math.random() * 140);
        } else {
          setTimeout(finish, 380);
        }
      };
      setTimeout(step, 320);
    },
  };

  /* ══════════════ 2. CURSOR HALO ══════════════ */
  const Cursor = {
    init() {
      if (!isFinePointer || prefersReducedMotion) {
        $('#cursor')?.remove();
        return;
      }
      const root = $('#cursor');
      const dot  = $('.cursor-dot', root);
      const halo = $('.cursor-halo', root);
      let hx = pointer.x, hy = pointer.y;

      const tick = () => {
        dot.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
        hx = lerp(hx, pointer.x, 0.14);
        hy = lerp(hy, pointer.y, 0.14);
        halo.style.transform = `translate3d(${hx}px, ${hy}px, 0)`;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      document.addEventListener('pointerover', (e) => {
        root.classList.toggle('is-hover',
          !!e.target.closest('a, button, [data-cursor]'));
      }, { passive: true });
    },
  };

  /* ══════════════ 3. HERO — IRIDESCENT 3D DREAMSCAPE ══════════════
     Hand-rolled perspective projection: a fibonacci constellation of
     luminous nodes, floating wireframe polyhedra that revolve like
     slow jewellery, and warm glass code-chips orbiting through.
     Interaction: pointer parallax (desktop) / gyroscope (mobile).   */
  const Hero = {
    canvas: null, ctx: null, dpr: 1, w: 0, h: 0,
    nodes: [], codeBlocks: [], gems: [],
    rot: { x: -0.22, y: 0, tx: -0.22, ty: 0 },
    gyro: { x: 0, y: 0 },
    running: false,
    FOV: 420,

    CODE_SNIPPETS: [
      'const joy = await scrape(sunlight)',
      'pipeline.hum({ softly: true })',
      'fps.lock(60) // silky, always',
      'palette.blend("gold", "blush")',
      'world.make({ small: true, warm: true })',
      'dream.compile(rhythm)',
    ],

    /* wireframe polyhedra — vertices + edge index pairs */
    SHAPES: [
      { // octahedron
        v: [[0,-1,0],[1,0,0],[0,0,1],[-1,0,0],[0,0,-1],[0,1,0]],
        e: [[0,1],[0,2],[0,3],[0,4],[5,1],[5,2],[5,3],[5,4],[1,2],[2,3],[3,4],[4,1]],
        color: 'gold', size: 84, orbit: 300, y: -120, speed: 0.00019, spin: 0.0007,
      },
      { // cube
        v: [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],
        e: [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]],
        color: 'raspberry', size: 66, orbit: 340, y: 60, speed: -0.00014, spin: 0.0005,
      },
      { // tetrahedron
        v: [[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]],
        e: [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]],
        color: 'apricot', size: 58, orbit: 260, y: 160, speed: 0.00023, spin: -0.0009,
      },
      { // elongated diamond
        v: [[0,-1.5,0],[1,0,0],[0,0,1],[-1,0,0],[0,0,-1],[0,1.5,0]],
        e: [[0,1],[0,2],[0,3],[0,4],[5,1],[5,2],[5,3],[5,4],[1,2],[2,3],[3,4],[4,1]],
        color: 'indigo', size: 52, orbit: 390, y: -40, speed: -0.00011, spin: 0.0011,
      },
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

      /* render only while the hero is on screen */
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
      if (hudNodes) {
        const count = this.nodes.length + this.SHAPES.length;
        hudNodes.textContent = `SHAPES: ${String(count).padStart(3, '0')}`;
      }
    },

    build() {
      /* constellation on a fibonacci sphere */
      const N = 90, R = 235, GOLDEN = Math.PI * (3 - Math.sqrt(5));
      const hues = ['indigo', 'apricot', 'raspberry', 'gold', 'cloud'];
      for (let i = 0; i < N; i++) {
        const y = 1 - (i / (N - 1)) * 2;
        const r = Math.sqrt(1 - y * y);
        const t = GOLDEN * i;
        this.nodes.push({
          x: Math.cos(t) * r * R,
          y: y * R,
          z: Math.sin(t) * r * R,
          hue: hues[(Math.random() * hues.length) | 0],
          phase: Math.random() * Math.PI * 2,
        });
      }
      /* warm glass code chips */
      this.codeBlocks = this.CODE_SNIPPETS.map((text, i) => ({
        text,
        angle: (i / this.CODE_SNIPPETS.length) * Math.PI * 2,
        radius: 330 + (i % 3) * 40,
        y: -150 + (i % 4) * 95,
        speed: 0.00015 + (i % 3) * 0.00005,
      }));
      /* revolving gems */
      this.gems = this.SHAPES.map((s, i) => ({
        ...s,
        angle: (i / this.SHAPES.length) * Math.PI * 2,
        selfRot: Math.random() * Math.PI * 2,
      }));
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

      const tiltX = isFinePointer ? pointer.ny : this.gyro.x;
      const tiltY = isFinePointer ? pointer.nx : this.gyro.y;
      this.rot.ty += 0.0014;                              // idle revolve
      this.rot.x = lerp(this.rot.x, -0.22 + tiltX * 0.2, 0.045);
      this.rot.y = lerp(this.rot.y, this.rot.ty + tiltY * 0.32, 0.045);

      if (!prefersReducedMotion) {
        this.drawConstellation(ctx, now);
        this.drawGems(ctx, now);
        this.drawCodeBlocks(ctx, now);
      } else {
        this.drawConstellation(ctx, 0);
      }
      requestAnimationFrame(this.loop);
    },

    drawConstellation(ctx, now) {
      const projected = this.nodes
        .map((n) => ({ n, p: this.project(n.x, n.y, n.z) }))
        .sort((a, b) => b.p.z - a.p.z);

      /* gossamer threads between close front nodes */
      ctx.lineWidth = 0.7;
      const front = projected.filter(({ p }) => p.z < 60);
      for (let i = 0; i < front.length; i++) {
        for (let j = i + 1; j < front.length; j++) {
          const a = front[i].p, b = front[j].p;
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 4200) {
            ctx.strokeStyle = `rgba(50, 78, 161, ${(1 - d2 / 4200) * 0.16})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const { n, p } of projected) {
        const [r, g, b] = PALETTE[n.hue];
        const twinkle = 0.55 + 0.45 * Math.sin(now * 0.0018 + n.phase);
        const alpha = clamp(p.s - 0.22, 0.06, 0.85) * twinkle;
        const size = clamp(2.8 * p.s, 0.8, 3.4);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
        if (p.s > 0.85) {                       // soft aura on near nodes
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.14})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, size * 3.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },

    /* revolving wireframe jewellery */
    drawGems(ctx, now) {
      for (const gem of this.gems) {
        const orbitA = gem.angle + now * gem.speed;
        const cx3 = Math.cos(orbitA) * gem.orbit;
        const cz3 = Math.sin(orbitA) * gem.orbit;
        const spin = gem.selfRot + now * gem.spin;
        const cs = Math.cos(spin), sn = Math.sin(spin);

        /* rotate each vertex around its own Y axis, then place on orbit */
        const pts = gem.v.map(([vx, vy, vz]) => {
          const x = vx * cs - vz * sn;
          const z = vx * sn + vz * cs;
          return this.project(cx3 + x * gem.size, gem.y + vy * gem.size, cz3 + z * gem.size);
        });

        const centre = this.project(cx3, gem.y, cz3);
        const [r, g, b] = PALETTE[gem.color];
        const alpha = clamp(centre.s - 0.18, 0.08, 0.8);

        ctx.lineWidth = clamp(1.7 * centre.s, 0.6, 1.9);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.beginPath();
        for (const [a, bIdx] of gem.e) {
          ctx.moveTo(pts[a].x, pts[a].y);
          ctx.lineTo(pts[bIdx].x, pts[bIdx].y);
        }
        ctx.stroke();

        /* iridescent facet glow at the centre */
        const glow = ctx.createRadialGradient(centre.x, centre.y, 0, centre.x, centre.y, gem.size * centre.s);
        glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.3})`);
        glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(centre.x, centre.y, gem.size * centre.s, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    drawCodeBlocks(ctx, now) {
      ctx.font = '10px "DM Mono", monospace';
      ctx.textBaseline = 'middle';
      for (const b of this.codeBlocks) {
        const a = b.angle + now * b.speed;
        const p = this.project(Math.cos(a) * b.radius, b.y, Math.sin(a) * b.radius);
        if (p.z > 140) continue;                          // hidden behind
        const alpha = clamp(p.s - 0.3, 0, 0.85);
        const w = ctx.measureText(b.text).width + 20;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(p.s, p.s);
        ctx.fillStyle = `rgba(255, 252, 246, ${alpha * 0.85})`;
        ctx.strokeStyle = `rgba(235, 106, 41, ${alpha * 0.55})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(-w / 2, -14, w, 28, 12);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = `rgba(50, 78, 161, ${alpha})`;
        ctx.fillText(b.text, -w / 2 + 10, 1);
        ctx.restore();
      }
    },

    /* dreamy decode on the hero headline after the preloader */
    introScramble() {
      if (prefersReducedMotion) return;
      const CHARS = '✧☀◦*·˚⋆°+';
      $$('[data-scramble]').forEach((el, idx) => {
        const target = el.textContent;
        let frame = 0;
        const total = 24;
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
        }, 220 + idx * 150);
      });
    },
  };

  /* ══════════════ 4. AMBIENT BOKEH — LIGHT DUST ══════════════ */
  const Particles = {
    init() {
      if (prefersReducedMotion) return;
      const canvas = $('#bg-canvas');
      const ctx = canvas.getContext('2d');
      let w, h, dpr;
      const COLORS = [PALETTE.gold, PALETTE.blush, PALETTE.cloud, PALETTE.apricot];
      const motes = [];

      const resize = () => {
        dpr = Math.min(devicePixelRatio || 1, 1.5);
        w = innerWidth; h = innerHeight;
        canvas.width = w * dpr; canvas.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      resize();
      addEventListener('resize', resize, { passive: true });

      const COUNT = Math.min(56, Math.floor(innerWidth / 18));
      for (let i = 0; i < COUNT; i++) {
        const big = Math.random() < 0.22;             // some large soft bokeh
        motes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: big ? Math.random() * 10 + 6 : Math.random() * 2 + 0.8,
          vy: -(Math.random() * 0.28 + 0.05),         // drift upward, dreamily
          vx: (Math.random() - 0.5) * 0.12,
          c: COLORS[(Math.random() * COLORS.length) | 0],
          a: big ? Math.random() * 0.1 + 0.05 : Math.random() * 0.3 + 0.12,
          phase: Math.random() * Math.PI * 2,
        });
      }

      const loop = (now) => {
        if (document.hidden) { requestAnimationFrame(loop); return; }
        ctx.clearRect(0, 0, w, h);
        for (const m of motes) {
          m.y += m.vy;
          m.x += m.vx + Math.sin(now * 0.00035 + m.phase) * 0.1;
          if (m.y < -16) { m.y = h + 16; m.x = Math.random() * w; }
          if (m.x > w + 16) m.x = -16;
          if (m.x < -16) m.x = w + 16;
          const shimmer = 0.7 + 0.3 * Math.sin(now * 0.0014 + m.phase);
          const [r, g, b] = m.c;
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${m.a * shimmer})`;
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
          ctx.fill();
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    },
  };

  /* ══════════════ 5. NAVIGATION — HEADER + CHROMATIC WAVE MENU ══════════════ */
  const Nav = {
    init() {
      const header = $('#header');
      const toggle = $('#menu-toggle');
      const menu   = $('#menu');
      let lastY = scrollY;

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
          el.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
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
            `DREAMING FOR ${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
        }
      }, 1000);
    },
  };

  /* ══════════════ 9. CONTACT FORM — POSTCARD DELIVERY ══════════════ */
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
        const states = ['FOLDING THE POSTCARD…', 'CATCHING A SUNBEAM…', 'DELIVERED ✧'];
        states.forEach((s, i) => {
          setTimeout(() => {
            label.textContent = s;
            if (i === states.length - 1) {
              confirmEl.textContent =
                '✧ POSTCARD RECEIVED — WE WRITE BACK WITHIN 24 SUNNY HOURS.';
              form.reset();
              setTimeout(() => {
                label.textContent = 'Send the Dream';
                btn.disabled = false;
              }, 2600);
            }
          }, 550 * (i + 1));
        });
      });
    },
  };

  /* ══════════════ 10. EASTER EGG — OVERDRIVE DREAM MODE ══════════════
     Triggers: typing "gjs" / "dream", the Konami code,
     or a triple-tap on the logo (mobile).                             */
  const Overdrive = {
    KONAMI: ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'],
    buffer: '',
    konamiIdx: 0,
    active: false,

    MESSAGE:
`✧ unfolding ..................
✧ ink still warm
✧
✧ You found the letter we hid
✧ inside the light. Most people
✧ scroll past the sun — you
✧ reached out and touched it.
✧
✧ We build for the curious.
✧ Come dream with us.
✧ — GJS, with love & machines`,

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
          if (this.buffer.endsWith('gjs') || this.buffer.endsWith('dream')) {
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

      /* shimmer-glitch the big headings briefly */
      const titles = $$('.section-title, .hero-title');
      titles.forEach((t) => t.classList.add('is-glitching'));
      setTimeout(() => titles.forEach((t) => t.classList.remove('is-glitching')), 2400);

      /* hand-write the secret letter */
      const body = $('#tx-body');
      body.textContent = '';
      let i = 0;
      const msg = this.MESSAGE;
      clearInterval(this._typer);
      this._typer = setInterval(() => {
        body.textContent = msg.slice(0, ++i);
        if (i >= msg.length) clearInterval(this._typer);
      }, prefersReducedMotion ? 1 : 16);
    },

    disengage() {
      this.active = false;
      clearInterval(this._typer);
      const tx = $('#transmission');
      tx.classList.remove('is-open');
      tx.setAttribute('aria-hidden', 'true');
      /* let the neon dream linger for a few seconds, then sunrise */
      setTimeout(() => document.body.classList.remove('overdrive'), 4000);
    },
  };

  /* ══════════════ SUNRISE ══════════════ */
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

  return { pointer, lerp, clamp, prefersReducedMotion, PALETTE };
})();
