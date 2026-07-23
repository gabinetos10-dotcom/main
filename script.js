/* ══════════════════════════════════════════════════════════════
   LOC'N'JOY — interactions
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Nav : état au défilement ─────────────────────────── */
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 10);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ── Menu mobile ──────────────────────────────────────── */
  const burger = document.getElementById('burger');
  const menu = document.getElementById('mobileMenu');
  const toggle = (open) => {
    const show = open ?? menu.hidden;
    menu.hidden = !show;
    burger.setAttribute('aria-expanded', String(show));
  };
  burger.addEventListener('click', () => toggle());
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => toggle(false)));

  /* ── Révélations au défilement (cascade) ──────────────── */
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

  /* ── Silhouettes SVG (galerie) ────────────────────────── */
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
  }));

  /* ── Newsletter ───────────────────────────────────────── */
  const news = document.getElementById('news');
  const ok = document.getElementById('newsOk');
  if (news) news.addEventListener('submit', (e) => { e.preventDefault(); news.hidden = true; ok.hidden = false; });
})();
