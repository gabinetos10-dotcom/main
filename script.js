/* ============================================================
   GJS — AGENCE WEB
   Animations : GSAP + ScrollTrigger + Lenis (Three.js retiré)
   Toutes les animations utilisent transform/opacity (60fps).
   ============================================================ */
(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGsap = typeof window.gsap !== 'undefined';

  if (hasGsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  // Marqueur global : le CSS ne masque un élément « en attente d'animation »
  // que si le JS est réellement là pour le révéler.
  if (hasGsap && !REDUCED) { document.documentElement.classList.add('has-motion'); }

  // Les boutons roulent leur libellé au survol. On glisse un .btn__roll dans
  // chaque .btn__text : c'est lui qui bouge, le doublon sort par data-text.
  function setBtnLabel(el, txt) {
    if (!el) { return; }
    var roll = el.querySelector('.btn__roll');
    if (!roll) {
      roll = document.createElement('span');
      roll.className = 'btn__roll';
      el.textContent = '';
      el.appendChild(roll);
    }
    roll.textContent = txt;
    roll.setAttribute('data-text', txt);
  }
  document.querySelectorAll('.btn__text').forEach(function (el) {
    setBtnLabel(el, el.textContent.trim());
  });

  /* ============================================================
     1. LENIS — SMOOTH SCROLL
     ============================================================ */
  var lenis = null;
  if (!REDUCED && hasGsap && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  function scrollToTarget(target, offset) {
    if (lenis) {
      lenis.scrollTo(target, { offset: offset || -70, duration: 1.4 });
    } else {
      var el = typeof target === 'string' ? document.querySelector(target) : target;
      if (el === 0 || target === 0) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    }
  }

  /* ============================================================
     2. ÉTATS INITIAUX (avant l'intro du hero)
     ============================================================ */
  var introTl = null;

  function lockScroll(lock) {
    document.body.classList.toggle('is-locked', lock);
    if (lenis) { lock ? lenis.stop() : lenis.start(); }
  }

  if (hasGsap && !REDUCED) {
    gsap.set('.hero__line-inner', { yPercent: 112, y: 0 });
    gsap.set('.preloader__letter', { yPercent: 115, y: 0 });
    gsap.set('[data-intro]', { opacity: 0, y: 34 });

    introTl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
    introTl
      .to('.hero__line-inner', { yPercent: 0, duration: 1.35, stagger: 0.13 }, 0)
      .to('[data-intro]', { opacity: 1, y: 0, duration: 1.1, stagger: 0.09 }, 0.35)
      .from('.hero__mark', { opacity: 0, scale: 0.82, rotation: -25, duration: 1.7, ease: 'power3.out' }, 0.2);
  }

  /* ============================================================
     3. PRELOADER
     ============================================================ */
  var preloader = document.getElementById('preloader');
  var nav = document.getElementById('nav');

  function enterSite() {
    nav.classList.add('is-in');
    lockScroll(false);
    if (introTl) { introTl.play(); }
  }

  if (preloader && hasGsap && !REDUCED) {
    lockScroll(true);
    var counterEl = document.getElementById('counter');
    var counter = { v: 0 };

    // Tagline découpée en caractères (révélation en cascade)
    var tag = document.getElementById('preloaderTag');
    if (tag) {
      var tagChars = tag.textContent.split('');
      tag.textContent = '';
      tagChars.forEach(function (c) {
        var s = document.createElement('span');
        s.className = 'pt-char';
        s.textContent = c === ' ' ? ' ' : c;
        tag.appendChild(s);
      });
    }

    gsap.set('.preloader__letter', { yPercent: 115, y: 0, rotation: 9, transformOrigin: '0% 100%' });
    gsap.set('.preloader__bar-fill', { scaleX: 0, transformOrigin: '50% 50%' });

    var preTl = gsap.timeline({
      onComplete: function () {
        if (preloader && preloader.parentNode) { preloader.remove(); }
      }
    });
    preTl
      .to('.preloader__letter', { yPercent: 0, rotation: 0, duration: 1.05, stagger: 0.14, ease: 'expo.out' }, 0.15)
      .fromTo('.pt-char', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.016, ease: 'power2.out' }, 0.8)
      .to(counter, {
        v: 100, duration: 1.9, ease: 'power2.inOut',
        onUpdate: function () { counterEl.textContent = Math.round(counter.v); }
      }, 0.35)
      // Sortie fluide : le contenu s'efface en douceur…
      .to('.preloader__inner', { opacity: 0, y: -64, duration: 0.6, ease: 'power3.in' }, '+=0.3')
      .to(['.preloader__counter', '.preloader__skip'], { opacity: 0, duration: 0.4, ease: 'power2.in' }, '<0.05')
      // Signature finale : la ligne horizontale se trace au centre…
      .to('.preloader__bar-fill', { scaleX: 1, duration: 0.38, ease: 'power3.out' }, '-=0.05')
      // …et la couture verticale s'allume en même temps…
      .to('.preloader__panel--l', { borderRightColor: 'rgba(232, 97, 42, .8)', boxShadow: '34px 0 80px rgba(28, 22, 17, .45)', duration: 0.38, ease: 'power2.out' }, '<')
      .to('.preloader__panel--r', { borderLeftColor: 'rgba(232, 97, 42, .8)', boxShadow: '-34px 0 80px rgba(28, 22, 17, .45)', duration: 0.38, ease: 'power2.out' }, '<')
      // …puis les panneaux s'ouvrent en rideau pendant que la ligne se dissout…
      .to('.preloader__panel--l', { xPercent: -101, duration: 1.15, ease: 'expo.inOut' }, '+=0.12')
      .to('.preloader__panel--r', { xPercent: 101, duration: 1.15, ease: 'expo.inOut' }, '<0.07')
      .to('.preloader__bar-fill', { opacity: 0, duration: 0.32, ease: 'power2.in' }, '<')
      // …et le hero démarre sa cascade PENDANT l'ouverture (transition continue)
      .call(enterSite, null, '-=0.85');

    // Skip au clic
    preloader.addEventListener('click', function () {
      preloader.style.pointerEvents = 'none';
      preTl.progress(1);
    });
    // Sécurité : ne jamais rester bloqué
    setTimeout(function () { if (document.body.contains(preloader)) { preTl.progress(1); } }, 5200);
  } else {
    // Reduced motion ou GSAP absent : entrée immédiate
    if (preloader) { preloader.remove(); }
    enterSite();
  }

  /* ============================================================
     4. MARQUE SIGNATURE DU HERO
     Three.js (~600 ko) supprimé : l'astérisque est un SVG animé en CSS.
     Rien à initialiser ici — bloc conservé pour la numérotation.
     ============================================================ */


  /* ============================================================
     5. REVEALS AU SCROLL (GSAP ScrollTrigger)
     ============================================================ */
  if (hasGsap && !REDUCED) {

    // Titres de sections révélés par masque (avec légère rotation)
    gsap.utils.toArray('.reveal-line__inner').forEach(function (el) {
      gsap.fromTo(el, { yPercent: 112, rotation: 2.5, transformOrigin: '0% 100%' }, {
        yPercent: 0, rotation: 0, duration: 1.25, ease: 'expo.out',
        scrollTrigger: { trigger: el.parentElement, start: 'top 88%', once: true }
      });
    });

    // Reveals génériques : data-reveal="up|down|left|right"
    gsap.utils.toArray('[data-reveal]').forEach(function (el) {
      var dir = el.getAttribute('data-reveal') || 'up';
      var vars = { opacity: 0, duration: 1.15, ease: 'power3.out' };
      if (dir === 'down') { vars.y = -56; }
      else if (dir === 'left') { vars.x = -56; }
      else if (dir === 'right') { vars.x = 56; }
      else { vars.y = 56; }
      vars.scrollTrigger = { trigger: el, start: 'top 87%', once: true };
      gsap.from(el, vars);
    });

    // Parallax générique : data-speed="valeur" (yPercent)
    gsap.utils.toArray('[data-speed]').forEach(function (el) {
      var s = parseFloat(el.getAttribute('data-speed')) || 0;
      gsap.to(el, {
        yPercent: s, ease: 'none',
        scrollTrigger: {
          trigger: el.closest('section') || el,
          start: 'top bottom', end: 'bottom top', scrub: 1.2
        }
      });
    });

    // Projets : rideau d'ouverture, parallax, puis zoom dirigé par le curseur
    gsap.utils.toArray('.work').forEach(function (card) {
      var visual = card.querySelector('.work__visual');
      var wrap = card.querySelector('.work__visual-wrap');
      var meta = card.querySelectorAll('.work__meta > *');

      // La vignette se dévoile de bas en haut pendant que l'image se recadre :
      // deux vitesses, c'est ce qui donne la profondeur.
      gsap.timeline({ scrollTrigger: { trigger: card, start: 'top 84%', once: true } })
        .fromTo(wrap,
          { clipPath: 'inset(0% 0% 100% 0%)' },
          {
            clipPath: 'inset(0% 0% 0% 0%)', duration: 1.25, ease: 'expo.out',
            // La clip-path rognerait l'ombre portée du survol : on la libère.
            onComplete: function () { gsap.set(wrap, { clipPath: 'none' }); }
          }, 0)
        .fromTo(visual, { scale: 1.22 }, { scale: 1, duration: 1.5, ease: 'expo.out' }, 0)
        .fromTo(meta, { y: 26, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, stagger: 0.07, ease: 'power3.out' }, 0.32);

      gsap.fromTo(visual, { yPercent: -7 }, {
        yPercent: 7, ease: 'none',
        scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: 1 }
      });
      card.addEventListener('mouseenter', function () {
        gsap.to(visual, { scale: 1.13, duration: 0.8, ease: 'power3.out', overwrite: 'auto' });
      });
      card.addEventListener('mouseleave', function () {
        gsap.to(visual, { scale: 1, duration: 0.8, ease: 'power3.out', overwrite: 'auto' });
        gsap.set(visual, { transformOrigin: '50% 50%' });
      });
      // Le zoom se concentre là où pointe le curseur
      wrap.addEventListener('mousemove', function (e) {
        var r = wrap.getBoundingClientRect();
        gsap.set(visual, {
          transformOrigin: ((e.clientX - r.left) / r.width * 100) + '% ' +
                           ((e.clientY - r.top) / r.height * 100) + '%'
        });
      });
    });

    // Filet d'ouverture des têtes de section : se trace à l'entrée
    gsap.utils.toArray('.section__head, .section__label--solo').forEach(function (head) {
      ScrollTrigger.create({
        trigger: head, start: 'top 92%', once: true,
        onEnter: function () { head.classList.add('is-drawn'); }
      });
    });

    // Les points du process s'allument un à un, dans le sillage de la ligne
    gsap.utils.toArray('.process__step').forEach(function (step, i) {
      ScrollTrigger.create({
        trigger: step, start: 'top 82%', once: true,
        onEnter: function () {
          gsap.delayedCall(i * 0.12, function () { step.classList.add('is-lit'); });
        }
      });
    });

    // Ligne qui se dessine — méthode
    var processPath = document.querySelector('.process__line-path');
    if (processPath) {
      var len = processPath.getTotalLength();
      processPath.style.strokeDasharray = len;
      processPath.style.strokeDashoffset = len;
      gsap.to(processPath, {
        strokeDashoffset: 0, ease: 'none',
        scrollTrigger: { trigger: '.process__steps', start: 'top 80%', end: 'top 30%', scrub: 1 }
      });
    }
  }

  /* ============================================================
     6. MANIFESTE — RÉVÉLATION MOT PAR MOT
     ============================================================ */
  (function initManifesto() {
    var el = document.getElementById('manifestoText');
    if (!el) { return; }

    function wrapWords(node) {
      if (node.nodeType === 3) {
        var frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) { return; }
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(' '));
          } else {
            var s = document.createElement('span');
            s.className = 'w';
            s.textContent = part;
            frag.appendChild(s);
          }
        });
        node.parentNode.replaceChild(frag, node);
      } else if (node.nodeType === 1) {
        Array.prototype.slice.call(node.childNodes).forEach(wrapWords);
      }
    }
    Array.prototype.slice.call(el.childNodes).forEach(wrapWords);

    if (hasGsap && !REDUCED) {
      var words = el.querySelectorAll('.w');
      // État initial : chaque mot est basculé en arrière (rotationX), descendu,
      // flouté, avec une micro-rotation aléatoire pour casser la mécanique
      gsap.set(words, {
        opacity: 0.1, yPercent: 55, rotationX: -68,
        rotation: function () { return gsap.utils.random(-1.6, 1.6); },
        filter: 'blur(7px)', transformOrigin: '50% 100%'
      });
      gsap.to(words, {
        opacity: 1, yPercent: 0, rotationX: 0, rotation: 0, filter: 'blur(0px)',
        duration: 0.85, ease: 'power3.out',
        // Distribution non-linéaire des départs : les mots se relaient avec
        // un chevauchement organique plutôt qu'un métronome régulier
        stagger: { each: 0.05, ease: 'power1.inOut' },
        scrollTrigger: { trigger: '.manifesto', start: 'top 76%', end: 'center 40%', scrub: 1.1 }
      });
    } else {
      el.querySelectorAll('.w').forEach(function (w) { w.style.opacity = 1; });
    }
  })();

  /* ============================================================
     7. COMPTEURS ANIMÉS
     ============================================================ */
  document.querySelectorAll('[data-count]').forEach(function (el) {
    var target = parseFloat(el.getAttribute('data-count')) || 0;
    if (!hasGsap || REDUCED || !window.ScrollTrigger) {
      el.textContent = target.toLocaleString('fr-FR');
      return;
    }
    var obj = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: function () {
        gsap.to(obj, {
          v: target, duration: 2.1, ease: 'power3.out',
          onUpdate: function () { el.textContent = Math.round(obj.v).toLocaleString('fr-FR'); }
        });
      }
    });
  });

  /* ============================================================
     8. EFFETS DE SCROLL AVANCÉS
     ============================================================ */
  if (hasGsap && !REDUCED && window.ScrollTrigger) {

    // Barre de progression en haut de page
    gsap.to('.scroll-progress', {
      scaleX: 1, ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: 0.5 }
    });

    // Dérive horizontale des grands titres de sections
    gsap.utils.toArray('.section__title').forEach(function (title, i) {
      var dir = i % 2 === 0 ? 1 : -1;
      gsap.fromTo(title, { xPercent: 1.1 * dir }, {
        xPercent: -1.1 * dir, ease: 'none',
        scrollTrigger: {
          trigger: title.closest('section'),
          start: 'top bottom', end: 'bottom top', scrub: 1.2
        }
      });
    });

    // Skew des cartes projets selon la vélocité du scroll
    var proxy = { skew: 0 };
    var skewSetter = gsap.quickSetter('.work__visual-wrap', 'skewY', 'deg');
    var clampSkew = gsap.utils.clamp(-3.5, 3.5);
    ScrollTrigger.create({
      onUpdate: function (self) {
        var skew = clampSkew(self.getVelocity() / -450);
        if (Math.abs(skew) > Math.abs(proxy.skew)) {
          proxy.skew = skew;
          gsap.to(proxy, {
            skew: 0, duration: 0.75, ease: 'power3', overwrite: true,
            onUpdate: function () { skewSetter(proxy.skew); }
          });
        }
      }
    });
  }

  /* ============================================================
     9. NAVIGATION — TRANSFORMATION + MASQUAGE AU SCROLL
     ============================================================ */
  if (hasGsap && window.ScrollTrigger) {
    ScrollTrigger.create({
      start: 60, end: 'max',
      toggleClass: { targets: nav, className: 'is-scrolled' }
    });
    // La nav se masque en scrollant vers le bas, réapparaît vers le haut
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: function (self) {
        if (document.body.classList.contains('menu-open')) { return; }
        if (self.direction === 1 && self.scroll() > 420) {
          nav.classList.add('nav--hidden');
        } else {
          nav.classList.remove('nav--hidden');
        }
      }
    });
  }

  /* ============================================================
     10. MENU MOBILE
     ============================================================ */
  (function initMobileMenu() {
    var burger = document.getElementById('burger');
    var menu = document.getElementById('mobileMenu');
    if (!burger || !menu) { return; }
    var isOpen = false;

    var menuTl = null;
    if (hasGsap && !REDUCED) {
      // Cascade couleur : terracotta → camel → espresso
      menuTl = gsap.timeline({ paused: true })
        .to('.mm-panel', { yPercent: 0, duration: 0.55, stagger: 0.09, ease: 'expo.inOut' }, 0)
        .fromTo('.mobile-menu__mark', { opacity: 0, scale: .82, rotation: -50 },
          { opacity: 1, scale: 1, rotation: 0, duration: 1, ease: 'expo.out' }, 0.35)
        .fromTo('.mobile-menu__link', { y: 84, opacity: 0, rotation: 2.5 },
          { y: 0, opacity: 1, rotation: 0, duration: 0.75, stagger: 0.08, ease: 'expo.out' }, 0.42)
        .fromTo('.mobile-menu__foot', { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 0.78);
      gsap.set('.mm-panel', { yPercent: -101, y: 0 }); // départ hors écran (haut)
    }

    function openMenu() {
      isOpen = true;
      burger.classList.add('is-open');
      burger.setAttribute('aria-expanded', 'true');
      menu.classList.add('is-open');
      menu.setAttribute('aria-hidden', 'false');
      document.body.classList.add('menu-open');
      nav.classList.remove('nav--hidden');
      lockScroll(true);
      if (menuTl) { menuTl.play(0); }
    }
    function closeMenu() {
      if (!isOpen) { return; }
      isOpen = false;
      burger.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('menu-open');
      lockScroll(false);
      if (menuTl) {
        menuTl.eventCallback('onReverseComplete', function () {
          menu.classList.remove('is-open');
        });
        menuTl.reverse();
      } else {
        menu.classList.remove('is-open');
      }
    }

    burger.addEventListener('click', function () { isOpen ? closeMenu() : openMenu(); });
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeMenu(); } });
    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { closeMenu(); });
    });
  })();

  /* ============================================================
     12. PARALLAX À LA SOURIS — FORMES DU HERO
     ============================================================ */
  (function initHeroMouse() {
    if (!FINE_POINTER || !hasGsap || REDUCED) { return; }
    var hero = document.getElementById('hero');
    if (!hero) { return; }
    var shapes = hero.querySelectorAll('[data-mouse]');
    hero.addEventListener('mousemove', function (e) {
      var nx = e.clientX / window.innerWidth - 0.5;
      var ny = e.clientY / window.innerHeight - 0.5;
      shapes.forEach(function (shape) {
        var f = parseFloat(shape.getAttribute('data-mouse')) || 0.1;
        gsap.to(shape, { x: nx * f * 500, y: ny * f * 500, duration: 1.2, ease: 'power3.out' });
      });
    });
  })();

  /* ============================================================
     12 bis. BOUTONS MAGNÉTIQUES
     Le bouton vient chercher le curseur avant le clic : c'est le
     détail qui fait « fini » sans rien coûter en perf (quickTo).
     ============================================================ */
  (function initMagnetic() {
    if (!FINE_POINTER || !hasGsap || REDUCED) { return; }
    document.querySelectorAll('[data-magnetic]').forEach(function (el) {
      var xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
      var yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
      var PULL = 0.3;
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * PULL);
        yTo((e.clientY - r.top - r.height / 2) * PULL);
      });
      el.addEventListener('mouseleave', function () { xTo(0); yTo(0); });
    });
  })();

  /* ============================================================
     13. BOUTON LIQUIDE (CTA final)
     ============================================================ */
  (function initLiquid() {
    var btn = document.getElementById('liquidBtn');
    if (!btn) { return; }
    btn.addEventListener('mousemove', function (e) {
      var r = btn.getBoundingClientRect();
      btn.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      btn.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  })();

  /* ============================================================
     14. ANCRES, HORLOGE, DIVERS
     ============================================================ */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var hash = link.getAttribute('href');
      if (hash.length > 1 && document.querySelector(hash)) {
        e.preventDefault();
        scrollToTarget(hash);
      }
    });
  });

  var backToTop = document.getElementById('backToTop');
  if (backToTop) {
    backToTop.addEventListener('click', function () { scrollToTarget(0, 0); });
  }

  var clockEl = document.getElementById('clock');
  var menuClockEl = document.getElementById('menuClock');
  function updateClock() {
    var txt;
    try {
      txt = new Date().toLocaleTimeString('fr-FR', {
        timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    } catch (e) {
      txt = new Date().toLocaleTimeString('fr-FR');
    }
    if (clockEl) { clockEl.textContent = txt; }
    if (menuClockEl) { menuClockEl.textContent = txt; }
  }
  updateClock();
  setInterval(updateClock, 1000);

  var yearEl = document.getElementById('year');
  if (yearEl) { yearEl.textContent = new Date().getFullYear(); }

  /* ============================================================
     15. FORMULAIRE DE CONTACT (validation + mailto pré-rempli)
     ============================================================ */
  (function initContactForm() {
    var form = document.getElementById('contactForm');
    if (!form) { return; }
    var submitText = form.querySelector('.btn-liquid__text');
    var status = document.getElementById('formStatus');

    // Un seul canal de retour, annoncé aux lecteurs d'écran (aria-live)
    function say(msg, kind) {
      if (!status) { return; }
      status.textContent = msg;
      status.className = 'contact-form__status' + (kind ? ' is-' + kind : '');
    }

    ['fName', 'fEmail', 'fMsg'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', function () {
          el.closest('.field').classList.remove('is-error');
          if (status && status.classList.contains('is-error')) { say(''); }
        });
      }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('fName');
      var email = document.getElementById('fEmail');
      var msg = document.getElementById('fMsg');
      var first = null;

      function fail(input) {
        input.closest('.field').classList.add('is-error');
        if (!first) { first = input; }
      }
      if (!name.value.trim()) { fail(name); }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) { fail(email); }
      if (!msg.value.trim()) { fail(msg); }
      if (first) {
        say('Il manque quelques informations — les champs en orange sont à compléter.', 'error');
        first.focus();
        return;
      }

      var typeEl = form.querySelector('input[name="type"]:checked');
      var type = typeEl ? typeEl.value : 'Projet';
      var subject = 'Nouveau projet — ' + type + ' (' + name.value.trim() + ')';
      var body = 'Nom : ' + name.value.trim() +
        '\nEmail : ' + email.value.trim() +
        '\nType de projet : ' + type +
        '\n\nMessage :\n' + msg.value.trim();

      submitText.textContent = 'OUVERTURE DU MAIL…';
      say('Votre application mail s’ouvre avec le message pré-rempli. Il ne reste qu’à l’envoyer.', 'ok');
      window.location.href = 'mailto:hello@gjs-studio.fr?subject=' +
        encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      setTimeout(function () { submitText.textContent = 'ENVOYER LE MESSAGE'; }, 2600);
    });
  })();

  /* ============================================================
     15. QUI SOMMES-NOUS — ÉVENTAIL AU SCROLL + TILT 3D
     ============================================================ */
  (function initAbout() {
    if (!hasGsap || REDUCED) { return; }
    var cards = gsap.utils.toArray('.about__card');
    if (!cards.length) { return; }

    // Les cartes se déploient en éventail au scroll
    cards.forEach(function (card, i) {
      gsap.fromTo(card,
        { y: 130 + i * 45, rotation: (i - 1) * 6 },
        {
          y: 0, rotation: (i - 1) * 1.5, ease: 'none',
          scrollTrigger: { trigger: '#aboutDeck', start: 'top 92%', end: 'top 35%', scrub: 1 }
        });
    });

    // Tilt 3D suivant le curseur (desktop uniquement)
    if (FINE_POINTER) {
      cards.forEach(function (card) {
        card.addEventListener('mousemove', function (e) {
          var r = card.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - 0.5;
          var py = (e.clientY - r.top) / r.height - 0.5;
          gsap.to(card, {
            rotateY: px * 12, rotateX: -py * 12, scale: 1.03,
            duration: 0.5, ease: 'power2.out'
          });
        });
        card.addEventListener('mouseleave', function () {
          gsap.to(card, {
            rotateY: 0, rotateX: 0, scale: 1,
            duration: 0.8, ease: 'elastic.out(1, 0.6)'
          });
        });
      });
    }
  })();

  /* ============================================================
     16. MODALE LÉGALE / RGPD
     ============================================================ */
  (function initLegal() {
    var modal = document.getElementById('legalModal');
    if (!modal) { return; }
    var titleEl = document.getElementById('legalTitle');
    var bodyEl = document.getElementById('legalBody');

    var CONTENT = {
      mentions: {
        title: 'MENTIONS LÉGALES',
        html: '<h4>ÉDITEUR</h4>' +
          '<p>GJS — Agence web indépendante, Paris, France.<br>Contact : hello@gjs-studio.fr</p>' +
          '<h4>DIRECTEUR DE LA PUBLICATION</h4>' +
          '<p>L’équipe fondatrice GJS.</p>' +
          '<h4>HÉBERGEMENT</h4>' +
          '<p>Site statique hébergé sur infrastructure cloud. Aucune base de données n’est associée au site.</p>' +
          '<h4>PROPRIÉTÉ INTELLECTUELLE</h4>' +
          '<p>L’ensemble des contenus (textes, visuels, code) est la propriété de GJS © 2026. Toute reproduction sans autorisation préalable est interdite.</p>'
      },
      privacy: {
        title: 'POLITIQUE DE CONFIDENTIALITÉ',
        html: '<h4>RESPONSABLE DE TRAITEMENT</h4>' +
          '<p>GJS, Paris — hello@gjs-studio.fr</p>' +
          '<h4>DONNÉES COLLECTÉES</h4>' +
          '<p>Ce site ne collecte, ne stocke ni ne transmet aucune donnée personnelle. Le formulaire de contact ouvre simplement votre application de messagerie avec un message pré-rempli : l’envoi part de votre propre boîte mail, sans transiter par nos serveurs.</p>' +
          '<h4>COOKIES</h4>' +
          '<p>Aucun cookie de suivi ni traceur publicitaire n’est déposé sur votre appareil.</p>' +
          '<h4>VOS DROITS (RGPD)</h4>' +
          '<p>Conformément au Règlement Général sur la Protection des Données, vous disposez de droits d’accès, de rectification, d’effacement et d’opposition. Pour les exercer : hello@gjs-studio.fr. Vous pouvez également saisir la CNIL (cnil.fr).</p>'
      }
    };

    function openLegal(key) {
      var c = CONTENT[key];
      if (!c) { return; }
      titleEl.textContent = c.title;
      bodyEl.innerHTML = c.html;
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      lockScroll(true);
    }
    function closeLegal() {
      if (!modal.classList.contains('is-open')) { return; }
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      lockScroll(false);
    }

    document.querySelectorAll('[data-legal]').forEach(function (btn) {
      btn.addEventListener('click', function () { openLegal(btn.getAttribute('data-legal')); });
    });
    modal.querySelectorAll('[data-legal-close]').forEach(function (el) {
      el.addEventListener('click', closeLegal);
    });
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeLegal(); }
    });
  })();

  /* ============================================================
     17. MINI-JEU — L'ATELIER GJS (breakout des bonnes pratiques)
     ============================================================ */
  (function initGame() {
    var canvas = document.getElementById('gameCanvas');
    if (!canvas) { return; }
    var ctx = canvas.getContext('2d');
    var frame = canvas.parentElement;
    var overlay = document.getElementById('gameOverlay');
    var overlayTitle = document.getElementById('gameOverlayTitle');
    var overlayText = document.getElementById('gameOverlayText');
    var btn = document.getElementById('gameBtn');
    var scoreEl = document.getElementById('gameScore');
    var chipsGood = document.getElementById('chipsGood');
    var chipsBad = document.getElementById('chipsBad');

    // Coordonnées logiques : recalculées selon le mode (paysage desktop / portrait mobile)
    var LW = 920, LH = 580;
    var scale = 1, dpr = 1;
    var running = false, inView = true, rafId = null, lastT = 0;
    var paddle = { w: 112, h: 13, x: 0, y: 0, target: 0 };
    var ball = { x: 0, y: 0, vx: 0, vy: 0, r: 9, speed: 6.2 };
    var bricks = [], floats = [], flashes = [];
    var score = 0, goods = 0, totalGoods = 0, lostPause = 0;
    var keys = { left: false, right: false };

    var GOOD = ['SEO', 'DESIGN', 'UX', 'PERFORMANCE', 'ACCESSIBILITÉ', 'RESPONSIVE',
                'SÉCURITÉ', 'CONTENU', 'CLEAN CODE', 'LIGHTHOUSE 99', 'SÉMANTIQUE'];
    var BAD = ['TEMPLATE', 'POP-UP', 'LOREM IPSUM', 'AUTOPLAY', 'CLIPART',
               'PUBS', 'CARROUSEL', 'NOIR PUR', 'PLUGINS ×12'];
    var mode = '';
    var COLS = 5, ROWS = 4, GAP = 14, TOP = 76, SIDE = 44, BH = 48;
    var BW = 0, brickFont = 11, brickFontSm = 10, paddleW0 = 112;

    // Portrait sur mobile : terrain vertical, éléments proportionnellement plus gros
    function setMode(m) {
      mode = m;
      if (m === 'portrait') {
        LW = 560; LH = 800; COLS = 4; ROWS = 5;
        GAP = 12; TOP = 66; SIDE = 30; BH = 58;
        brickFont = 14; brickFontSm = 12;
        paddleW0 = 128; paddle.h = 16; ball.r = 13;
      } else {
        LW = 920; LH = 580; COLS = 5; ROWS = 4;
        GAP = 14; TOP = 76; SIDE = 44; BH = 48;
        brickFont = 11; brickFontSm = 10;
        paddleW0 = 112; paddle.h = 13; ball.r = 9;
      }
      BW = (LW - SIDE * 2 - GAP * (COLS - 1)) / COLS;
      paddle.w = paddleW0;
      paddle.x = LW / 2 - paddle.w / 2;
      paddle.target = paddle.x;
      paddle.y = LH - 44;
    }

    function shuffle(a) {
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    }

    function buildBricks() {
      var items = GOOD.map(function (g) { return { label: g, good: true }; })
        .concat(BAD.map(function (b) { return { label: b, good: false }; }));
      shuffle(items);
      totalGoods = GOOD.length;
      bricks = items.map(function (it, i) {
        return {
          x: SIDE + (i % COLS) * (BW + GAP),
          y: TOP + Math.floor(i / COLS) * (BH + GAP),
          w: BW, h: BH, label: it.label, good: it.good, alive: true
        };
      });
    }

    function resize() {
      var rect = frame.getBoundingClientRect();
      // Bascule paysage <-> portrait : plateau reconstruit proprement
      var newMode = rect.width < 640 ? 'portrait' : 'landscape';
      if (newMode !== mode) {
        setMode(newMode);
        buildBricks();
        goods = 0;
        resetChips();
        resetBall();
      }
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      scale = rect.width / LW;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.width * (LH / LW) * dpr);
      canvas.style.height = (rect.width * (LH / LW)) + 'px';
      render();
    }

    function resetBall() {
      ball.x = paddle.x + paddle.w / 2;
      ball.y = paddle.y - ball.r - 2;
      var angle = (-55 + Math.random() * 110) * Math.PI / 180;
      ball.vx = Math.sin(angle) * ball.speed;
      ball.vy = -Math.abs(Math.cos(angle)) * ball.speed;
      if (Math.abs(ball.vx) < 1.6) { ball.vx = 1.6 * (Math.random() < 0.5 ? -1 : 1); }
    }

    function addChip(container, label, bad) {
      var empty = container.querySelector('.game__chip-empty');
      if (empty) { empty.remove(); }
      var chip = document.createElement('span');
      chip.className = 'game__chip' + (bad ? ' game__chip--bad' : '');
      chip.textContent = label;
      container.appendChild(chip);
    }

    function resetChips() {
      chipsGood.innerHTML = '<span class="game__chip-empty">—</span>';
      chipsBad.innerHTML = '<span class="game__chip-empty">—</span>';
    }

    function setScore(v) {
      score = Math.max(0, v);
      scoreEl.textContent = score;
    }

    function endGame(win) {
      running = false;
      overlayTitle.textContent = win ? 'VOUS AVEZ L\u2019\u0152IL.' : 'SITE CASSÉ.';
      overlayText.textContent = win
        ? 'Toutes les fondations d\u2019un bon site sont réunies.'
        : 'Trop de mauvaises pratiques accumulées.';
      setBtnLabel(btn.querySelector('.btn__text'), 'Rejouer');
      overlay.classList.remove('is-hidden');
    }

    function start() {
      buildBricks();
      paddle.w = paddleW0;
      paddle.x = LW / 2 - paddle.w / 2;
      paddle.target = paddle.x;
      ball.speed = 6.2;
      floats = []; flashes = [];
      goods = 0; lostPause = 0;
      setScore(0);
      resetChips();
      resetBall();
      overlay.classList.add('is-hidden');
      running = true;
      lastT = performance.now();
      if (!rafId) { rafId = requestAnimationFrame(loop); }
    }

    function hitBrick(b) {
      b.alive = false;
      flashes.push({ x: b.x, y: b.y, w: b.w, h: b.h, good: b.good, life: 1 });
      floats.push({ x: b.x + b.w / 2, y: b.y, txt: b.good ? '+100' : '−50', good: b.good, life: 1 });
      if (b.good) {
        goods++;
        setScore(score + 100);
        paddle.w = Math.min(paddle.w + 14, LW * 0.42);
        addChip(chipsGood, b.label, false);
        if (goods === totalGoods) { endGame(true); return; }
      } else {
        setScore(score - 50);
        paddle.w = Math.max(paddle.w - 22, 30);
        addChip(chipsBad, b.label, true);
        if (paddle.w <= 30) { endGame(false); return; }
      }
      ball.speed = Math.min(ball.speed + 0.08, 9.5);
      var cur = Math.hypot(ball.vx, ball.vy) || 1;
      ball.vx = ball.vx / cur * ball.speed;
      ball.vy = ball.vy / cur * ball.speed;
    }

    function update(dt) {
      if (lostPause > 0) { lostPause -= dt; return; }

      if (keys.left) { paddle.target -= 9 * dt; }
      if (keys.right) { paddle.target += 9 * dt; }
      paddle.target = Math.max(0, Math.min(paddle.target, LW - paddle.w));
      paddle.x += (paddle.target - paddle.x) * Math.min(0.35 * dt, 1);

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
      if (ball.x > LW - ball.r) { ball.x = LW - ball.r; ball.vx = -Math.abs(ball.vx); }
      if (ball.y < ball.r) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); }

      // Raquette : angle de rebond selon le point d'impact
      if (ball.vy > 0 &&
          ball.y + ball.r >= paddle.y && ball.y - ball.r <= paddle.y + paddle.h &&
          ball.x >= paddle.x - ball.r && ball.x <= paddle.x + paddle.w + ball.r) {
        var rel = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
        var ang = rel * (Math.PI / 3.2);
        ball.vx = Math.sin(ang) * ball.speed;
        ball.vy = -Math.abs(Math.cos(ang) * ball.speed);
        ball.y = paddle.y - ball.r - 0.5;
      }

      // Briques
      for (var i = 0; i < bricks.length; i++) {
        var b = bricks[i];
        if (!b.alive) { continue; }
        var cx = Math.max(b.x, Math.min(ball.x, b.x + b.w));
        var cy = Math.max(b.y, Math.min(ball.y, b.y + b.h));
        var dx = ball.x - cx, dy = ball.y - cy;
        if (dx * dx + dy * dy <= ball.r * ball.r) {
          if (Math.abs(dx) > Math.abs(dy)) {
            ball.vx = dx > 0 ? Math.abs(ball.vx) : -Math.abs(ball.vx);
          } else {
            ball.vy = dy > 0 ? Math.abs(ball.vy) : -Math.abs(ball.vy);
          }
          hitBrick(b);
          break;
        }
      }

      // Balle perdue
      if (ball.y - ball.r > LH) {
        paddle.w = Math.max(paddle.w - 18, 30);
        floats.push({ x: LW / 2, y: LH - 120, txt: 'OUPS', good: false, life: 1 });
        if (paddle.w <= 30) { endGame(false); return; }
        lostPause = 45;
        resetBall();
      }

      floats.forEach(function (f) { f.y -= 0.7 * dt; f.life -= 0.02 * dt; });
      floats = floats.filter(function (f) { return f.life > 0; });
      flashes.forEach(function (f) { f.life -= 0.05 * dt; });
      flashes = flashes.filter(function (f) { return f.life > 0; });
    }

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function render() {
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
      ctx.clearRect(0, 0, LW, LH);

      // Grille de points discrète
      ctx.fillStyle = 'rgba(244,239,232,0.05)';
      for (var gx = 40; gx < LW; gx += 46) {
        for (var gy = 30; gy < LH; gy += 46) {
          ctx.fillRect(gx, gy, 2, 2);
        }
      }

      // Briques
      bricks.forEach(function (b) {
        if (!b.alive) { return; }
        roundRect(b.x, b.y, b.w, b.h, 9);
        ctx.fillStyle = 'rgba(244,239,232,0.05)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(244,239,232,0.22)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = 'rgba(244,239,232,0.82)';
        ctx.font = (b.label.length > 11 ? brickFontSm : brickFont) + 'px "Space Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2);
      });

      // Flashs d'impact
      flashes.forEach(function (f) {
        roundRect(f.x, f.y, f.w, f.h, 9);
        ctx.fillStyle = f.good
          ? 'rgba(232,97,42,' + (f.life * 0.9) + ')'
          : 'rgba(138,59,30,' + (f.life * 0.9) + ')';
        ctx.fill();
      });

      // Raquette
      roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 7);
      ctx.fillStyle = '#F4EFE8';
      ctx.fill();

      // Balle
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fillStyle = '#E8612A';
      ctx.shadowColor = 'rgba(232,97,42,0.7)';
      ctx.shadowBlur = 16;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Textes flottants
      floats.forEach(function (f) {
        ctx.fillStyle = (f.good ? 'rgba(232,97,42,' : 'rgba(200,155,109,') + f.life + ')';
        ctx.font = '700 15px "Space Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(f.txt, f.x, f.y);
      });
    }

    function loop(t) {
      rafId = requestAnimationFrame(loop);
      var dt = (t - lastT) / 16.7;
      lastT = t;
      dt = Math.max(0.4, Math.min(dt, 2.2));
      if (running && inView && !document.hidden) { update(dt); }
      render();
    }

    // Contrôles : souris, tactile, clavier
    canvas.addEventListener('mousemove', function (e) {
      var rect = canvas.getBoundingClientRect();
      paddle.target = (e.clientX - rect.left) / scale - paddle.w / 2;
    });
    canvas.addEventListener('touchstart', function (e) {
      var rect = canvas.getBoundingClientRect();
      var t = e.touches[0];
      paddle.target = (t.clientX - rect.left) / scale - paddle.w / 2;
    }, { passive: true });
    canvas.addEventListener('touchmove', function (e) {
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      var t = e.touches[0];
      paddle.target = (t.clientX - rect.left) / scale - paddle.w / 2;
    }, { passive: false });
    window.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { keys.left = true; }
      if (e.key === 'ArrowRight') { keys.right = true; }
    });
    window.addEventListener('keyup', function (e) {
      if (e.key === 'ArrowLeft') { keys.left = false; }
      if (e.key === 'ArrowRight') { keys.right = false; }
    });

    // Pause hors écran
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView) { lastT = performance.now(); }
      }, { threshold: 0.15 }).observe(frame);
    }

    btn.addEventListener('click', start);
    window.addEventListener('resize', resize);
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(render); }

    resize(); // détecte le mode, construit le plateau et place la balle
  })();


  /* ============================================================
     18. CURSEUR PERSONNALISÉ
     Les 30 attributs data-cursor du HTML étaient morts : ils pilotent
     désormais un curseur à deux vitesses (point rapide, anneau retardé).
     ============================================================ */
  (function initCursor() {
    var el = document.getElementById('cursor');
    if (!el || !FINE_POINTER || REDUCED || !hasGsap) { return; }

    var dot = el.querySelector('.cursor__dot');
    var ring = el.querySelector('.cursor__ring');
    var label = document.getElementById('cursorLabel');
    document.documentElement.classList.add('has-cursor');

    gsap.set([dot, ring], { xPercent: -50, yPercent: -50 });

    var dx = gsap.quickTo(dot, 'x', { duration: 0.10, ease: 'power3' });
    var dy = gsap.quickTo(dot, 'y', { duration: 0.10, ease: 'power3' });
    var rx = gsap.quickTo(ring, 'x', { duration: 0.42, ease: 'power3' });
    var ry = gsap.quickTo(ring, 'y', { duration: 0.42, ease: 'power3' });

    window.addEventListener('mousemove', function (e) {
      dx(e.clientX); dy(e.clientY);
      rx(e.clientX); ry(e.clientY);
    }, { passive: true });

    document.addEventListener('mouseleave', function () { el.style.opacity = 0; });
    document.addEventListener('mouseenter', function () { el.style.opacity = ''; });
    window.addEventListener('mousedown', function () { el.classList.add('is-down'); });
    window.addEventListener('mouseup', function () { el.classList.remove('is-down'); });

    function reset() {
      el.classList.remove('is-hover', 'is-label');
      label.textContent = '';
    }

    document.querySelectorAll('[data-cursor], .service').forEach(function (target) {
      var mode = target.getAttribute('data-cursor') || 'hover';
      target.addEventListener('mouseenter', function () {
        if (mode === 'hover') {
          el.classList.add('is-hover');
        } else {
          label.textContent = mode;
          el.classList.add('is-label');
        }
      });
      target.addEventListener('mouseleave', reset);
    });

    // Sécurité : un élément retiré du DOM ne doit pas figer l'état
    window.addEventListener('blur', reset);
  })();

  /* ============================================================
     19. MARQUEE PILOTÉ PAR LA VÉLOCITÉ DU SCROLL
     Le bandeau accélère quand on scrolle vite puis revient à sa
     vitesse de croisière : le geste « studio » le plus lisible.
     Repli CSS pur si GSAP est absent ou en mouvement réduit.
     ============================================================ */
  (function initMarquee() {
    if (!hasGsap || REDUCED || !window.ScrollTrigger) { return; }
    var tracks = document.querySelectorAll('.marquee__track');
    if (!tracks.length) { return; }

    var tweens = [];
    tracks.forEach(function (track) {
      var back = track.parentElement.classList.contains('marquee--back');
      track.style.animation = 'none';
      tweens.push(gsap.fromTo(track,
        { xPercent: back ? -50 : 0 },
        { xPercent: back ? 0 : -50, duration: 28, ease: 'none', repeat: -1 }
      ));
    });

    ScrollTrigger.create({
      onUpdate: function (self) {
        var boost = 1 + Math.min(Math.abs(self.getVelocity()) / 850, 4);
        tweens.forEach(function (tw) {
          gsap.to(tw, { timeScale: boost, duration: 0.4, overwrite: true });
        });
      }
    });
    // Retour à la vitesse de croisière quand le scroll s'arrête
    var idle;
    window.addEventListener('scroll', function () {
      clearTimeout(idle);
      idle = setTimeout(function () {
        tweens.forEach(function (tw) {
          gsap.to(tw, { timeScale: 1, duration: 1.1, ease: 'power2.out', overwrite: true });
        });
      }, 180);
    }, { passive: true });
  })();

})();
