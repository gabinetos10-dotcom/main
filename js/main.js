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
      scrollEl.style.transform = `translate3d(0, ${-scrollCurrent}px, 0)`;
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
     15. MISC + boot
  ====================================================================== */
  $('#year').textContent = new Date().getFullYear();
  registerParallax();
  registerDraw();
  initSmooth();
  initNativeBus();
})();
