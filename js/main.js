/* ==========================================================================
   NOUS. — Main Script  (vanilla JS, no dependencies)
   Modules: smooth scroll · cursor · magnetism · split/scramble text ·
            marquee · hero metaballs · card flow-fields · reveals · UI
   ========================================================================== */
(() => {
  'use strict';

  /* ---------- helpers ---------- */
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const map = (v, a, b, c, d) => c + ((v - a) / (b - a)) * (d - c);
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TOUCH = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ======================================================================
     1. LOADER
  ====================================================================== */
  const loader = $('#loader');
  const tags = ['Initialisation', 'Chargement', 'Composition', 'Bienvenue'];

  function runLoader() {
    const fill = $('#loaderFill'), count = $('#loaderCount'), tag = $('#loaderTag');
    const dur = RM ? 200 : 2000;
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
    }, 200);
  }
  window.addEventListener('load', runLoader);
  setTimeout(() => { if (!document.body.classList.contains('loaded')) runLoader(); }, 700);

  /* ======================================================================
     2. SMOOTH SCROLL (inertial, transform-based) + velocity bus
  ====================================================================== */
  const scrollEl = $('#scroll');
  let scrollTarget = 0, scrollCurrent = 0, velocity = 0;

  const Scroll = {
    get y() { return scrollCurrent; },
    get v() { return velocity; },
  };

  function initSmooth() {
    if (TOUCH || RM) return; // native scroll on touch / reduced motion
    document.body.classList.add('smooth-on');
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
      requestAnimationFrame(render);
    })();
  }
  // For touch/reduced-motion, mirror native scroll into the bus.
  function initNativeBus() {
    if (!TOUCH && !RM) return;
    const upd = () => {
      const prev = scrollCurrent;
      scrollCurrent = window.scrollY;
      velocity = scrollCurrent - prev;
    };
    window.addEventListener('scroll', upd, { passive: true });
    upd();
  }

  /* parallax elements driven by smooth scroll position */
  const parallaxItems = [];
  function registerParallax() {
    $$('[data-parallax]').forEach(el => {
      parallaxItems.push({ el, speed: parseFloat(el.dataset.parallax) || 0.1 });
    });
  }
  function applyParallax() {
    for (const p of parallaxItems) {
      const rect = p.el.getBoundingClientRect();
      const center = rect.top + rect.height / 2 - window.innerHeight / 2;
      p.el.style.transform = `translate3d(0, ${(-center * p.speed).toFixed(2)}px, 0)`;
    }
  }

  /* ======================================================================
     3. CUSTOM CURSOR (dot follows fast, ring trails)
  ====================================================================== */
  const ring = $('#cursorRing'), dot = $('#cursorDot'), cText = $('#cursorText');
  if (!TOUCH && ring) {
    document.body.classList.add('has-cursor');
    let mx = innerWidth / 2, my = innerHeight / 2;
    let rx = mx, ry = my, dx = mx, dy = my;
    let visible = false;

    window.addEventListener('pointermove', e => {
      mx = e.clientX; my = e.clientY;
      if (!visible) { visible = true; ring.classList.remove('cursor-hidden'); dot.classList.remove('cursor-hidden'); }
    });
    document.addEventListener('mouseleave', () => {
      ring.classList.add('cursor-hidden'); dot.classList.add('cursor-hidden'); visible = false;
    });

    (function renderCursor() {
      dx = lerp(dx, mx, 0.35); dy = lerp(dy, my, 0.35);
      rx = lerp(rx, mx, 0.15); ry = lerp(ry, my, 0.15);
      dot.style.transform = `translate(${dx}px, ${dy}px) translate(-50%,-50%)`;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
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
     4. MAGNETISM (buttons pull toward pointer)
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
        el.style.transition = 'transform .5s cubic-bezier(.16,1,.3,1)';
        el.style.transform = 'translate(0,0)';
        setTimeout(() => (el.style.transition = ''), 500);
      });
    });
  }

  /* ======================================================================
     5. SPLIT TEXT — hero chars + scramble headings
  ====================================================================== */
  // hero: split into chars, kept hidden until loader completes
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
    const chars = $$('.hero-title .char');
    chars.forEach((c, i) => {
      c.style.transition = 'transform .9s cubic-bezier(.16,1,.3,1)';
      c.style.transitionDelay = (i * 0.018) + 's';
      requestAnimationFrame(() => { c.style.transform = 'translateY(0)'; });
    });
    $$('.hero [data-reveal]').forEach((el, i) => {
      setTimeout(() => el.classList.add('in'), 500 + i * 120);
    });
  }

  // scramble effect on scroll-in
  const GLYPHS = '!<>-_\\/[]{}—=+*^?#nous';
  function scramble(el) {
    const final = el.dataset.text || el.textContent;
    el.dataset.text = final;
    const dur = 900, start = performance.now();
    const seeds = [...final].map(() => Math.random());
    (function tick(now) {
      const p = clamp((now - start) / dur, 0, 1);
      let out = '';
      for (let i = 0; i < final.length; i++) {
        const reveal = i / final.length;
        if (p > reveal + 0.05) out += final[i];
        else if (final[i] === ' ') out += ' ';
        else out += GLYPHS[Math.floor((seeds[i] + p * 30) * GLYPHS.length) % GLYPHS.length];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = final;
    })(start);
  }

  /* ======================================================================
     6. MARQUEE — base drift + scroll velocity boost
  ====================================================================== */
  const mTrack = $('#marqueeTrack');
  if (mTrack) {
    // duplicate content for seamless loop
    mTrack.innerHTML += mTrack.innerHTML + mTrack.innerHTML;
    let offset = 0;
    const single = mTrack.scrollWidth / 3;
    (function loop() {
      offset -= 0.6 + Math.abs(Scroll.v) * 0.25;
      if (-offset >= single) offset += single;
      mTrack.style.transform = `translateX(${offset}px)`;
      requestAnimationFrame(loop);
    })();
  }

  /* ======================================================================
     7. HERO METABALLS — interactive canvas blobs (yellow on white)
  ====================================================================== */
  const hero = $('#metaCanvas');
  if (hero && !RM) {
    const ctx = hero.getContext('2d');
    let w, h, dpr, balls, pointer = { x: -999, y: -999 };

    function size() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = hero.width = hero.offsetWidth * dpr;
      h = hero.height = hero.offsetHeight * dpr;
    }
    function build() {
      const n = 6;
      balls = Array.from({ length: n }, (_, i) => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4 * dpr, vy: (Math.random() - 0.5) * 0.4 * dpr,
        r: (90 + Math.random() * 120) * dpr,
        c: i % 3 === 0 ? '#F4D823' : i % 3 === 1 ? '#FBE873' : '#0A0A0A',
      }));
    }
    function frame() {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      for (const b of balls) {
        b.x += b.vx; b.y += b.vy;
        if (b.x < -b.r) b.x = w + b.r; if (b.x > w + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = h + b.r; if (b.y > h + b.r) b.y = -b.r;
        // gentle attraction to pointer
        if (pointer.x > -900) {
          const dxp = pointer.x * dpr - b.x, dyp = pointer.y * dpr - b.y;
          const d = Math.hypot(dxp, dyp) || 1;
          if (d < 380 * dpr) { b.x += (dxp / d) * 0.7; b.y += (dyp / d) * 0.7; }
        }
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        const isDark = b.c === '#0A0A0A';
        g.addColorStop(0, isDark ? 'rgba(10,10,10,.10)' : (b.c + 'cc'));
        g.addColorStop(1, isDark ? 'rgba(10,10,10,0)' : (b.c + '00'));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
      }
      // subtle blur via layered draw kept light for perf
      requestAnimationFrame(frame);
    }
    size(); build(); frame();
    window.addEventListener('resize', () => { size(); build(); });
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top;
    });
    hero.addEventListener('pointerleave', () => { pointer.x = pointer.y = -999; });
  }

  /* ======================================================================
     8. WORK CARDS — animated flow-field gradient canvases + tilt + reveal
  ====================================================================== */
  const PALETTES = [
    ['#F4D823', '#141414'], ['#FBE873', '#1d1d1d'],
    ['#F4D823', '#0A0A0A'], ['#FFE94d', '#161616'],
  ];
  $$('.card-canvas').forEach(cv => {
    const ctx = cv.getContext('2d');
    const [c1, c2] = PALETTES[parseInt(cv.dataset.grad, 10) % PALETTES.length];
    let w, h, dpr, t = Math.random() * 1000, run = false;
    function size() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = cv.width = cv.offsetWidth * dpr; h = cv.height = cv.offsetHeight * dpr;
    }
    function frame() {
      if (!run && !RM) { } // keep flag
      t += 0.006;
      const cx = w * (0.5 + Math.sin(t) * 0.28);
      const cy = h * (0.5 + Math.cos(t * 0.8) * 0.28);
      const g = ctx.createRadialGradient(cx, cy, 0, w / 2, h / 2, Math.max(w, h) * 0.75);
      g.addColorStop(0, c1); g.addColorStop(1, c2);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // drifting grain dots for texture
      ctx.fillStyle = 'rgba(10,10,10,.05)';
      for (let i = 0; i < 26; i++) {
        const x = ((Math.sin(i * 12.9 + t) * 0.5 + 0.5) * w);
        const y = ((Math.cos(i * 7.3 + t * 1.2) * 0.5 + 0.5) * h);
        ctx.beginPath(); ctx.arc(x, y, 1.5 * dpr, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(frame);
    }
    size(); if (!RM) frame(); else { ctx.fillStyle = c1; ctx.fillRect(0,0,cv.width,cv.height); }
    window.addEventListener('resize', size);
  });

  // 3D tilt + parallax on cards
  if (!TOUCH) {
    $$('[data-tilt]').forEach(card => {
      const media = $('.card-media', card);
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        media.style.transform = `perspective(900px) rotateY(${px * 8}deg) rotateX(${-py * 8}deg)`;
      });
      card.addEventListener('pointerleave', () => {
        media.style.transition = 'transform .6s cubic-bezier(.16,1,.3,1)';
        media.style.transform = '';
        setTimeout(() => (media.style.transition = ''), 600);
      });
    });
  }

  /* ======================================================================
     9. REVEALS / SCRAMBLE / COUNTERS via IntersectionObserver
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

  // counters
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
     10. MANIFESTO — word-by-word lighting on scroll
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
    // also tie to smooth-scroll RAF via interval-free hook
    setInterval(onScroll, 100);
    update();
  }

  /* ======================================================================
     11. ACCORDION (expertise)
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
  function headerWatch() {
    const y = Scroll.y;
    if (y > lastY && y > 160) header.classList.add('hide');
    else header.classList.remove('hide');
    lastY = y;
    requestAnimationFrame(headerWatch);
  }
  requestAnimationFrame(headerWatch);

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
     13. ANCHOR SMOOTH SCROLL (works with custom scroll)
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
      if (!(TOUCH || RM)) { scrollTarget = top - 40; } // smooth engine eases to it
    });
  });

  /* ======================================================================
     14. CONVERSATIONAL CONTACT FORM
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
      /* Hook: wire to a real endpoint (Formspree / EmailJS / fetch) here. */
    });
  }

  /* ======================================================================
     15. MISC
  ====================================================================== */
  $('#year').textContent = new Date().getFullYear();

  /* ---- boot ---- */
  registerParallax();
  initSmooth();
  initNativeBus();
})();
