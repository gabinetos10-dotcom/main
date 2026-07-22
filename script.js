/* =====================================================================
   MAISON JOLIE — script.js
   Preloader · Custom cursor · Mini-game · Parallax · Scroll reveal ·
   Portfolio drag · Multi-step form · Petal celebration
   Pure Vanilla JS (ES6+)
   ===================================================================== */
(() => {
  'use strict';

  const $  = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const lerp = (a, b, t) => a + (b - a) * t;

  /* =================================================================
     1. PRELOADER  — counter 0→100, then curtain reveal
     ================================================================= */
  const Preloader = (() => {
    const el = $('#preloader');
    const countEl = $('#preloaderCount');
    const fillEl = $('#preloaderFill');
    let done = false;

    function finish() {
      if (done) return;
      done = true;
      el.classList.add('is-leaving');
      document.body.classList.add('ready');
      // Remove from flow after curtain animation
      setTimeout(() => el.classList.add('is-done'), 1000);
      startExperience();
    }

    function run() {
      if (REDUCED) {            // Respect reduced motion: skip the show
        countEl.textContent = '100%';
        fillEl.style.width = '100%';
        setTimeout(finish, 300);
        return;
      }
      const duration = 2600;
      const start = performance.now();
      (function tick(now) {
        const p = clamp((now - start) / duration, 0, 1);
        // easeOutCubic for a graceful climb
        const eased = 1 - Math.pow(1 - p, 3);
        const pct = Math.round(eased * 100);
        countEl.textContent = pct + '%';
        fillEl.style.width = pct + '%';
        if (p < 1) requestAnimationFrame(tick);
        else setTimeout(finish, 350);
      })(start);
    }

    // Absolute safety net: never trap the user behind the loader
    window.addEventListener('load', () => setTimeout(() => { if (!done) finish(); }, 4200));
    document.addEventListener('DOMContentLoaded', run);
    return { finish };
  })();

  /* =================================================================
     2. CUSTOM CURSOR — dual layer, magnetic, contextual labels
     ================================================================= */
  function initCursor() {
    if (!FINE_POINTER || REDUCED) return;
    document.body.classList.add('has-cursor');

    const dot = $('#cursorDot');
    const ring = $('#cursorRing');
    const label = $('#cursorLabel');

    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let rx = mx, ry = my;

    window.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    });

    (function render() {
      rx = lerp(rx, mx, 0.18);
      ry = lerp(ry, my, 0.18);
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      requestAnimationFrame(render);
    })();

    // Hover targets
    const hoverSel = 'a, button, [data-cursor], [data-magnetic], input, textarea, .opt, .story-card, .frame, .chip';
    document.addEventListener('mouseover', (e) => {
      const t = e.target.closest(hoverSel);
      if (!t) return;
      document.body.classList.add('cursor-hover');
      const text = t.getAttribute('data-cursor');
      if (text) { label.textContent = text; document.body.classList.add('cursor-has-label'); }
      else { document.body.classList.remove('cursor-has-label'); }
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(hoverSel)) {
        document.body.classList.remove('cursor-hover', 'cursor-has-label');
      }
    });

    // Magnetic pull for [data-magnetic]
    $$('[data-magnetic]').forEach((el) => {
      const strength = 0.35;
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) * strength;
        const y = (e.clientY - (r.top + r.height / 2)) * strength;
        el.style.transform = `translate(${x}px, ${y}px)`;
        const blob = el.querySelector('.btn__blob');
        if (blob) { blob.style.setProperty('--mx', (e.clientX - r.left) + 'px'); blob.style.setProperty('--my', (e.clientY - r.top) + 'px'); }
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* =================================================================
     3. NAV — sticky state, mobile menu, smooth anchors
     ================================================================= */
  function initNav() {
    const nav = $('#nav');
    const burger = $('#navBurger');
    const links = $('#navLinks');

    const onScroll = () => nav.classList.toggle('is-stuck', window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const closeMenu = () => { nav.classList.remove('menu-open'); burger.setAttribute('aria-expanded', 'false'); };
    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('menu-open');
      burger.setAttribute('aria-expanded', String(open));
    });
    $$('#navLinks a').forEach((a) => a.addEventListener('click', closeMenu));

    // Smooth scroll for all in-page anchors
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (id.length < 2) return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
      });
    });
  }

  /* =================================================================
     4. FLOATING PETALS
     ================================================================= */
  function initPetals() {
    if (REDUCED) return;
    const wrap = $('#petals');
    const petalSVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8 6 4 8 4 13a8 8 0 0016 0c0-5-4-7-8-11z" opacity="0.85"/></svg>`;
    const colors = ['#D88A75', '#F3C77C', '#F7E1E3', '#C56F5B'];
    const COUNT = window.innerWidth < 700 ? 9 : 16;
    for (let i = 0; i < COUNT; i++) {
      const p = document.createElement('span');
      p.className = 'petal';
      p.innerHTML = petalSVG;
      const size = 10 + Math.random() * 16;
      p.style.left = Math.random() * 100 + 'vw';
      p.style.width = p.style.height = size + 'px';
      p.style.color = colors[i % colors.length];
      p.style.setProperty('--drift', (Math.random() * 160 - 80) + 'px');
      p.style.animationDuration = (10 + Math.random() * 12) + 's';
      p.style.animationDelay = (-Math.random() * 18) + 's';
      wrap.appendChild(p);
    }
  }

  /* =================================================================
     5. HERO PARALLAX — mouse-driven 3D tilt on framed gallery
     ================================================================= */
  function initHeroParallax() {
    if (!FINE_POINTER || REDUCED) return;
    const gallery = $('#heroGallery');
    if (!gallery) return;
    const items = $$('[data-depth]', gallery);
    let tx = 0, ty = 0, cx = 0, cy = 0;

    gallery.addEventListener('mousemove', (e) => {
      const r = gallery.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5);
      ty = ((e.clientY - r.top) / r.height - 0.5);
    });
    gallery.addEventListener('mouseleave', () => { tx = 0; ty = 0; });

    (function render() {
      cx = lerp(cx, tx, 0.08);
      cy = lerp(cy, ty, 0.08);
      items.forEach((el) => {
        const d = parseFloat(el.dataset.depth) || 0.05;
        const rotX = -cy * d * 120;
        const rotY = cx * d * 120;
        const moveX = cx * d * 260;
        const moveY = cy * d * 260;
        el.style.transform = `translate3d(${moveX}px, ${moveY}px, 0) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      });
      requestAnimationFrame(render);
    })();
  }

  /* =================================================================
     6. SCROLL REVEAL
     ================================================================= */
  function initReveal() {
    const els = $$('.reveal');
    if (REDUCED || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in-view'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('in-view'); io.unobserve(en.target); }
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
    els.forEach((el) => io.observe(el));
  }

  /* =================================================================
     7. SERVICES — hover / click accordion
     ================================================================= */
  function initServices() {
    const items = $$('.svc');
    const open = (svc) => { items.forEach((s) => s.classList.toggle('is-open', s === svc)); };
    items.forEach((svc) => {
      svc.addEventListener('click', () => svc.classList.toggle('is-open'));
      if (FINE_POINTER) {
        svc.addEventListener('mouseenter', () => open(svc));
      }
    });
    // On desktop, collapse all when leaving the list
    const list = $('#servicesList');
    if (FINE_POINTER && list) list.addEventListener('mouseleave', () => items.forEach((s) => s.classList.remove('is-open')));
    // Open the first by default for context
    if (items[0]) items[0].classList.add('is-open');
  }

  /* =================================================================
     8. MINI-GAME — "Find Your Wedding Vibe"
     ================================================================= */
  const Game = (() => {
    const stage = $('#gameStage');
    if (!stage) return {};
    const steps = $$('.game__step', stage);
    const dots = $$('.game__progress .step', stage);
    const backBtn = $('#gameBack');
    const hint = $('#gameHint');
    const controls = $('#gameControls');
    const result = $('.game__result', stage);
    const choices = { setting: null, mood: null, touch: null };
    let current = 0;

    // Art class per setting for the moodboard hero
    const settingArt = {
      'Château in Provence': 'art--chateau',
      'Seaside Riviera': 'art--riviera',
      'Secret Tuscan Garden': 'art--garden'
    };
    const titleMap = {
      'Château in Provence': 'Provençal',
      'Seaside Riviera': 'Riviera',
      'Secret Tuscan Garden': 'Tuscan'
    };
    const moodAdj = {
      'Golden Hour Sunset': 'Golden',
      'Pastel Romance': 'Blushing',
      'Editorial Chic': 'Modern'
    };
    // Personalised note from Éloïse, woven from all three choices
    const settingNote = {
      'Château in Provence': 'a sun-warmed château where lavender lines the drive',
      'Seaside Riviera': 'a terrace above the Mediterranean, light bouncing off the water',
      'Secret Tuscan Garden': 'a hidden garden of cypress and old roses'
    };
    const moodNote = {
      'Golden Hour Sunset': 'amber, copper and rose',
      'Pastel Romance': 'blossom, cream and soft sky',
      'Editorial Chic': 'ivory, ink and terracotta'
    };
    const touchNote = {
      'Champagne Tower': 'a champagne tower catching the last of the light',
      'Candlelit Feast': 'a thousand candles down one impossibly long table',
      'Midnight Fireworks': 'fireworks that make the whole party gasp at midnight'
    };

    function showStep(i) {
      current = i;
      steps.forEach((s, idx) => s.classList.toggle('is-active', idx === i));
      dots.forEach((d, idx) => {
        d.classList.toggle('is-active', idx === i);
        d.classList.toggle('is-done', idx < i);
      });
      backBtn.hidden = i === 0;
      result.classList.remove('is-active');
      controls.style.display = '';
    }

    function pick(step, key, value, btn) {
      choices[key] = value;
      $$('.opt', step).forEach((o) => o.classList.toggle('is-picked', o === btn));
      hint.textContent = 'Nice choice…';
      // Auto-advance with a short, satisfying beat
      setTimeout(() => {
        if (current < steps.length - 1) { showStep(current + 1); hint.textContent = 'Tap a card to choose'; }
        else buildResult();
      }, 420);
    }

    function buildResult() {
      const title = `The ${moodAdj[choices.mood]} ${titleMap[choices.setting]}`;
      $('#moodboardTitle').textContent = title;
      const art = $('#moodboardArt');
      art.className = 'moodboard__art art ' + (settingArt[choices.setting] || 'art--chateau');
      const chips = $('#moodboardChips');
      chips.innerHTML = '';
      [choices.setting, choices.mood, choices.touch].forEach((c) => {
        const li = document.createElement('li'); li.textContent = c; chips.appendChild(li);
      });
      $('#moodboardNote').textContent =
        `I can already picture it — ${settingNote[choices.setting]}, dressed in ${moodNote[choices.mood]}, ` +
        `and then ${touchNote[choices.touch]}. This is exactly the kind of joyful, sun-drenched day we love to build. ` +
        `Let's make it yours.`;

      steps.forEach((s) => s.classList.remove('is-active'));
      dots.forEach((d) => { d.classList.add('is-done'); d.classList.remove('is-active'); });
      controls.style.display = 'none';
      result.classList.add('is-active');
      celebrate(0.6);   // gentle petal shower on reveal
    }

    // Wire options
    steps.forEach((step) => {
      $$('.opt', step).forEach((btn) => {
        btn.addEventListener('click', () => pick(step, btn.dataset.key, btn.dataset.value, btn));
      });
    });
    backBtn.addEventListener('click', () => { if (current > 0) showStep(current - 1); });

    $('#replayGame').addEventListener('click', () => {
      Object.keys(choices).forEach((k) => choices[k] = null);
      $$('.opt', stage).forEach((o) => o.classList.remove('is-picked'));
      showStep(0);
      stage.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'center' });
    });

    // Send this vibe → prefill the contact form & jump there
    $('#sendVibe').addEventListener('click', () => {
      const place = $('#fPlace');
      const vision = $('#fVision');
      if (place && choices.setting) place.value = choices.setting;
      if (vision) {
        vision.value = `Our vibe: "${$('#moodboardTitle').textContent}". ` +
          `${choices.setting} · ${choices.mood} · ${choices.touch}. Let's talk!`;
      }
      // Pre-select the matching service chip = Design & Styling by default
      $('#contact').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
      const place2 = place;
      setTimeout(() => { if (place2) place2.focus({ preventScroll: true }); }, REDUCED ? 0 : 700);
    });

    showStep(0);
    return {};
  })();

  /* =================================================================
     9. PORTFOLIO REEL — drag to scroll + progress bar
     ================================================================= */
  function initReel() {
    const reel = $('#reel');
    if (!reel) return;
    const progress = $('#reelProgress');
    let down = false, startX = 0, startScroll = 0, moved = 0;

    const setProgress = () => {
      const max = reel.scrollWidth - reel.clientWidth;
      progress.style.width = (max > 0 ? (reel.scrollLeft / max) * 100 : 0) + '%';
    };
    reel.addEventListener('scroll', setProgress, { passive: true });
    setProgress();

    reel.addEventListener('pointerdown', (e) => {
      down = true; moved = 0;
      startX = e.clientX; startScroll = reel.scrollLeft;
      reel.classList.add('is-dragging');
      reel.setPointerCapture(e.pointerId);
    });
    reel.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      reel.scrollLeft = startScroll - dx;
    });
    const end = (e) => {
      if (!down) return;
      down = false; reel.classList.remove('is-dragging');
      try { reel.releasePointerCapture(e.pointerId); } catch (_) {}
    };
    reel.addEventListener('pointerup', end);
    reel.addEventListener('pointercancel', end);
    // Prevent a drag from triggering ghost clicks on cards
    reel.addEventListener('click', (e) => { if (moved > 8) { e.preventDefault(); e.stopPropagation(); } }, true);

    // Convert vertical wheel to horizontal for a lovely desktop feel
    reel.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        reel.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    }, { passive: false });
  }

  /* =================================================================
     10. MULTI-STEP INQUIRY FORM
     ================================================================= */
  function initForm() {
    const form = $('#inquiry');
    if (!form) return;
    const fsteps = $$('.fstep', form);
    const nextBtn = $('#fNext');
    const backBtn = $('#fBack');
    const nowEl = $('#fstepNow');
    const fill = $('#fstepFill');
    const done = $('#inquiryDone');
    const nav = $('.inquiry__nav', form);
    let step = 0;

    // Budget slider live output (formatted euros)
    const budget = $('#budget');
    const budgetOut = $('#budgetOut');
    const fmt = (n) => '€' + Number(n).toLocaleString('en-US') + (Number(n) >= 200000 ? '+' : '');
    if (budget) budget.addEventListener('input', () => budgetOut.textContent = fmt(budget.value));

    // Single-select chip groups
    $$('.chips[data-single]', form).forEach((group) => {
      group.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        $$('.chip', group).forEach((c) => c.classList.toggle('is-active', c === chip));
      });
    });

    function show(i) {
      step = clamp(i, 0, fsteps.length - 1);
      fsteps.forEach((f, idx) => f.classList.toggle('is-active', idx === step));
      nowEl.textContent = step + 1;
      fill.style.width = ((step + 1) / fsteps.length) * 100 + '%';
      backBtn.hidden = step === 0;
      nextBtn.querySelector('.btn__label').textContent = step === fsteps.length - 1 ? 'Send to the Atelier' : 'Continue';
    }

    nextBtn.addEventListener('click', () => {
      if (step < fsteps.length - 1) { show(step + 1); }
      else { submit(); }
    });
    backBtn.addEventListener('click', () => show(step - 1));

    function submit() {
      nav.hidden = true;
      $$('.fstep', form).forEach((f) => f.classList.remove('is-active'));
      $('.inquiry__progress', form).style.opacity = '0.4';
      done.hidden = false;
      celebrate(1);         // full golden-petal celebration
    }

    $('#fReset').addEventListener('click', () => {
      form.reset();
      if (budget) budgetOut.textContent = fmt(budget.value);
      $$('.chip', form).forEach((c) => c.classList.remove('is-active'));
      done.hidden = true;
      nav.hidden = false;
      $('.inquiry__progress', form).style.opacity = '';
      show(0);
    });

    show(0);
  }

  /* =================================================================
     11. CELEBRATION — golden confetti + blooming petals (canvas)
     ================================================================= */
  const celebrate = (() => {
    const canvas = $('#celebrate');
    if (!canvas) return () => {};
    const ctx = canvas.getContext('2d');
    let parts = [];
    let raf = null;
    const COLORS = ['#F3C77C', '#D88A75', '#F7E1E3', '#C56F5B', '#FFF3D1'];

    function size() {
      canvas.width = window.innerWidth * devicePixelRatio;
      canvas.height = window.innerHeight * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }
    window.addEventListener('resize', size);

    function spawn(intensity) {
      const W = window.innerWidth;
      const n = Math.round(90 * intensity);
      for (let i = 0; i < n; i++) {
        parts.push({
          x: W * (0.15 + Math.random() * 0.7),
          y: -20 - Math.random() * window.innerHeight * 0.3,
          vx: (Math.random() - 0.5) * 3,
          vy: 2 + Math.random() * 4,
          size: 6 + Math.random() * 8,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.2,
          color: COLORS[(Math.random() * COLORS.length) | 0],
          petal: Math.random() > 0.4,
          life: 1
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      parts.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.rot += p.vr;
        p.vx += Math.sin(p.y * 0.01) * 0.03;   // gentle sway
        if (p.y > window.innerHeight + 40) p.life = 0;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.petal) {
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 0.6, p.size, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        }
        ctx.restore();
      });
      parts = parts.filter((p) => p.life > 0);
      if (parts.length) raf = requestAnimationFrame(draw);
      else { cancelAnimationFrame(raf); raf = null; ctx.clearRect(0, 0, canvas.width, canvas.height); }
    }

    return function fire(intensity = 1) {
      if (REDUCED) return;      // no motion for those who opt out
      size();
      spawn(intensity);
      if (!raf) raf = requestAnimationFrame(draw);
    };
  })();

  /* =================================================================
     12. FOOTER YEAR
     ================================================================= */
  function initMisc() {
    const y = $('#year');
    if (y) y.textContent = new Date().getFullYear();
  }

  /* =================================================================
     BOOT
     ================================================================= */
  // Non-preloader-dependent features can init immediately
  document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initServices();
    initReel();
    initForm();
    initMisc();
    initPetals();
  });

  // Cursor, parallax and reveals begin once the curtain lifts.
  // (Declared as a hoisted function so the Preloader can call it earlier.)
  function startExperience() {
    initCursor();
    initHeroParallax();
    initReveal();
  }
})();
