/* ══════════════════════════════════════════════════════════════
   LOC'N'JOY — interactions & motion
   Scroll fluide (Lenis) + animations (GSAP/ScrollTrigger),
   reproduits d'après la mécanique du site de référence.
   Dégradation propre si les librairies ne se chargent pas.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(pointer: fine)').matches;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  const useMotion = hasGSAP && !reduce;
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  /* ── Scroll fluide (Lenis) ────────────────────────────── */
  let lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true, touchMultiplier: 1.6 });
    if (useMotion) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  /* ── Nav : état au défilement ─────────────────────────── */
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('scrolled', (lenis ? lenis.scroll : window.scrollY) > 10);
  onScroll();
  (lenis ? lenis.on('scroll', onScroll) : window.addEventListener('scroll', onScroll, { passive: true }));

  /* ── Menu mobile ──────────────────────────────────────── */
  const burger = document.getElementById('burger');
  const menu = document.getElementById('mobileMenu');
  const toggle = (open) => {
    const show = open ?? menu.hidden;
    menu.hidden = !show;
    burger.setAttribute('aria-expanded', String(show));
    if (lenis) show ? lenis.stop() : lenis.start();
  };
  burger.addEventListener('click', () => toggle());

  /* ── Ancres : scroll fluide ───────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href.length < 2) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      if (!menu.hidden) toggle(false);
      if (lenis) lenis.scrollTo(target, { offset: -78, duration: 1.1 });
      else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  /* ── Galerie filtrable ────────────────────────────────── */
  const wheel = (cx, r) =>
    `<circle cx="${cx}" cy="82" r="${r}" fill="#0B0A0A"/><circle cx="${cx}" cy="82" r="${r * 0.42}" fill="#fff"/><circle cx="${cx}" cy="82" r="2.4" fill="#E4002B"/>`;
  const S = {
    citadine: `<svg viewBox="0 0 240 110"><path d="M32 84c-5 0-8-3-8-8v-6c0-5 4-9 9-10l17-3 13-14c4-5 10-7 16-7h35c6 0 12 3 16 9l8 12 19 3c6 1 11 6 11 12v4c0 5-4 8-9 8z" fill="#E4002B"/><path d="M32 84c-5 0-8-3-8-8v-6c0-5 4-9 9-10l17-3 13-14c4-5 10-7 16-7h35c6 0 12 3 16 9l8 12 19 3c6 1 11 6 11 12v4c0 5-4 8-9 8z" fill="none" stroke="#0B0A0A" stroke-width="3.4"/><path d="M74 40c-4 0-8 2-10 5l-9 12h31V40zM95 40v17h27l-7-11c-3-4-6-6-11-6z" fill="#fff" stroke="#0B0A0A" stroke-width="3.4"/>${wheel(70,16)}${wheel(148,16)}</svg>`,
    berline: `<svg viewBox="0 0 240 110"><path d="M22 84c-5 0-9-3-9-8v-6c0-5 4-9 9-10l21-4 16-14c4-4 9-6 15-6h46c6 0 12 3 16 7l12 13 21 4c6 1 11 6 11 12v4c0 5-4 8-9 8z" fill="#E4002B"/><path d="M22 84c-5 0-9-3-9-8v-6c0-5 4-9 9-10l21-4 16-14c4-4 9-6 15-6h46c6 0 12 3 16 7l12 13 21 4c6 1 11 6 11 12v4c0 5-4 8-9 8z" fill="none" stroke="#0B0A0A" stroke-width="3.4"/><path d="M66 42c-3 0-6 2-8 4l-9 12h35V42zM89 42v16h33l-9-11c-3-3-6-5-10-5z" fill="#fff" stroke="#0B0A0A" stroke-width="3.4"/>${wheel(68,16)}${wheel(156,16)}</svg>`,
    suv: `<svg viewBox="0 0 240 110"><path d="M20 82c-4 0-7-3-7-7V60c0-5 4-10 9-11l14-2 12-16c4-6 10-9 16-9h40c6 0 13 3 17 9l11 17 16 3c6 1 11 6 11 12v9c0 4-3 7-7 7z" fill="#E4002B"/><path d="M20 82c-4 0-7-3-7-7V60c0-5 4-10 9-11l14-2 12-16c4-6 10-9 16-9h40c6 0 13 3 17 9l11 17 16 3c6 1 11 6 11 12v9c0 4-3 7-7 7z" fill="none" stroke="#0B0A0A" stroke-width="3.4"/><path d="M64 33c-3 0-6 2-8 5L45 55h35V33zM90 33v22h38l-11-17c-3-3-6-5-10-5z" fill="#fff" stroke="#0B0A0A" stroke-width="3.4"/>${wheel(66,18)}${wheel(158,18)}</svg>`,
    cabriolet: `<svg viewBox="0 0 240 110"><path d="M24 86c-5 0-9-3-9-8v-7c0-5 4-9 9-10l24-6 20-7c4-2 8-2 12-2h56c7 0 13 3 17 9l7 11 16 3c6 1 10 6 10 12v3c0 5-4 8-9 8z" fill="#E4002B"/><path d="M24 86c-5 0-9-3-9-8v-7c0-5 4-9 9-10l24-6 20-7c4-2 8-2 12-2h56c7 0 13 3 17 9l7 11 16 3c6 1 10 6 10 12v3c0 5-4 8-9 8z" fill="none" stroke="#0B0A0A" stroke-width="3.4"/><path d="M74 55l11-7c3-2 7-2 10-2h44c5 0 6 2 3 4l-13 5z" fill="#B7001F"/><path d="M74 55h58" stroke="#0B0A0A" stroke-width="3.4"/>${wheel(68,16)}${wheel(154,16)}</svg>`,
    sportive: `<svg viewBox="0 0 240 110"><path d="M16 88c-3 0-5-2-4-5l2-7c2-5 6-8 11-9l32-5 35-11c6-2 13-3 19-3h35c8 0 12 4 10 9l26 4c6 1 10 5 11 10 0 3-2 5-6 5z" fill="#E4002B"/><path d="M16 88c-3 0-5-2-4-5l2-7c2-5 6-8 11-9l32-5 35-11c6-2 13-3 19-3h35c8 0 12 4 10 9l26 4c6 1 10 5 11 10 0 3-2 5-6 5z" fill="none" stroke="#0B0A0A" stroke-width="3.4"/><path d="M88 52l8-8c3-3 7-5 12-5h34c5 0 6 3 3 5l-7 8z" fill="#fff" stroke="#0B0A0A" stroke-width="3.4"/>${wheel(62,17)}${wheel(166,17)}</svg>`,
    utilitaire: `<svg viewBox="0 0 240 110"><path d="M18 84c-4 0-7-3-7-7V44c0-5 4-9 9-9h60c5 0 10 2 13 7l14 20 66 3c6 0 11 5 11 11v1c0 5-4 8-9 8z" fill="#E4002B"/><path d="M18 84c-4 0-7-3-7-7V44c0-5 4-9 9-9h60c5 0 10 2 13 7l14 20 66 3c6 0 11 5 11 11v1c0 5-4 8-9 8z" fill="none" stroke="#0B0A0A" stroke-width="3.4"/><path d="M96 41v22h30l-14-19c-3-3-6-3-10-3z" fill="#fff" stroke="#0B0A0A" stroke-width="3.4"/><rect x="24" y="42" width="60" height="20" rx="3" fill="#B7001F"/>${wheel(64,16)}${wheel(168,16)}</svg>`,
  };
  const fleet = [
    { name: 'La Pigalle', type: 'Citadine · Électrique', price: 39, sil: 'citadine', cats: ['citadine', 'electrique'] },
    { name: 'Le Faubourg', type: 'Berline · Confort', price: 59, sil: 'berline', cats: ['berline', 'familiale'] },
    { name: 'La Bastille', type: 'SUV · Familial', price: 69, sil: 'suv', cats: ['suv', 'familiale'] },
    { name: 'Le Cabriolet Rivoli', type: 'Cabriolet · Balade', price: 89, sil: 'cabriolet', cats: ['cabriolet', 'prestige'] },
    { name: 'La Sorbonne', type: 'Compacte · Hybride', price: 45, sil: 'citadine', cats: ['citadine', 'familiale'] },
    { name: 'Le Bolide Vendôme', type: 'Sportive · Prestige', price: 149, sil: 'sportive', cats: ['sportive', 'prestige'] },
    { name: "L'Opéra", type: 'Berline · Électrique', price: 79, sil: 'berline', cats: ['berline', 'electrique', 'prestige'] },
    { name: 'Le Montparnasse', type: 'SUV · 7 places', price: 89, sil: 'suv', cats: ['suv', 'familiale'] },
    { name: 'La Nation', type: 'Utilitaire · Déménagement', price: 55, sil: 'utilitaire', cats: ['utilitaire'] },
    { name: 'Le Trocadéro', type: 'Cabriolet · Sportif', price: 179, sil: 'cabriolet', cats: ['cabriolet', 'sportive', 'prestige'] },
    { name: 'La Villette', type: 'Citadine · Électrique', price: 35, sil: 'citadine', cats: ['citadine', 'electrique'] },
    { name: "L'Étoile", type: 'Sportive · Coupé', price: 199, sil: 'sportive', cats: ['sportive', 'prestige'] },
  ];
  const bgs = ['var(--pink)', 'var(--peach)', 'var(--yellow)', 'var(--blue)', 'var(--peri)', 'var(--rose)'];
  const gallery = document.getElementById('gallery');
  const render = (cat) => {
    const list = cat === 'all' ? fleet : fleet.filter((c) => c.cats.includes(cat));
    if (!list.length) { gallery.innerHTML = '<p class="g-empty">Aucun modèle dans cette catégorie… pour l\'instant !</p>'; return; }
    gallery.innerHTML = list.map((c, i) => `
      <article class="gcard" style="animation-delay:${i * 40}ms">
        <div class="card-media" style="--bg:${bgs[i % bgs.length]}">${S[c.sil]}</div>
        <h3>${c.name}</h3>
        <span class="g-type">${c.type}</span>
        <div class="g-foot"><span class="g-price">${c.price}€ <small style="font-weight:600;color:var(--muted)">/j</small></span><a href="#tarifs" class="more" aria-label="Réserver ${c.name}">Réserver →</a></div>
      </article>`).join('');
    if (useMotion) ScrollTrigger.refresh();
  };
  if (gallery) {
    render('all');
    document.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        document.querySelector('.chip.is-active')?.classList.remove('is-active');
        chip.classList.add('is-active');
        render(chip.dataset.cat);
      });
    });
  }

  /* ── FAQ : une seule ouverte ──────────────────────────── */
  const items = document.querySelectorAll('.faq-item');
  items.forEach((it) => it.addEventListener('toggle', () => {
    if (it.open) items.forEach((o) => { if (o !== it) o.open = false; });
    if (useMotion) ScrollTrigger.refresh();
  }));

  /* ── Newsletter ───────────────────────────────────────── */
  const news = document.getElementById('news');
  const ok = document.getElementById('newsOk');
  if (news) news.addEventListener('submit', (e) => { e.preventDefault(); news.hidden = true; ok.hidden = false; });

  /* ══════════════════════════════════════════════════════
     ANIMATIONS
     ══════════════════════════════════════════════════════ */
  const splitWords = (el) => {
    const text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.innerHTML = text.split(/\s+/)
      .map((w) => `<span class="w-outer"><span class="w-inner">${w}</span></span>`)
      .join(' ');
    return el.querySelectorAll('.w-inner');
  };

  if (useMotion) {
    /* Entrée du hero (façon SplitText) */
    const title = document.querySelector('.hero-title[data-split]');
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.12 });
    if (title) {
      const words = splitWords(title);
      tl.from(words, { yPercent: 115, duration: 0.9, stagger: 0.05 });
    }
    tl.from('.hero-sub', { y: 24, opacity: 0, duration: 0.7 }, '-=0.5')
      .from('.hero-actions > *', { y: 20, opacity: 0, duration: 0.6, stagger: 0.12 }, '-=0.4')
      .from('.hero-ship', { y: 16, opacity: 0, duration: 0.5 }, '-=0.4')
      .from('.hero-block', { scale: 0.88, autoAlpha: 0, rotate: -4, duration: 1, ease: 'back.out(1.5)' }, '-=1.1')
      .from('.sticker', { scale: 0, rotate: 35, autoAlpha: 0, duration: 0.6, ease: 'back.out(2)' }, '-=0.5');

    /* Révélations au défilement, en cascade par lot */
    gsap.set('.reveal', { opacity: 0, y: 44 });
    ScrollTrigger.batch('.reveal', {
      start: 'top 88%',
      onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.85, stagger: 0.09, ease: 'power3.out', overwrite: true }),
    });

    /* Parallaxe */
    gsap.to('.hero-block', { yPercent: -12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 } });
    const gc = document.querySelector('.giftcard');
    if (gc) gsap.fromTo(gc, { rotate: -8, y: 30 }, { rotate: -2, y: -20, ease: 'none', scrollTrigger: { trigger: gc, start: 'top bottom', end: 'bottom top', scrub: 0.8 } });
    const exm = document.querySelector('.exclu-media');
    if (exm) gsap.fromTo(exm.querySelector('.card-car'), { y: 24 }, { y: -24, ease: 'none', scrollTrigger: { trigger: exm, start: 'top bottom', end: 'bottom top', scrub: 0.8 } });

    /* Marquee piloté par la vitesse de défilement */
    const mq = document.getElementById('marquee');
    if (mq) {
      mq.style.animation = 'none';
      const half = () => mq.scrollWidth / 2;
      const loop = gsap.to(mq, { x: () => -half(), duration: 22, ease: 'none', repeat: -1, modifiers: { x: (x) => (parseFloat(x) % half()) + 'px' } });
      if (lenis) {
        const setTS = gsap.quickTo(loop, 'timeScale', { duration: 0.5, ease: 'power2' });
        let idle;
        lenis.on('scroll', ({ velocity }) => {
          const dir = velocity < 0 ? -1 : 1;
          setTS(dir * (1 + Math.min(Math.abs(velocity) / 6, 5)));
          clearTimeout(idle);
          idle = setTimeout(() => setTS(1), 180);
        });
      }
    }

    /* Boutons magnétiques (CTA principaux) */
    if (fine) {
      document.querySelectorAll('.btn-big').forEach((btn) => {
        const xTo = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power3' });
        const yTo = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power3' });
        btn.addEventListener('mousemove', (e) => {
          const r = btn.getBoundingClientRect();
          xTo((e.clientX - r.left - r.width / 2) * 0.28);
          yTo((e.clientY - r.top - r.height / 2) * 0.45);
        });
        btn.addEventListener('mouseleave', () => { xTo(0); yTo(0); });
      });
    }

    window.addEventListener('load', () => ScrollTrigger.refresh());
  } else {
    /* ── Repli sans GSAP : révélations via IntersectionObserver ── */
    root.classList.add('anim-css');
    const reveals = document.querySelectorAll('.reveal');
    reveals.forEach((el) => {
      const sibs = Array.from(el.parentElement.children).filter((c) => c.classList.contains('reveal'));
      const i = sibs.indexOf(el);
      if (i > 0) el.style.transitionDelay = Math.min(i * 70, 420) + 'ms';
    });
    if ('IntersectionObserver' in window && !reduce) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
      }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
      reveals.forEach((el) => io.observe(el));
    } else {
      reveals.forEach((el) => el.classList.add('in'));
    }
  }
})();
