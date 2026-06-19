/* ==========================================================================
   NOUS. — Main Script
   Vanilla JS — no external dependencies.
   ========================================================================== */

(() => {
  'use strict';

  /* ----------------------------------------------------------------------
     0. Utilities
  ---------------------------------------------------------------------- */
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------------------------------------------------------------------
     1. Loader
  ---------------------------------------------------------------------- */
  const loader = document.getElementById('loader');
  const loaderFill = document.getElementById('loaderFill');
  const loaderCount = document.getElementById('loaderCount');

  function runLoader() {
    let progress = 0;
    const duration = prefersReducedMotion ? 200 : 1800;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      progress = clamp(elapsed / duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const pct = Math.round(eased * 100);
      loaderFill.style.width = pct + '%';
      loaderCount.textContent = pct;

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        setTimeout(() => {
          loader.classList.add('is-done');
          document.body.classList.add('is-loaded');
          setTimeout(() => loader.remove(), 1100);
        }, 250);
      }
    }
    requestAnimationFrame(tick);
  }

  window.addEventListener('load', runLoader);
  // Safety net in case 'load' already fired or hangs on slow assets.
  setTimeout(() => { if (!document.body.classList.contains('is-loaded')) runLoader(); }, 600);

  /* ----------------------------------------------------------------------
     2. Custom Cursor
  ---------------------------------------------------------------------- */
  const cursor = document.getElementById('cursor');
  const cursorLabel = document.getElementById('cursorLabel');
  const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  if (!isTouch && cursor) {
    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let cx = mx, cy = my;

    window.addEventListener('pointermove', (e) => {
      mx = e.clientX;
      my = e.clientY;
    });

    function renderCursor() {
      cx = lerp(cx, mx, 0.18);
      cy = lerp(cy, my, 0.18);
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      requestAnimationFrame(renderCursor);
    }
    requestAnimationFrame(renderCursor);

    const labels = { view: 'Voir', cta: 'Go', plus: '+', see: 'Voir' };

    document.querySelectorAll('[data-cursor]').forEach((el) => {
      const type = el.getAttribute('data-cursor');
      el.addEventListener('mouseenter', () => {
        cursor.classList.add(`is-${type}`);
        cursorLabel.textContent = labels[type] || '';
      });
      el.addEventListener('mouseleave', () => {
        cursor.classList.remove(`is-${type}`);
        cursorLabel.textContent = '';
      });
    });
  }

  /* ----------------------------------------------------------------------
     3. Magnetic CTA
  ---------------------------------------------------------------------- */
  const magnetic = document.querySelector('.cta-magnetic');
  if (magnetic && !isTouch) {
    const inner = magnetic.querySelector('.cta-magnetic-inner');
    magnetic.addEventListener('mousemove', (e) => {
      const rect = magnetic.getBoundingClientRect();
      const relX = e.clientX - rect.left - rect.width / 2;
      const relY = e.clientY - rect.top - rect.height / 2;
      inner.style.transform = `translate(${relX * 0.35}px, ${relY * 0.5}px)`;
    });
    magnetic.addEventListener('mouseleave', () => {
      inner.style.transform = 'translate(0, 0)';
    });
  }

  /* ----------------------------------------------------------------------
     4. Hero Canvas — Particle / Wave Field
  ---------------------------------------------------------------------- */
  const canvas = document.getElementById('heroCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let w, h, particles, animFrame;
    let pointer = { x: 0, y: 0, active: false };

    function resize() {
      w = canvas.width = canvas.offsetWidth * devicePixelRatio;
      h = canvas.height = canvas.offsetHeight * devicePixelRatio;
    }

    function createParticles() {
      const count = Math.min(90, Math.floor((canvas.offsetWidth * canvas.offsetHeight) / 14000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: (Math.random() * 1.6 + 0.6) * devicePixelRatio,
        vx: (Math.random() - 0.5) * 0.25 * devicePixelRatio,
        vy: (Math.random() - 0.5) * 0.25 * devicePixelRatio,
        baseAlpha: Math.random() * 0.5 + 0.2,
      }));
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      const px = pointer.x * devicePixelRatio;
      const py = pointer.y * devicePixelRatio;

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        let alpha = p.baseAlpha;
        if (pointer.active) {
          const d = Math.hypot(p.x - px, p.y - py);
          const influence = clamp(1 - d / (260 * devicePixelRatio), 0, 1);
          alpha = clamp(alpha + influence * 0.6, 0, 1);
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(244, 216, 35, ${alpha})`;
        ctx.fill();

        // connective lines to nearby particles for a constellation feel
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dist = Math.hypot(p.x - q.x, p.y - q.y);
          if (dist < 120 * devicePixelRatio) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(244, 216, 35, ${0.06 * (1 - dist / (120 * devicePixelRatio))})`;
            ctx.lineWidth = devicePixelRatio;
            ctx.stroke();
          }
        }
      });

      animFrame = requestAnimationFrame(draw);
    }

    function init() {
      resize();
      createParticles();
    }

    init();
    if (!prefersReducedMotion) draw();

    window.addEventListener('resize', () => {
      cancelAnimationFrame(animFrame);
      init();
      if (!prefersReducedMotion) draw();
    });

    canvas.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    });
    canvas.addEventListener('pointerleave', () => { pointer.active = false; });
  }

  /* ----------------------------------------------------------------------
     5. Scroll Reveal (IntersectionObserver)
  ---------------------------------------------------------------------- */
  const revealEls = document.querySelectorAll('[data-reveal]');
  if (revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach((el) => io.observe(el));
  }

  /* ----------------------------------------------------------------------
     6. Manifesto — split text & "light up" on scroll
  ---------------------------------------------------------------------- */
  const splitTarget = document.querySelector('[data-split]');
  if (splitTarget) {
    const text = splitTarget.textContent.trim();
    splitTarget.innerHTML = '';

    // Rebuild with highlighted span preserved by re-wrapping words only.
    const words = text.split(/\s+/);
    words.forEach((word) => {
      const span = document.createElement('span');
      span.className = 'word';
      span.textContent = word + ' ';
      splitTarget.appendChild(span);
    });

    const wordEls = splitTarget.querySelectorAll('.word');

    function litUpdate() {
      const rect = splitTarget.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = clamp((vh * 0.8 - rect.top) / (rect.height + vh * 0.4), 0, 1);
      const litCount = Math.floor(progress * wordEls.length);
      wordEls.forEach((w, i) => {
        w.classList.toggle('is-lit', i < litCount);
      });
    }

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => { litUpdate(); ticking = false; });
        ticking = true;
      }
    });
    litUpdate();
  }

  /* ----------------------------------------------------------------------
     7. Stat Counters
  ---------------------------------------------------------------------- */
  const statNums = document.querySelectorAll('.stat-num');
  if (statNums.length) {
    const counted = new WeakSet();
    const statIo = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !counted.has(entry.target)) {
          counted.add(entry.target);
          const target = parseInt(entry.target.getAttribute('data-count'), 10);
          const start = performance.now();
          const dur = 1400;

          function step(now) {
            const t = clamp((now - start) / dur, 0, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            entry.target.textContent = Math.round(eased * target);
            if (t < 1) requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
        }
      });
    }, { threshold: 0.5 });

    statNums.forEach((el) => statIo.observe(el));
  }

  /* ----------------------------------------------------------------------
     8. Nav — hide on scroll down, show on scroll up
  ---------------------------------------------------------------------- */
  const nav = document.getElementById('nav');
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const current = window.scrollY;
    if (current > lastScroll && current > 140) {
      nav.classList.add('nav-hidden');
    } else {
      nav.classList.remove('nav-hidden');
    }
    lastScroll = current;
  }, { passive: true });

  /* ----------------------------------------------------------------------
     9. Mobile Menu
  ---------------------------------------------------------------------- */
  const burger = document.getElementById('navBurger');
  const mobileMenu = document.getElementById('mobileMenu');
  if (burger && mobileMenu) {
    burger.addEventListener('click', () => {
      burger.classList.toggle('is-open');
      mobileMenu.classList.toggle('is-open');
    });
    mobileMenu.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        burger.classList.remove('is-open');
        mobileMenu.classList.remove('is-open');
      });
    });
  }

  /* ----------------------------------------------------------------------
     10. Conversational Contact Form
  ---------------------------------------------------------------------- */
  const chatForm = document.getElementById('chatForm');
  if (chatForm) {
    const steps = chatForm.querySelectorAll('.chat-step');

    function goToStep(stepNum) {
      steps.forEach((s) => {
        s.classList.toggle('active', s.getAttribute('data-step') === String(stepNum));
      });
    }

    chatForm.querySelectorAll('.chat-next[data-next]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const currentStep = btn.closest('.chat-step');
        const input = currentStep.querySelector('input, textarea');
        if (input && !input.value.trim()) {
          input.focus();
          return;
        }
        goToStep(btn.getAttribute('data-next'));
        const nextStep = chatForm.querySelector(`[data-step="${btn.getAttribute('data-next')}"]`);
        const nextInput = nextStep && nextStep.querySelector('input, textarea');
        if (nextInput) setTimeout(() => nextInput.focus(), 460);
      });
    });

    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = chatForm.querySelector('#cf-name').value.trim() || 'toi';
      document.getElementById('cf-namecheck').textContent = name;
      goToStep(4);
      // Hook point: replace with real submission (fetch/EmailJS/Formspree...).
    });
  }

  /* ----------------------------------------------------------------------
     11. Footer year
  ---------------------------------------------------------------------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

})();
