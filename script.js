/* ══════════════════════════════════════════════════════════════
   LOC'N'JOY — Interactions
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Écran de chargement + entrée ─────────────────────── */
  const preloader = document.getElementById('preloader');
  const START = Date.now();
  const MIN_SHOW = reduce ? 200 : 1500;
  let loadDone = false;
  const finishLoad = () => {
    if (loadDone) return;
    loadDone = true;
    document.body.classList.add('is-loaded');
    if (preloader) {
      preloader.classList.add('done');
      const hide = () => { preloader.style.display = 'none'; };
      preloader.addEventListener('transitionend', hide, { once: true });
      setTimeout(hide, 1100);
    }
  };
  const scheduleFinish = () =>
    setTimeout(finishLoad, Math.max(0, MIN_SHOW - (Date.now() - START)));
  if (document.readyState === 'complete') scheduleFinish();
  else window.addEventListener('load', scheduleFinish);
  setTimeout(finishLoad, 4000); // filet de sécurité

  /* ── Bascule de thème jour / nuit ─────────────────────── */
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    const root = document.documentElement;
    const setLabel = () => {
      const dark = root.getAttribute('data-theme') === 'dark';
      themeToggle.setAttribute('aria-label', dark ? 'Passer en mode jour' : 'Passer en mode nuit');
    };
    setLabel();
    themeToggle.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('lnj-theme', next); } catch (e) {}
      setLabel();
    });
  }

  /* ── Header + barre de progression de défilement ──────── */
  const header = document.getElementById('siteHeader');
  const progress = document.getElementById('scrollProgress');
  const onScroll = () => {
    const y = window.scrollY || document.documentElement.scrollTop;
    header.classList.toggle('scrolled', y > 12);
    if (progress) {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      progress.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
    }
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  /* ── Menu mobile ──────────────────────────────────────── */
  const burger = document.getElementById('burger');
  const mobileMenu = document.getElementById('mobileMenu');
  const toggleMenu = (open) => {
    const show = open ?? mobileMenu.hidden;
    mobileMenu.hidden = !show;
    burger.setAttribute('aria-expanded', String(show));
  };
  burger.addEventListener('click', () => toggleMenu());
  mobileMenu.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => toggleMenu(false))
  );

  /* ── Révélations au scroll (avec cascade) ─────────────── */
  const reveals = document.querySelectorAll('.reveal');
  // cascade : décalage selon la position parmi les frères "reveal"
  reveals.forEach((el) => {
    const sibs = Array.from(el.parentElement.children).filter((c) =>
      c.classList.contains('reveal')
    );
    const idx = sibs.indexOf(el);
    if (idx > 0) el.style.transitionDelay = Math.min(idx * 70, 420) + 'ms';
  });
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('in'));
  }

  /* ── Compteurs animés ─────────────────────────────────── */
  const fmtFr = (v, dec) =>
    v.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const runCount = (el) => {
    const to = parseFloat(el.dataset.to);
    const dec = parseInt(el.dataset.dec || '0', 10);
    if (reduce) { el.textContent = fmtFr(to, dec); return; }
    const dur = 1500, t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = fmtFr(to * eased, dec);
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = fmtFr(to, dec);
    };
    requestAnimationFrame(step);
  };
  const counts = document.querySelectorAll('.count');
  if (counts.length) {
    if ('IntersectionObserver' in window) {
      const cio = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((e) => {
            if (e.isIntersecting) { runCount(e.target); obs.unobserve(e.target); }
          });
        },
        { threshold: 0.6 }
      );
      counts.forEach((el) => cio.observe(el));
    } else {
      counts.forEach(runCount);
    }
  }

  /* ── Parallaxe souris sur la scène de Paris ───────────── */
  const scene = document.querySelector('.paris-scene');
  const heroSection = document.querySelector('.hero');
  if (scene && heroSection && !reduce && window.matchMedia('(pointer: fine)').matches) {
    let raf = 0;
    heroSection.addEventListener('mousemove', (e) => {
      const r = heroSection.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        scene.style.transform = `translate(${x * 16}px, ${y * 12}px)`;
      });
    });
    heroSection.addEventListener('mouseleave', () => {
      cancelAnimationFrame(raf);
      scene.style.transform = '';
    });
  }

  /* ── Toast ────────────────────────────────────────────── */
  let toastEl, toastTimer;
  function showToast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = '<span class="toast-dot"></span>' + msg;
    requestAnimationFrame(() => toastEl.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3800);
  }

  /* ── Barre de réservation ─────────────────────────────── */
  const booking = document.getElementById('booking');
  if (booking) {
    const start = document.getElementById('bkStart');
    const end = document.getElementById('bkEnd');
    const place = document.getElementById('bkPlace');
    const iso = (d) => d.toISOString().slice(0, 10);
    const day = 864e5;
    if (start) { start.value = iso(new Date(Date.now() + day)); start.min = iso(new Date()); }
    if (end) { end.value = iso(new Date(Date.now() + 3 * day)); end.min = iso(new Date(Date.now() + day)); }
    if (start && end) {
      start.addEventListener('change', () => {
        end.min = start.value;
        if (end.value < start.value) end.value = start.value;
      });
    }
    booking.addEventListener('submit', (e) => {
      e.preventDefault();
      if (booking.classList.contains('loading')) return;
      booking.classList.add('loading');
      setTimeout(() => {
        booking.classList.remove('loading');
        const n = 8 + Math.floor(Math.random() * 12);
        const where = place ? place.value.split('—')[0].trim() : 'Paris';
        showToast(n + ' voitures disponibles à ' + where);
        const flotte = document.getElementById('flotte');
        if (flotte) flotte.scrollIntoView({ behavior: 'smooth' });
      }, 1100);
    });
  }

  /* ── Cartes en relief 3D (suivi du curseur) ───────────── */
  const canTilt = window.matchMedia('(pointer: fine)').matches && !reduce;
  const bindTilt = (el, mx, my) => {
    el.addEventListener('mouseenter', () => el.classList.add('tilting'));
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform =
        `perspective(900px) rotateX(${(-py * my).toFixed(2)}deg) rotateY(${(px * mx).toFixed(2)}deg) translateY(-8px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.classList.remove('tilting');
      el.style.transform = '';
    });
  };
  if (canTilt) {
    document.querySelectorAll('.car-card').forEach((el) => bindTilt(el, 7, 5));
    document.querySelectorAll('.winner:not(.winner-next)').forEach((el) => bindTilt(el, 6, 4));
  }

  /* ── Carte des points de retrait ──────────────────────── */
  const mapInfo = document.getElementById('mapInfo');
  if (mapInfo) {
    const pins = document.querySelectorAll('.paris-map .pin');
    const miName = mapInfo.querySelector('.mi-name');
    const miAddr = mapInfo.querySelector('.mi-addr');
    const miHours = mapInfo.querySelector('.mi-hours');
    const miCars = mapInfo.querySelector('.mi-cars');
    const selectPin = (pin) => {
      pins.forEach((p) => p.classList.remove('is-active'));
      pin.classList.add('is-active');
      pin.parentNode.appendChild(pin); // passe au premier plan
      miName.textContent = pin.dataset.name;
      miAddr.textContent = pin.dataset.addr;
      miHours.textContent = pin.dataset.hours;
      miCars.textContent = pin.dataset.cars + ' voitures';
    };
    pins.forEach((pin) => {
      pin.addEventListener('click', () => selectPin(pin));
      pin.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectPin(pin); }
      });
    });
  }

  /* ── Carrousel de témoignages ─────────────────────────── */
  const testi = document.getElementById('testi');
  if (testi) {
    const track = document.getElementById('testiTrack');
    const dotsWrap = document.getElementById('testiDots');
    const total = track.children.length;
    let idx = 0, timer = 0;
    for (let i = 0; i < total; i++) {
      const b = document.createElement('button');
      b.className = 'testi-dot' + (i === 0 ? ' is-active' : '');
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', 'Témoignage ' + (i + 1));
      b.addEventListener('click', () => go(i, true));
      dotsWrap.appendChild(b);
    }
    const dots = dotsWrap.children;
    const go = (n, manual) => {
      idx = (n + total) % total;
      track.style.transform = 'translateX(-' + idx * 100 + '%)';
      for (let i = 0; i < total; i++) dots[i].classList.toggle('is-active', i === idx);
      if (manual) restart();
    };
    const next = () => go(idx + 1);
    const start = () => { if (!reduce) timer = setInterval(next, 5200); };
    const restart = () => { clearInterval(timer); start(); };
    testi.querySelectorAll('.testi-arrow').forEach((btn) =>
      btn.addEventListener('click', () => go(idx + parseInt(btn.dataset.dir, 10), true))
    );
    testi.addEventListener('mouseenter', () => clearInterval(timer));
    testi.addEventListener('mouseleave', start);
    start();
  }

  /* ── Bouton retour en haut ────────────────────────────── */
  const toTop = document.getElementById('toTop');
  if (toTop) {
    const tw = () => toTop.classList.toggle('show', window.scrollY > 700);
    tw();
    window.addEventListener('scroll', tw, { passive: true });
    toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));
  }

  /* ── Bandeau cookies ──────────────────────────────────── */
  const cookie = document.getElementById('cookie');
  if (cookie) {
    let saved = null;
    try { saved = localStorage.getItem('lnj-cookie'); } catch (e) {}
    if (!saved) setTimeout(() => { cookie.hidden = false; }, 1800);
    const close = (v) => { try { localStorage.setItem('lnj-cookie', v); } catch (e) {} cookie.hidden = true; };
    const acc = document.getElementById('cookieAccept');
    const ref = document.getElementById('cookieRefuse');
    if (acc) acc.addEventListener('click', () => close('accepted'));
    if (ref) ref.addEventListener('click', () => close('refused'));
  }

  /* ── Silhouettes SVG réutilisables ────────────────────── */
  const wheel = (cx, r) =>
    `<circle cx="${cx}" cy="82" r="${r}" class="s-ink"/><circle cx="${cx}" cy="82" r="${r * 0.42}" fill="#EFE7DF"/><circle cx="${cx}" cy="82" r="2.4" class="s-red"/>`;

  const silhouettes = {
    citadine: `<svg viewBox="0 0 240 110"><ellipse cx="120" cy="98" rx="96" ry="9" fill="#241C19" opacity=".1"/><path d="M32 84c-5 0-8-3-8-8v-6c0-5 4-9 9-10l17-3 13-14c4-5 10-7 16-7h35c6 0 12 3 16 9l8 12 19 3c6 1 11 6 11 12v4c0 5-4 8-9 8z" class="s-red"/><path d="M32 84c-5 0-8-3-8-8v-6c0-5 4-9 9-10l17-3 13-14c4-5 10-7 16-7h35c6 0 12 3 16 9l8 12 19 3c6 1 11 6 11 12v4c0 5-4 8-9 8z" fill="none" stroke="#241C19" stroke-width="2.6"/><path d="M74 40c-4 0-8 2-10 5l-9 12h31V40zM95 40v17h27l-7-11c-3-4-6-6-11-6z" fill="#DCEAF0" stroke="#241C19" stroke-width="2.4"/>${wheel(70, 16)}${wheel(148, 16)}</svg>`,
    berline: `<svg viewBox="0 0 240 110"><ellipse cx="120" cy="98" rx="100" ry="9" fill="#241C19" opacity=".1"/><path d="M22 84c-5 0-9-3-9-8v-6c0-5 4-9 9-10l21-4 16-14c4-4 9-6 15-6h46c6 0 12 3 16 7l12 13 21 4c6 1 11 6 11 12v4c0 5-4 8-9 8z" class="s-red"/><path d="M22 84c-5 0-9-3-9-8v-6c0-5 4-9 9-10l21-4 16-14c4-4 9-6 15-6h46c6 0 12 3 16 7l12 13 21 4c6 1 11 6 11 12v4c0 5-4 8-9 8z" fill="none" stroke="#241C19" stroke-width="2.6"/><path d="M66 42c-3 0-6 2-8 4l-9 12h35V42zM89 42v16h33l-9-11c-3-3-6-5-10-5z" fill="#DCEAF0" stroke="#241C19" stroke-width="2.4"/>${wheel(68, 16)}${wheel(156, 16)}</svg>`,
    suv: `<svg viewBox="0 0 240 110"><ellipse cx="120" cy="98" rx="102" ry="9" fill="#241C19" opacity=".1"/><path d="M20 82c-4 0-7-3-7-7V60c0-5 4-10 9-11l14-2 12-16c4-6 10-9 16-9h40c6 0 13 3 17 9l11 17 16 3c6 1 11 6 11 12v9c0 4-3 7-7 7z" class="s-red"/><path d="M20 82c-4 0-7-3-7-7V60c0-5 4-10 9-11l14-2 12-16c4-6 10-9 16-9h40c6 0 13 3 17 9l11 17 16 3c6 1 11 6 11 12v9c0 4-3 7-7 7z" fill="none" stroke="#241C19" stroke-width="2.6"/><path d="M64 33c-3 0-6 2-8 5L45 55h35V33zM90 33v22h38l-11-17c-3-3-6-5-10-5z" fill="#DCEAF0" stroke="#241C19" stroke-width="2.4"/>${wheel(66, 18)}${wheel(158, 18)}</svg>`,
    cabriolet: `<svg viewBox="0 0 240 110"><ellipse cx="120" cy="98" rx="102" ry="9" fill="#241C19" opacity=".1"/><path d="M24 86c-5 0-9-3-9-8v-7c0-5 4-9 9-10l24-6 20-7c4-2 8-2 12-2h56c7 0 13 3 17 9l7 11 16 3c6 1 10 6 10 12v3c0 5-4 8-9 8z" class="s-red"/><path d="M24 86c-5 0-9-3-9-8v-7c0-5 4-9 9-10l24-6 20-7c4-2 8-2 12-2h56c7 0 13 3 17 9l7 11 16 3c6 1 10 6 10 12v3c0 5-4 8-9 8z" fill="none" stroke="#241C19" stroke-width="2.6"/><path d="M74 55l11-7c3-2 7-2 10-2h44c5 0 6 2 3 4l-13 5z" fill="#8A0A22"/><path d="M74 55h58" stroke="#241C19" stroke-width="2.4"/>${wheel(68, 16)}${wheel(154, 16)}</svg>`,
    sportive: `<svg viewBox="0 0 240 110"><ellipse cx="120" cy="100" rx="104" ry="8" fill="#241C19" opacity=".1"/><path d="M16 88c-3 0-5-2-4-5l2-7c2-5 6-8 11-9l32-5 35-11c6-2 13-3 19-3h35c8 0 12 4 10 9l26 4c6 1 10 5 11 10 0 3-2 5-6 5z" class="s-red"/><path d="M16 88c-3 0-5-2-4-5l2-7c2-5 6-8 11-9l32-5 35-11c6-2 13-3 19-3h35c8 0 12 4 10 9l26 4c6 1 10 5 11 10 0 3-2 5-6 5z" fill="none" stroke="#241C19" stroke-width="2.6"/><path d="M88 52l8-8c3-3 7-5 12-5h34c5 0 6 3 3 5l-7 8z" fill="#DCEAF0" stroke="#241C19" stroke-width="2.4"/>${wheel(62, 17)}${wheel(166, 17)}</svg>`,
    utilitaire: `<svg viewBox="0 0 240 110"><ellipse cx="120" cy="98" rx="104" ry="9" fill="#241C19" opacity=".1"/><path d="M18 84c-4 0-7-3-7-7V44c0-5 4-9 9-9h60c5 0 10 2 13 7l14 20 66 3c6 0 11 5 11 11v1c0 5-4 8-9 8z" class="s-red"/><path d="M18 84c-4 0-7-3-7-7V44c0-5 4-9 9-9h60c5 0 10 2 13 7l14 20 66 3c6 0 11 5 11 11v1c0 5-4 8-9 8z" fill="none" stroke="#241C19" stroke-width="2.6"/><path d="M96 41v22h30l-14-19c-3-3-6-3-10-3z" fill="#DCEAF0" stroke="#241C19" stroke-width="2.4"/><rect x="24" y="42" width="60" height="20" rx="3" fill="#8A0A22"/>${wheel(64, 16)}${wheel(168, 16)}</svg>`,
  };

  /* ── Données flotte ───────────────────────────────────── */
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

  const gallery = document.getElementById('gallery');
  const washes = ['wash-1', 'wash-2', 'wash-3', 'wash-4', 'wash-5', 'wash-6'];

  const render = (cat) => {
    const list = cat === 'all' ? fleet : fleet.filter((c) => c.cats.includes(cat));
    if (!list.length) {
      gallery.innerHTML = '<p class="g-empty">Aucun modèle dans cette catégorie pour le moment.</p>';
      return;
    }
    gallery.innerHTML = list
      .map(
        (c, i) => `
      <article class="gcard" style="animation-delay:${i * 40}ms">
        <div class="gcard-media ${washes[i % washes.length]}">${silhouettes[c.sil]}</div>
        <span class="g-type">${c.type}</span>
        <h3>${c.name}</h3>
        <div class="g-foot">
          <span class="g-price">${c.price}€ <small>/jour</small></span>
          <a href="#tarifs" class="link-more" aria-label="Réserver ${c.name}">Réserver <span aria-hidden="true">→</span></a>
        </div>
      </article>`
      )
      .join('');
  };

  render('all');

  document.querySelectorAll('.cat-chips .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelector('.cat-chips .chip.is-active')?.classList.remove('is-active');
      chip.classList.add('is-active');
      render(chip.dataset.cat);
    });
  });

  /* ── FAQ : une seule ouverte à la fois ────────────────── */
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach((item) => {
    item.addEventListener('toggle', () => {
      if (item.open) {
        faqItems.forEach((other) => {
          if (other !== item) other.open = false;
        });
      }
    });
  });

  /* ── Newsletter ───────────────────────────────────────── */
  const form = document.getElementById('newsForm');
  const ok = document.getElementById('newsOk');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      form.hidden = true;
      ok.hidden = false;
    });
  }

  /* ── Année dynamique (footer déjà en 2026, garde-fou) ── */
  // (statique volontairement — évite un flash de contenu)
})();
