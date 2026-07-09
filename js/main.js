/* ==========================================================================
   NOUS. — Main Script · Street Edition (vanilla JS, zero dependency)
   Modules: loader · smooth scroll · cursor + spray trail · magnetism ·
            split/scramble text · marquee · hero wall canvas ·
            card canvases + tilt · scroll-drawn tags · reveals · UI
   ========================================================================== */
(() => {
  'use strict';

  /* ---------- helpers ---------- */
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TOUCH = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ======================================================================
     1. LOADER — graffiti tag draw + counter + sweep reveal
  ====================================================================== */
  const loader = $('#loader');
  const tags = ['On secoue la bombe', 'On cale le pochoir', 'Première couche', 'C’est frais'];

  function runLoader() {
    const fill = $('#loaderFill'), count = $('#loaderCount'), tag = $('#loaderTag');
    const dur = RM ? 200 : 2100;
    const start = performance.now();
    (function tick(now) {
      const p = clamp((now - start) / dur, 0, 1);
      const e = 1 - Math.pow(1 - p, 3);
      const pct = Math.round(e * 100);
      fill.style.width = pct + '%';
      count.textContent = String(pct).padStart(2, '0');
      tag.textContent = tags[clamp(Math.floor(e * tags.length), 0, tags.length - 1)];
      if (p < 1) requestAnimationFrame(tick);
      else finishLoader();
    })(start);
  }
  function finishLoader() {
    setTimeout(() => {
      loader.classList.add('done');
      document.body.classList.add('loaded');
      revealHero();
      setTimeout(() => loader.remove(), 1100);
    }, 220);
  }
  window.addEventListener('load', runLoader);
  setTimeout(() => { if (!document.body.classList.contains('loaded')) runLoader(); }, 700);

  /* ======================================================================
     2. SMOOTH SCROLL (inertial, transform-based) + velocity bus
  ====================================================================== */
  const scrollEl = $('#scroll');
  let scrollTarget = 0, scrollCurrent = 0, velocity = 0;
  const Scroll = { get y() { return scrollCurrent; }, get v() { return velocity; } };

  function initSmooth() {
    if (TOUCH || RM) return;
    const setHeight = () => { document.body.style.height = scrollEl.getBoundingClientRect().height + 'px'; };
    Object.assign(scrollEl.style, { position: 'fixed', top: '0', left: '0', width: '100%', willChange: 'transform' });
    setHeight();
    new ResizeObserver(setHeight).observe(scrollEl);
    window.addEventListener('resize', setHeight);

    (function render() {
      scrollTarget = window.scrollY;
      const prev = scrollCurrent;
      scrollCurrent = lerp(scrollCurrent, scrollTarget, 0.09);
      if (Math.abs(scrollTarget - scrollCurrent) < 0.05) scrollCurrent = scrollTarget;
      velocity = scrollCurrent - prev;
      // subtle skew distortion driven by scroll velocity (top-tier feel)
      const skew = clamp(velocity * 0.06, -3, 3);
      scrollEl.style.transform = `translate3d(0, ${-scrollCurrent}px, 0) skewY(${skew}deg)`;
      applyParallax();
      applyDraw();
      requestAnimationFrame(render);
    })();
  }
  function initNativeBus() {
    if (!TOUCH && !RM) return;
    const upd = () => {
      const prev = scrollCurrent;
      scrollCurrent = window.scrollY;
      velocity = scrollCurrent - prev;
      applyParallax();
      applyDraw();
    };
    window.addEventListener('scroll', upd, { passive: true });
    upd();
  }

  /* ---------- parallax (stickers etc.) ---------- */
  const parallaxItems = [];
  function registerParallax() {
    $$('[data-parallax]').forEach(el => {
      parallaxItems.push({ el, speed: parseFloat(el.dataset.parallax) || 0.1 });
    });
  }
  function applyParallax() {
    for (const p of parallaxItems) {
      const r = p.el.getBoundingClientRect();
      const center = r.top + r.height / 2 - innerHeight / 2;
      p.el.style.translate = `0 ${(-center * p.speed).toFixed(2)}px`;
    }
  }

  /* ---------- scroll-drawn SVG tag strokes ---------- */
  const drawItems = [];
  function registerDraw() {
    $$('[data-draw] path').forEach(path => {
      const len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      drawItems.push({ path, len, svg: path.closest('svg') });
    });
  }
  function applyDraw() {
    for (const d of drawItems) {
      const r = d.svg.getBoundingClientRect();
      const prog = clamp((innerHeight * 0.9 - r.top) / (innerHeight * 0.9), 0, 1);
      d.path.style.strokeDashoffset = d.len * (1 - prog);
    }
  }

  /* ======================================================================
     3. CURSOR (spray cap) + SPRAY PAINT TRAIL
  ====================================================================== */
  const ring = $('#cursorRing'), dot = $('#cursorDot'), cText = $('#cursorText');
  const spray = $('#sprayCanvas');

  if (!TOUCH && ring) {
    document.body.classList.add('has-cursor');
    let mx = innerWidth / 2, my = innerHeight / 2;
    let rx = mx, ry = my, dx = mx, dy = my;
    let pmx = mx, pmy = my, visible = false;

    /* spray trail: yellow paint particles that fade like fresh paint */
    const sctx = spray.getContext('2d');
    let sw, sh, sdpr;
    const drops = [];
    function sizeSpray() {
      sdpr = Math.min(devicePixelRatio || 1, 2);
      sw = spray.width = innerWidth * sdpr;
      sh = spray.height = innerHeight * sdpr;
    }
    sizeSpray();
    window.addEventListener('resize', sizeSpray);

    window.addEventListener('pointermove', e => {
      mx = e.clientX; my = e.clientY;
      if (!visible) { visible = true; ring.classList.remove('cursor-hidden'); dot.classList.remove('cursor-hidden'); }
      // emit paint proportional to pointer speed
      const speed = Math.hypot(mx - pmx, my - pmy);
      const n = clamp(Math.floor(speed / 6), 0, 5);
      for (let i = 0; i < n; i++) {
        drops.push({
          x: (mx + (Math.random() - 0.5) * 14) * sdpr,
          y: (my + (Math.random() - 0.5) * 14) * sdpr,
          r: (2 + Math.random() * 5) * sdpr,
          life: 1,
          decay: 0.012 + Math.random() * 0.02,
        });
      }
      if (drops.length > 220) drops.splice(0, drops.length - 220);
      pmx = mx; pmy = my;
    });
    document.addEventListener('mouseleave', () => {
      ring.classList.add('cursor-hidden'); dot.classList.add('cursor-hidden'); visible = false;
    });

    (function renderCursor() {
      dx = lerp(dx, mx, 0.35); dy = lerp(dy, my, 0.35);
      rx = lerp(rx, mx, 0.15); ry = lerp(ry, my, 0.15);
      dot.style.transform = `translate(${dx}px, ${dy}px) translate(-50%,-50%)`;
      ring.style.left = rx + 'px'; ring.style.top = ry + 'px';

      // paint drops
      sctx.clearRect(0, 0, sw, sh);
      for (let i = drops.length - 1; i >= 0; i--) {
        const p = drops[i];
        p.life -= p.decay;
        if (p.life <= 0) { drops.splice(i, 1); continue; }
        sctx.beginPath();
        sctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
        sctx.fillStyle = `rgba(233, 200, 0, ${0.5 * p.life})`;
        sctx.fill();
      }
      requestAnimationFrame(renderCursor);
    })();

    const STATES = ['link', 'cta', 'plus', 'see'];
    $$('[data-cursor]').forEach(el => {
      const type = el.dataset.cursor;
      el.addEventListener('mouseenter', () => {
        STATES.forEach(s => document.body.classList.remove('cs-' + s));
        document.body.classList.add('cs-' + type);
        cText.textContent = el.dataset.cursorLabel || (type === 'cta' ? 'Go' : type === 'see' ? 'Voir' : '');
      });
      el.addEventListener('mouseleave', () => {
        document.body.classList.remove('cs-' + type);
        cText.textContent = '';
      });
    });
  }

  /* ======================================================================
     4. MAGNETISM
  ====================================================================== */
  if (!TOUCH) {
    $$('[data-magnetic]').forEach(el => {
      const strength = parseFloat(el.dataset.magnetic) || 0.4;
      let raf;
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * strength;
        const y = (e.clientY - r.top - r.height / 2) * strength;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => { el.style.transform = `translate(${x}px, ${y}px)`; });
      });
      el.addEventListener('pointerleave', () => {
        cancelAnimationFrame(raf);
        el.style.transition = 'transform .5s cubic-bezier(.34,1.56,.64,1)';
        el.style.transform = 'translate(0,0)';
        setTimeout(() => (el.style.transition = ''), 500);
      });
    });
  }

  /* ======================================================================
     5. SPLIT TEXT — hero chars + scramble headings
  ====================================================================== */
  $$('[data-char-line]').forEach(line => {
    const txt = line.textContent;
    line.textContent = '';
    [...txt].forEach(ch => {
      const s = document.createElement('span');
      s.className = 'char';
      s.textContent = ch === ' ' ? ' ' : ch;
      line.appendChild(s);
    });
  });
  function revealHero() {
    $$('.hero-title .char').forEach((c, i) => {
      c.style.transition = 'transform 1s cubic-bezier(.16,1,.3,1)';
      c.style.transitionDelay = (i * 0.022) + 's';
      requestAnimationFrame(() => { c.style.transform = 'translateY(0) rotate(0)'; });
    });
    $$('.hero [data-reveal]').forEach((el, i) => {
      setTimeout(() => el.classList.add('in'), 500 + i * 120);
    });
  }

  const GLYPHS = '!<>-_\\/[]{}—=+*^?#§¥$@nous';
  function scramble(el) {
    const final = el.dataset.text || el.textContent;
    el.dataset.text = final;
    const dur = 900, start = performance.now();
    const seeds = [...final].map(() => Math.random());
    (function tick(now) {
      const p = clamp((now - start) / dur, 0, 1);
      let out = '';
      for (let i = 0; i < final.length; i++) {
        if (p > i / final.length + 0.05) out += final[i];
        else if (final[i] === ' ') out += ' ';
        else out += GLYPHS[Math.floor((seeds[i] + p * 30) * GLYPHS.length) % GLYPHS.length];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = final;
    })(start);
  }

  /* ======================================================================
     6. MARQUEE — drift + scroll-velocity boost, reverses with direction
  ====================================================================== */
  const mTrack = $('#marqueeTrack');
  if (mTrack) {
    mTrack.innerHTML += mTrack.innerHTML + mTrack.innerHTML;
    let offset = 0;
    const single = () => mTrack.scrollWidth / 3;
    (function loop() {
      offset -= 0.8 + Scroll.v * 0.35;
      const s = single();
      if (-offset >= s) offset += s;
      if (offset > 0) offset -= s;
      mTrack.style.transform = `translateX(${offset}px)`;
      requestAnimationFrame(loop);
    })();
  }

  /* ======================================================================
     7. HERO WALL CANVAS — spray strokes + drips on concrete
     Generative: arcs of "paint" appear, drip, and fade like a living wall
  ====================================================================== */
  const wall = $('#heroCanvas');
  if (wall && !RM) {
    const ctx = wall.getContext('2d');
    let w, h, dpr;
    const strokes = [];   // active spray strokes
    const drips = [];     // paint drips falling from strokes
    const COLORS = ['#F4D823', '#E9C800', '#0A0A0A'];
    let pointer = { x: -999, y: -999 };

    function size() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = wall.width = wall.offsetWidth * dpr;
      h = wall.height = wall.offsetHeight * dpr;
      ctx.clearRect(0, 0, w, h);
    }

    /* a stroke is a wandering spray line with randomized curvature */
    function spawnStroke(x, y, fromPointer) {
      strokes.push({
        x: x ?? Math.random() * w,
        y: y ?? Math.random() * h,
        angle: Math.random() * Math.PI * 2,
        turn: (Math.random() - 0.5) * 0.14,
        width: (fromPointer ? 10 : 6 + Math.random() * 16) * dpr,
        color: fromPointer ? '#E9C800' : COLORS[Math.floor(Math.random() * COLORS.length)],
        life: fromPointer ? 30 : 60 + Math.random() * 120,
        alpha: fromPointer ? 0.5 : 0.16 + Math.random() * 0.2,
      });
    }

    // fade the whole wall very slowly so old paint dissolves
    function frame() {
      ctx.fillStyle = 'rgba(244, 243, 238, 0.02)';
      ctx.fillRect(0, 0, w, h);

      // advance strokes
      for (let i = strokes.length - 1; i >= 0; i--) {
        const s = strokes[i];
        const nx = s.x + Math.cos(s.angle) * 3 * dpr;
        const ny = s.y + Math.sin(s.angle) * 3 * dpr;
        ctx.strokeStyle = s.color;
        ctx.globalAlpha = s.alpha;
        ctx.lineCap = 'round';
        ctx.lineWidth = s.width * (0.85 + Math.random() * 0.3);
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(nx, ny); ctx.stroke();
        ctx.globalAlpha = 1;
        // occasionally shed a drip
        if (Math.random() < 0.05 && s.color !== '#0A0A0A') {
          drips.push({ x: nx, y: ny, vy: 0.4 * dpr, len: 0, max: (16 + Math.random() * 40) * dpr, color: s.color, alpha: s.alpha });
        }
        s.x = nx; s.y = ny;
        s.angle += s.turn + (Math.random() - 0.5) * 0.08;
        if (--s.life <= 0 || s.x < -50 || s.x > w + 50 || s.y < -50 || s.y > h + 50) strokes.splice(i, 1);
      }

      // drips slide down
      for (let i = drips.length - 1; i >= 0; i--) {
        const d = drips[i];
        ctx.strokeStyle = d.color;
        ctx.globalAlpha = d.alpha * 0.8;
        ctx.lineWidth = 2.4 * dpr;
        ctx.beginPath(); ctx.moveTo(d.x, d.y + d.len); ctx.lineTo(d.x, d.y + d.len + d.vy * 4); ctx.stroke();
        ctx.globalAlpha = 1;
        d.len += d.vy * 4;
        d.vy *= 1.01;
        if (d.len > d.max) drips.splice(i, 1);
      }

      // keep the wall alive
      if (strokes.length < 5 && Math.random() < 0.06) spawnStroke();
      requestAnimationFrame(frame);
    }

    size(); frame();
    for (let i = 0; i < 4; i++) spawnStroke();
    window.addEventListener('resize', size);

    // pointer paints directly on the wall
    let lastSpawn = 0;
    wall.addEventListener('pointermove', e => {
      const r = wall.getBoundingClientRect();
      pointer.x = (e.clientX - r.left) * dpr;
      pointer.y = (e.clientY - r.top) * dpr;
      const now = performance.now();
      if (now - lastSpawn > 90) { spawnStroke(pointer.x, pointer.y, true); lastSpawn = now; }
    });
  }

  /* ======================================================================
     8. WORK CARD CANVASES — halftone dot walls, animated, per-palette
  ====================================================================== */
  const PALETTES = [
    ['#F4D823', '#0A0A0A'], ['#0A0A0A', '#F4D823'],
    ['#FBE873', '#141414'], ['#141414', '#FFE94d'],
  ];
  $$('.card-canvas').forEach(cv => {
    const ctx = cv.getContext('2d');
    const [bg, fg] = PALETTES[parseInt(cv.dataset.grad, 10) % PALETTES.length];
    let w, h, dpr, t = Math.random() * 100;
    function size() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = cv.width = cv.offsetWidth * dpr; h = cv.height = cv.offsetHeight * dpr;
    }
    function frame() {
      t += 0.012;
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      // halftone grid whose dot size ondulates like a wave crossing the wall
      const step = 26 * dpr;
      ctx.fillStyle = fg;
      for (let y = step / 2; y < h; y += step) {
        for (let x = step / 2; x < w; x += step) {
          const wave = Math.sin(x * 0.012 / dpr + t * 2) + Math.cos(y * 0.014 / dpr - t * 1.4);
          const r = clamp((wave + 2) / 4, 0.05, 1) * step * 0.38;
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        }
      }
      requestAnimationFrame(frame);
    }
    size();
    if (!RM) frame(); else { ctx.fillStyle = bg; ctx.fillRect(0, 0, cv.width, cv.height); }
    window.addEventListener('resize', size);
  });

  // 3D tilt on cards
  if (!TOUCH) {
    $$('[data-tilt]').forEach(card => {
      const media = $('.card-media', card);
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        media.style.transform = `perspective(900px) rotateY(${px * 9}deg) rotateX(${-py * 9}deg)`;
      });
      card.addEventListener('pointerleave', () => {
        media.style.transition = 'transform .6s cubic-bezier(.34,1.56,.64,1)';
        media.style.transform = '';
        setTimeout(() => (media.style.transition = ''), 600);
      });
    });
  }

  /* ======================================================================
     9. REVEALS / SCRAMBLE / COUNTERS
  ====================================================================== */
  const revIO = new IntersectionObserver((ents) => {
    ents.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target;
      el.classList.add('in');
      if (el.hasAttribute('data-scramble') && !RM) scramble(el);
      revIO.unobserve(el);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -60px 0px' });
  $$('[data-reveal]').forEach(el => { if (!el.closest('.hero')) revIO.observe(el); });

  const cIO = new IntersectionObserver((ents) => {
    ents.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target, target = +el.dataset.count, start = performance.now(), dur = 1500;
      (function step(now) {
        const p = clamp((now - start) / dur, 0, 1);
        el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target);
        if (p < 1) requestAnimationFrame(step);
      })(start);
      cIO.unobserve(el);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach(el => cIO.observe(el));

  /* ======================================================================
     10. MANIFESTO — word lighting
  ====================================================================== */
  const mText = $('[data-words]');
  if (mText) {
    const words = mText.textContent.trim().split(/\s+/);
    mText.textContent = '';
    words.forEach(word => {
      const s = document.createElement('span');
      s.className = 'w' + (word.includes('NOUS') ? ' nous' : '');
      s.textContent = word + ' ';
      mText.appendChild(s);
    });
    const wEls = $$('.w', mText);
    function update() {
      const r = mText.getBoundingClientRect();
      const prog = clamp((innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35), 0, 1);
      const lit = Math.floor(prog * wEls.length);
      wEls.forEach((w, i) => w.classList.toggle('lit', i < lit));
    }
    let queued = false;
    const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(() => { update(); queued = false; }); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    setInterval(onScroll, 100);
    update();
  }

  /* ======================================================================
     11. ACCORDION
  ====================================================================== */
  $$('.acc-row').forEach(row => {
    $('.acc-head', row).addEventListener('click', () => {
      const open = row.classList.contains('open');
      $$('.acc-row').forEach(r => r.classList.remove('open'));
      if (!open) row.classList.add('open');
    });
  });

  /* ======================================================================
     12. HEADER hide/show + mobile menu
  ====================================================================== */
  const header = $('#header');
  let lastY = 0;
  (function headerWatch() {
    const y = Scroll.y;
    if (y > lastY && y > 160) header.classList.add('hide');
    else header.classList.remove('hide');
    lastY = y;
    requestAnimationFrame(headerWatch);
  })();

  const burger = $('#burger'), menu = $('#menu');
  function toggleMenu(force) {
    const open = force ?? !menu.classList.contains('open');
    menu.classList.toggle('open', open);
    burger.classList.toggle('open', open);
    document.body.classList.toggle('no-scroll', open && (TOUCH || RM));
  }
  burger.addEventListener('click', () => toggleMenu());
  $$('#menu a').forEach(a => a.addEventListener('click', () => toggleMenu(false)));

  /* ======================================================================
     13. ANCHORS
  ====================================================================== */
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      const tgt = $(id);
      if (!tgt) return;
      e.preventDefault();
      const top = tgt.getBoundingClientRect().top + (TOUCH || RM ? window.scrollY : scrollCurrent);
      window.scrollTo({ top: top - 40, behavior: (TOUCH || RM) ? 'smooth' : 'auto' });
    });
  });

  /* ======================================================================
     14. CONVERSATIONAL FORM
  ====================================================================== */
  const chat = $('#chat');
  if (chat) {
    const steps = $$('.chat-step', chat);
    const show = n => steps.forEach(s => s.classList.toggle('is-active', s.dataset.step === String(n)));
    $$('.chat-go[data-next]', chat).forEach(btn => {
      btn.addEventListener('click', () => {
        const cur = btn.closest('.chat-step');
        const inp = $('input, textarea', cur);
        if (inp && !inp.checkValidity()) { inp.reportValidity(); return; }
        const next = btn.dataset.next;
        show(next);
        const ni = $(`[data-step="${next}"] input, [data-step="${next}"] textarea`, chat);
        if (ni) setTimeout(() => ni.focus(), 460);
      });
    });
    chat.addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#cf-name').value.trim() || 'toi';
      $('#cf-namecheck').textContent = name;
      show(4);
      /* Hook: brancher un vrai endpoint ici (Formspree / EmailJS / fetch). */
    });
  }

  /* ======================================================================
     15. MINI-GAME — Le Labyrinthe NOUS.
     Procedural maze (recursive backtracker), animated player, confetti win
  ====================================================================== */
  const maze = $('#mazeCanvas');
  if (maze) {
    const mctx = maze.getContext('2d');
    const winBox = $('#mazeWin'), timeEl = $('#gameTime'), movesEl = $('#gameMoves'), scoreEl = $('#mazeScore');
    const COLS = 15, ROWS = 11;
    let dpr, cw, ch, cell, grid, player, goal, moves, startTime, timerId, won, confetti;

    /* ---- maze generation: recursive backtracker ---- */
    function genMaze() {
      grid = Array.from({ length: ROWS }, () =>
        Array.from({ length: COLS }, () => ({ t: 1, r: 1, b: 1, l: 1, seen: false })));
      const stack = [[0, 0]];
      grid[0][0].seen = true;
      while (stack.length) {
        const [cx, cy] = stack[stack.length - 1];
        const nbs = [
          [cx, cy - 1, 't', 'b'], [cx + 1, cy, 'r', 'l'],
          [cx, cy + 1, 'b', 't'], [cx - 1, cy, 'l', 'r'],
        ].filter(([nx, ny]) => nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && !grid[ny][nx].seen);
        if (!nbs.length) { stack.pop(); continue; }
        const [nx, ny, wall, opp] = nbs[Math.floor(Math.random() * nbs.length)];
        grid[cy][cx][wall] = 0;
        grid[ny][nx][opp] = 0;
        grid[ny][nx].seen = true;
        stack.push([nx, ny]);
      }
    }

    /* ---- sizing ---- */
    function sizeMaze() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      const cssW = maze.parentElement.clientWidth - 6; // inside the border
      cell = Math.floor(cssW / COLS);
      cw = cell * COLS; ch = cell * ROWS;
      maze.style.height = (ch) + 'px';
      maze.width = cw * dpr; maze.height = ch * dpr;
      mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /* ---- state ---- */
    function resetGame() {
      genMaze();
      player = { x: 0, y: 0, px: 0, py: 0 };      // grid pos + pixel-lerped pos
      goal = { x: COLS - 1, y: ROWS - 1 };
      moves = 0; won = false; confetti = [];
      movesEl.textContent = '0';
      winBox.classList.remove('show');
      winBox.setAttribute('aria-hidden', 'true');
      startTime = performance.now();
      clearInterval(timerId);
      timerId = setInterval(() => {
        if (won) return;
        const s = Math.floor((performance.now() - startTime) / 1000);
        timeEl.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
      }, 500);
      timeEl.textContent = '00:00';
    }

    /* ---- movement ---- */
    const DIRS = { up: [0, -1, 't'], down: [0, 1, 'b'], left: [-1, 0, 'l'], right: [1, 0, 'r'] };
    function move(dir) {
      if (won) return;
      const [dx, dy, wall] = DIRS[dir];
      const c = grid[player.y][player.x];
      if (c[wall]) { bump(dir); return; }             // wall hit
      player.x += dx; player.y += dy;
      moves++; movesEl.textContent = moves;
      if (player.x === goal.x && player.y === goal.y) winGame();
    }
    let bumpAnim = 0, bumpDir = null;
    function bump(dir) { bumpAnim = 1; bumpDir = dir; }

    function winGame() {
      won = true;
      const s = Math.floor((performance.now() - startTime) / 1000);
      scoreEl.textContent = `${moves} pas · ${s}s`;
      // confetti burst from goal cell
      const gx = goal.x * cell + cell / 2, gy = goal.y * cell + cell / 2;
      for (let i = 0; i < 90; i++) {
        const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 6;
        confetti.push({
          x: gx, y: gy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 3,
          rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
          size: 3 + Math.random() * 6, life: 1,
          color: Math.random() < 0.7 ? '#F4D823' : (Math.random() < 0.5 ? '#F4F3EE' : '#E9C800'),
        });
      }
      setTimeout(() => {
        winBox.classList.add('show');
        winBox.setAttribute('aria-hidden', 'false');
      }, 700);
    }

    /* ---- render loop ---- */
    function drawMaze() {
      mctx.clearRect(0, 0, cw, ch);
      // concrete-dark board
      mctx.fillStyle = '#141414';
      mctx.fillRect(0, 0, cw, ch);

      // goal cell: pulsing yellow "answer" pad
      const pulse = 0.75 + Math.sin(performance.now() / 300) * 0.25;
      mctx.fillStyle = `rgba(244, 216, 35, ${0.25 * pulse})`;
      mctx.fillRect(goal.x * cell + 2, goal.y * cell + 2, cell - 4, cell - 4);
      mctx.fillStyle = '#F4D823';
      mctx.font = `700 ${Math.max(9, cell * 0.28)}px 'Archivo Black', sans-serif`;
      mctx.textAlign = 'center'; mctx.textBaseline = 'middle';
      mctx.fillText('NOUS.', goal.x * cell + cell / 2, goal.y * cell + cell / 2);

      // walls
      mctx.strokeStyle = '#F4D823';
      mctx.lineWidth = 2.5;
      mctx.lineCap = 'round';
      mctx.beginPath();
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const c = grid[y][x], X = x * cell, Y = y * cell;
          if (c.t) { mctx.moveTo(X, Y); mctx.lineTo(X + cell, Y); }
          if (c.l) { mctx.moveTo(X, Y); mctx.lineTo(X, Y + cell); }
          if (x === COLS - 1 && c.r) { mctx.moveTo(X + cell, Y); mctx.lineTo(X + cell, Y + cell); }
          if (y === ROWS - 1 && c.b) { mctx.moveTo(X, Y + cell); mctx.lineTo(X + cell, Y + cell); }
        }
      }
      mctx.stroke();

      // player: yellow paint blob, lerped toward its cell, squash on bump
      const tx = player.x * cell + cell / 2, ty = player.y * cell + cell / 2;
      player.px = lerp(player.px || tx, tx, 0.25);
      player.py = lerp(player.py || ty, ty, 0.25);
      let ox = 0, oy = 0;
      if (bumpAnim > 0) {
        const k = Math.sin(bumpAnim * Math.PI) * 4;
        if (bumpDir === 'up') oy = -k; if (bumpDir === 'down') oy = k;
        if (bumpDir === 'left') ox = -k; if (bumpDir === 'right') ox = k;
        bumpAnim -= 0.12;
      }
      const r = cell * 0.3;
      mctx.beginPath();
      mctx.arc(player.px + ox, player.py + oy, r, 0, Math.PI * 2);
      mctx.fillStyle = '#F4D823';
      mctx.shadowColor = 'rgba(244,216,35,.7)'; mctx.shadowBlur = 14;
      mctx.fill();
      mctx.shadowBlur = 0;
      mctx.beginPath();
      mctx.arc(player.px + ox - r * 0.3, player.py + oy - r * 0.3, r * 0.25, 0, Math.PI * 2);
      mctx.fillStyle = 'rgba(255,255,255,.8)';
      mctx.fill();

      // confetti
      for (let i = confetti.length - 1; i >= 0; i--) {
        const p = confetti[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.rot += p.vr; p.life -= 0.008;
        if (p.life <= 0) { confetti.splice(i, 1); continue; }
        mctx.save();
        mctx.translate(p.x, p.y); mctx.rotate(p.rot);
        mctx.globalAlpha = p.life;
        mctx.fillStyle = p.color;
        mctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        mctx.restore();
        mctx.globalAlpha = 1;
      }

      requestAnimationFrame(drawMaze);
    }

    /* ---- controls: keyboard (when maze visible), swipe, d-pad ---- */
    let gameActive = false;
    new IntersectionObserver(ents => { gameActive = ents[0].isIntersecting; }, { threshold: 0.25 })
      .observe(maze);

    const KEYS = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      z: 'up', s: 'down', q: 'left', d: 'right',
      w: 'up', a: 'left',
    };
    window.addEventListener('keydown', e => {
      const dir = KEYS[e.key];
      if (!dir || !gameActive) return;
      // don't hijack keys while typing in the contact form
      if (/INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
      e.preventDefault();
      move(dir);
    });

    // swipe (mobile)
    let sx = 0, sy = 0;
    maze.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    maze.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    }, { passive: true });

    // d-pad
    $$('#gamePad button').forEach(b => b.addEventListener('click', () => move(b.dataset.dir)));

    $('#gameReset').addEventListener('click', resetGame);
    $('#mazeReplay').addEventListener('click', resetGame);
    window.addEventListener('resize', () => { sizeMaze(); });

    sizeMaze(); resetGame(); drawMaze();
  }

  /* ======================================================================
     16. SIGNATURE DETAILS — drip progress, clock, jiggle, drag stickers,
         easter egg
  ====================================================================== */

  /* ---- scroll drip: paint runs down the left edge ---- */
  const dripLine = $('#dripLine'), dripBlob = $('#dripBlob');
  if (dripLine) {
    (function dripLoop() {
      const max = Math.max(1, document.body.scrollHeight - innerHeight);
      const p = clamp(Scroll.y / max, 0, 1);
      const px = p * (innerHeight - 20);
      // the blob wobbles more when scrolling fast, like paint about to fall
      const wob = Math.min(Math.abs(Scroll.v) * 0.4, 8);
      dripLine.style.height = px + 'px';
      dripBlob.style.transform = `translateY(${px - 6}px) scale(${1 + wob * 0.06}, ${1 + wob * 0.12})`;
      requestAnimationFrame(dripLoop);
    })();
  }

  /* ---- street clock (Paris time) ---- */
  const clock = $('#clock');
  if (clock) {
    const fmt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const tickClock = () => { clock.textContent = fmt.format(new Date()); };
    tickClock();
    setInterval(tickClock, 1000);
  }

  /* ---- hero letters dance on hover ---- */
  if (!TOUCH) {
    $$('.hero-title .char').forEach(c => {
      c.addEventListener('mouseenter', () => {
        if (c.classList.contains('jig')) return;
        c.classList.add('jig');
        c.addEventListener('animationend', () => c.classList.remove('jig'), { once: true });
      });
    });
  }

  /* ---- stickers: grab, throw, elastic return ---- */
  $$('.sticker').forEach(st => {
    let ox = 0, oy = 0, sx = 0, sy = 0, vx = 0, vy = 0, lx = 0, ly = 0;
    let dragging = false, raf;

    function onMove(e) {
      if (!dragging) return;
      const nx = e.clientX - sx, ny = e.clientY - sy;
      vx = nx - lx; vy = ny - ly; lx = nx; ly = ny;
      ox = nx; oy = ny;
      st.style.transform = `translate(${ox}px, ${oy}px) rotate(${clamp(vx * 1.2, -20, 20)}deg)`;
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      window.removeEventListener('pointermove', onMove);
      // throw: keep momentum, decay, then spring home
      // ('grabbed' stays on until home so the wobble animation
      //  doesn't override the inline transform mid-flight)
      (function fling() {
        vx *= 0.92; vy = vy * 0.92 + 0.5;           // gravity pulls a bit
        ox += vx; oy += vy;
        st.style.transform = `translate(${ox}px, ${oy}px) rotate(${clamp(vx * 2, -30, 30)}deg)`;
        if (Math.abs(vx) > 0.3 || Math.abs(vy) > 0.3) raf = requestAnimationFrame(fling);
        else {
          st.style.transition = 'transform .9s cubic-bezier(.34,1.56,.64,1)';
          st.style.transform = 'translate(0,0) rotate(0)';
          setTimeout(() => {
            st.style.transition = '';
            st.classList.remove('grabbed');
            ox = oy = 0;
          }, 900);
        }
      })();
    }
    st.addEventListener('pointerdown', e => {
      e.preventDefault();
      cancelAnimationFrame(raf);
      dragging = true;
      st.classList.add('grabbed');
      st.style.transition = '';
      sx = e.clientX - ox; sy = e.clientY - oy;
      lx = ox; ly = oy; vx = vy = 0;
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp, { once: true });
    });
  });

  /* ---- easter egg: type "nous" anywhere → paint splash ---- */
  const splash = $('#splash');
  if (splash) {
    let buffer = '';
    window.addEventListener('keydown', e => {
      if (/INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
      if (e.key.length !== 1) return;
      buffer = (buffer + e.key.toLowerCase()).slice(-4);
      if (buffer === 'nous' && !splash.classList.contains('pop')) {
        splash.classList.add('pop');
        splash.setAttribute('aria-hidden', 'false');
        setTimeout(() => {
          splash.classList.remove('pop');
          splash.setAttribute('aria-hidden', 'true');
        }, 1750);
      }
    });
  }

  /* ======================================================================
     17. MISC + boot
  ====================================================================== */
  $('#year').textContent = new Date().getFullYear();
  registerParallax();
  registerDraw();
  initSmooth();
  initNativeBus();
})();
