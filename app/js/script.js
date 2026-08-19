/* ============================================================
   NOUS. — AGENCE DE BRANDING
   Moteur d'animations : GSAP + ScrollTrigger + Lenis
   Hérité du design GJS, rebrandé NOUS (jaune #FFBF00 / noir).
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
     2. ÉTATS INITIAUX + INTRO HERO
     ============================================================ */
  var introTl = null;
  var heroVideo = document.getElementById('heroVideo');

  function lockScroll(lock) {
    document.body.classList.toggle('is-locked', lock);
    if (lenis) { lock ? lenis.stop() : lenis.start(); }
  }

  function playHeroVideo() {
    if (!heroVideo) { return; }
    var p = heroVideo.play();
    if (p && p.catch) { p.catch(function () { /* autoplay bloqué : le poster reste */ }); }
  }

  if (hasGsap && !REDUCED) {
    gsap.set('.hero__line-inner', { yPercent: 112, y: 0 });
    gsap.set('[data-intro]', { opacity: 0, y: 34 });

    introTl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
    introTl
      .to('.hero__line-inner', { yPercent: 0, duration: 1.35, stagger: 0.16 }, 0)
      .to('[data-intro]', { opacity: 1, y: 0, duration: 1.1, stagger: 0.09 }, 0.4)
      .from('.hero__video', { scale: 1.22, duration: 2.2, ease: 'power3.out' }, 0);
  }

  /* ============================================================
     3. PRELOADER — « L'ENCRE »
     La signature NOUS est la jauge : l'encre jaune la remplit de
     gauche à droite, une plume de lumière suit le bord de l'encre.
     La progression n'est PAS décorative — elle pondère le
     chargement réel (vidéo, polices, images clés, window.load),
     avec un filet qui garde la jauge vivante sur réseau lent.
     Sortie : l'encre inonde l'écran, la signature s'inverse en
     noir au passage du niveau, puis le rideau jaune se soulève
     pendant que le hero démarre derrière.
     ============================================================ */
  var preloader = document.getElementById('preloader');
  var nav = document.getElementById('nav');
  var entered = false;

  function enterSite() {
    if (entered) { return; }
    entered = true;
    if (nav) { nav.classList.add('is-in'); }
    lockScroll(false);
    playHeroVideo();
    if (introTl) { introTl.play(); }
  }

  (function initPreloader() {
    if (!preloader) { enterSite(); return; }

    var counterEl = document.getElementById('counter');
    var statusEl = document.getElementById('plStatus');
    var gaugeEl = document.getElementById('plGauge');
    var skipBtn = document.getElementById('plSkip');
    var taglineEl = document.getElementById('plTagline');
    var signEl = preloader.querySelector('.pl__sign');
    var plClockEl = document.getElementById('plClock');
    var onMove = null;
    var inTl = null;

    lockScroll(true);

    // — Horloge d'atelier (même heure que le pied de page) —
    if (plClockEl) {
      try {
        plClockEl.textContent = new Date().toLocaleTimeString('fr-FR', {
          timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit'
        });
      } catch (e) {
        plClockEl.textContent = new Date().toLocaleTimeString('fr-FR');
      }
    }

    // — La baseline est découpée en lettres : elles s'allument au
    //   rythme de la progression (seconde lecture de la jauge) —
    var letters = [];
    if (taglineEl) {
      var txt = taglineEl.textContent.trim();
      taglineEl.textContent = '';
      for (var i = 0; i < txt.length; i++) {
        var sp = document.createElement('span');
        if (txt.charAt(i) === ' ') { sp.className = 'is-space'; sp.innerHTML = '&nbsp;'; }
        else { sp.textContent = txt.charAt(i); }
        taglineEl.appendChild(sp);
        letters.push(sp);
      }
    }

    /* ---- Phases annoncées : on dit ce qui se passe, pas « chargement… » ---- */
    var PHASES = [
      { at: 0, label: "Préparation de l'atelier" },
      { at: 30, label: 'Chargement des visuels' },
      { at: 60, label: 'Mise en récit' },
      { at: 88, label: 'Derniers réglages' },
      { at: 100, label: 'Bienvenue' }
    ];
    var phaseIdx = -1;
    function setPhase(v) {
      var idx = 0;
      for (var i = 0; i < PHASES.length; i++) { if (v >= PHASES[i].at) { idx = i; } }
      if (idx === phaseIdx) { return; }
      phaseIdx = idx;
      if (statusEl) { statusEl.textContent = PHASES[idx].label; }
    }

    /* ---- Chargement réel : chaque ressource pèse son poids ---- */
    var real = 0;
    function track(weight, subscribe) {
      var settled = false;
      function done() {
        if (settled) { return; }
        settled = true;
        real += weight;
      }
      setTimeout(done, 3000); // aucune ressource ne retient la jauge plus de 3 s
      subscribe(done);
    }

    // La vidéo du hero : la ressource la plus lourde. On se contente de
    // « loadeddata » — la première image suffit, le poster couvre le reste.
    track(0.28, function (done) {
      if (!heroVideo) { done(); return; }
      if (heroVideo.readyState >= 2) { done(); return; }
      ['loadeddata', 'canplay', 'canplaythrough', 'error'].forEach(function (ev) {
        heroVideo.addEventListener(ev, done, { once: true });
      });
    });
    // Les polices : évite le saut typographique juste après l'entrée
    track(0.16, function (done) {
      if (document.fonts && document.fonts.ready) { document.fonts.ready.then(done, done); }
      else { done(); }
    });
    // Les images de la première vue
    ['medias/nous-script-blanc.png', 'medias/poster.jpg', 'medias/nous-wordmark-blanc.png']
      .forEach(function (src) {
        track(0.08, function (done) {
          var im = new Image();
          im.onload = done; im.onerror = done;
          im.src = src;
        });
      });
    // Le document complet
    track(0.32, function (done) {
      if (document.readyState === 'complete') { done(); return; }
      window.addEventListener('load', done, { once: true });
    });

    /* ---- Visite déjà vue dans la session : on n'impose pas deux fois l'intro ---- */
    var seen = false;
    try {
      seen = sessionStorage.getItem('nous.intro') === '1';
      sessionStorage.setItem('nous.intro', '1');
    } catch (e) { /* mode privé : on garde l'intro complète */ }

    var MIN_MS = seen ? 550 : 1500;   // durée plancher : pas de « flash » de rideau
    var MAX_MS = seen ? 1600 : 2800;  // plafond : une ressource lente ne retient jamais l'entrée
    var now = function () {
      return (window.performance && performance.now) ? performance.now() : Date.now();
    };
    var started = now();

    /* ---- Rendu : une seule variable CSS pilote toute la scène ---- */
    var shown = 0;
    var litCount = 0;
    function paint(v) {
      var r = Math.round(v);
      preloader.style.setProperty('--p', (v / 100).toFixed(4));
      if (counterEl) { counterEl.textContent = (r < 10 ? '0' : '') + r; }
      if (gaugeEl) { gaugeEl.setAttribute('aria-valuenow', r); }
      setPhase(r);
      var n = Math.round(v / 100 * letters.length);
      while (litCount < n) { letters[litCount].classList.add('is-lit'); litCount++; }
      while (litCount > n) { litCount--; letters[litCount].classList.remove('is-lit'); }
    }

    /* ---- Boucle : la valeur affichée poursuit la valeur réelle,
           sans jamais reculer ni se figer ---- */
    var finished = false;
    var rafId = 0;
    function tick() {
      var elapsed = now() - started;
      // Filet anti-blocage : la jauge continue d'avancer, mais reste
      // arrimée au réel (jamais plus de 30 points d'avance).
      var trickle = 92 * (1 - Math.exp(-elapsed / (seen ? 380 : 1050)));
      var ready = elapsed >= MIN_MS && (real >= 0.999 || elapsed >= MAX_MS);
      var target = ready
        ? 100
        : Math.min(96, Math.max(real * 100, Math.min(trickle, real * 100 + 30)));
      shown += (target - shown) * (ready ? 0.28 : 0.085);
      if (ready && 100 - shown < 0.4) { shown = 100; }
      paint(shown);
      if (shown >= 100) { finish(); }
    }
    function startLoop() {
      if (hasGsap) { gsap.ticker.add(tick); }
      else { (function loop() { rafId = requestAnimationFrame(loop); tick(); })(); }
    }
    function stopLoop() {
      if (hasGsap) { gsap.ticker.remove(tick); }
      else if (rafId) { cancelAnimationFrame(rafId); }
    }

    /* ---- Sorties ---- */
    var bySkip = false; // sortie demandée par l'utilisateur : on accélère le geste

    function cleanup() {
      if (onMove) { window.removeEventListener('mousemove', onMove); }
      document.removeEventListener('keydown', onKey);
      if (preloader && preloader.parentNode) { preloader.parentNode.removeChild(preloader); }
      enterSite(); // filet : le site s'ouvre même si la timeline a été coupée
    }

    function simpleExit() {
      preloader.classList.add('pl--out');
      enterSite();
      setTimeout(cleanup, 700);
    }

    function exit() {
      if (skipBtn) { skipBtn.disabled = true; }
      preloader.style.pointerEvents = 'none';

      if (!hasGsap || REDUCED) { simpleExit(); return; }

      // On solde l'entrée (si elle court encore) et on coupe le magnétisme
      // avant de reprendre la main sur .pl__stage.
      if (inTl) { inTl.progress(1).kill(); inTl = null; }
      if (onMove) { window.removeEventListener('mousemove', onMove); onMove = null; }
      gsap.killTweensOf('.pl__stage');
      gsap.killTweensOf('.pl__band');
      gsap.set('.pl__stage', { x: 0, y: 0 });

      // Le niveau d'encre est partagé : --f pilote les colonnes (plein
      // écran) et --fl l'inversion de la signature, calculée sur sa
      // position réelle pour que le logo bascule pile au passage du niveau.
      var rect = signEl ? signEl.getBoundingClientRect() : { bottom: 0, height: 1 };
      var vh = window.innerHeight;
      var ink = { f: 0 };

      gsap.timeline({ onComplete: cleanup })
        // 1. La plume éclate au bout de la signature
        .to('.pl__nib', { opacity: 0, scaleX: 26, duration: .45, ease: 'expo.out' }, 0)
        // 2. Le HUD s'efface : plus rien ne distrait de la marque
        .to(['.pl__head', '.pl__foot', '.pl__gauge', '.pl__eyebrow', '.pl__tagline'],
          { opacity: 0, duration: .28, ease: 'power2.in' }, .03)
        // 3. L'encre monte et retourne la signature (jaune → noir)
        .to(ink, {
          f: 1, duration: .62, ease: 'power2.inOut',
          onUpdate: function () {
            var level = vh * (1 - ink.f);
            var fl = (rect.bottom - level) / rect.height;
            preloader.style.setProperty('--f', ink.f.toFixed(4));
            preloader.style.setProperty('--fl', Math.max(0, Math.min(1, fl)).toFixed(4));
          }
        }, .12)
        .set(['.pl__bg', '.pl__band'], { opacity: 0 }, .76)
        // 4. Battement : la marque « signe » la page
        .to('.pl__sign', { scale: 1.04, duration: .16, ease: 'power2.out' }, .76)
        .to('.pl__sign', { scale: 1, duration: .24, ease: 'power2.inOut' }, .92)
        // 5. Le rideau jaune se soulève ; le hero démarre derrière
        .to('.pl__flood-col', { yPercent: -101, duration: .82, ease: 'expo.inOut', stagger: .05 }, 1.06)
        .to('.pl__stage', { yPercent: -101, duration: .82, ease: 'expo.inOut' }, 1.14)
        .call(enterSite, null, 1.24)
        // Sortie demandée (ou session déjà vue) : même geste, joué plus vite
        .timeScale(bySkip ? 2 : (seen ? 1.35 : 1));
    }

    function finish() {
      if (finished) { return; }
      finished = true;
      stopLoop();
      if (statusEl) { statusEl.textContent = 'Bienvenue'; }
      // Sortie anticipée (bouton, Échap, clic) : on laisse quand même
      // la signature se terminer, on ne coupe pas le geste en deux.
      if (hasGsap && !REDUCED && shown < 99) {
        var snap = { v: shown };
        gsap.to(snap, {
          v: 100, duration: bySkip ? .22 : .3, ease: 'power2.out',
          onUpdate: function () { paint(snap.v); },
          onComplete: function () { paint(100); exit(); }
        });
        return;
      }
      paint(100);
      exit();
    }

    /* ---- Sortie à la demande : bouton visible, Échap, ou clic ---- */
    function skipNow() {
      if (finished) { return; }
      bySkip = true;
      finish();
    }
    function onKey(e) {
      if (e.key === 'Escape' || e.key === 'Esc') { skipNow(); }
    }
    document.addEventListener('keydown', onKey);
    if (skipBtn) {
      skipBtn.addEventListener('click', function (e) { e.stopPropagation(); skipNow(); });
    }
    preloader.addEventListener('click', skipNow);

    // Filet dur : le site s'ouvre au bout de 9 s quoi qu'il arrive
    setTimeout(finish, 9000);

    /* ---- Entrée en scène ---- */
    if (hasGsap && !REDUCED) {
      gsap.set(['.pl__head', '.pl__foot', '.pl__gauge'], { opacity: 0, y: 14 });
      gsap.set('.pl__eyebrow', { opacity: 0, y: 10 });
      gsap.set('.pl__sign', { opacity: 0, scale: .965 });
      gsap.set('.pl__tagline', { opacity: 0 });

      inTl = gsap.timeline({ defaults: { ease: 'expo.out' } })
        .to('.pl__sign', { opacity: 1, scale: 1, duration: 1.1 }, .05)
        .to('.pl__eyebrow', { opacity: 1, y: 0, duration: .8 }, .22)
        .to(['.pl__head', '.pl__foot', '.pl__gauge'],
          { opacity: 1, y: 0, duration: .9, stagger: .06 }, .28)
        .to('.pl__nib', { opacity: 1, duration: .5, ease: 'power2.out' }, .35)
        .to('.pl__tagline', { opacity: 1, duration: .8 }, .42)
        .to('.pl__skip', { opacity: 1, duration: .5 }, 1.15);

      // Magnétisme : la scène suit très légèrement le curseur,
      // le bandeau de fond part en sens inverse (profondeur).
      if (FINE_POINTER) {
        var qx = gsap.quickTo('.pl__stage', 'x', { duration: .9, ease: 'power3' });
        var qy = gsap.quickTo('.pl__stage', 'y', { duration: .9, ease: 'power3' });
        var qb = gsap.quickTo('.pl__band', 'x', { duration: 1.3, ease: 'power3' });
        onMove = function (e) {
          var nx = e.clientX / window.innerWidth - .5;
          var ny = e.clientY / window.innerHeight - .5;
          qx(nx * 26); qy(ny * 16); qb(nx * -58);
        };
        window.addEventListener('mousemove', onMove);
      }
    } else {
      // Mouvement réduit / pas de GSAP : la scène est posée, pas animée.
      // La plume reste affichée — elle marque le bord de l'encre, donc la progression.
      if (skipBtn) { skipBtn.style.opacity = '1'; }
      var nibEl = preloader.querySelector('.pl__nib');
      if (nibEl) { nibEl.style.opacity = '1'; }
    }

    startLoop();
  }());

  /* ============================================================
     4. CURSEUR PERSONNALISÉ (dot + ring, label optionnel)
     ============================================================ */
  (function initCursor() {
    if (!FINE_POINTER || REDUCED) { return; }
    var dot = document.getElementById('cursorDot');
    var ring = document.getElementById('cursorRing');
    var label = document.getElementById('cursorLabel');
    if (!dot || !ring) { return; }

    var mx = -100, my = -100, rx = -100, ry = -100;
    window.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate(' + (mx - 4) + 'px,' + (my - 4) + 'px)';
    }, { passive: true });

    (function follow() {
      requestAnimationFrame(follow);
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)';
    })();

    document.querySelectorAll('[data-cursor]').forEach(function (el) {
      el.addEventListener('mouseenter', function () {
        var mode = el.getAttribute('data-cursor');
        if (mode && mode !== 'hover') {
          ring.classList.add('is-label');
          label.textContent = mode;
        } else {
          ring.classList.add('is-hover');
        }
      });
      el.addEventListener('mouseleave', function () {
        ring.classList.remove('is-hover');
        ring.classList.remove('is-label');
        label.textContent = '';
      });
    });

    document.addEventListener('mouseleave', function () {
      dot.classList.add('is-hidden'); ring.classList.add('is-hidden');
    });
    document.addEventListener('mouseenter', function () {
      dot.classList.remove('is-hidden'); ring.classList.remove('is-hidden');
    });
  })();

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

    // Légère parallaxe de la vidéo du hero au scroll
    gsap.to('.hero__video', {
      yPercent: 12, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 }
    });
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
      gsap.set(words, {
        opacity: 0.1, yPercent: 55, rotationX: -68,
        rotation: function () { return gsap.utils.random(-1.6, 1.6); },
        filter: 'blur(7px)', transformOrigin: '50% 100%'
      });
      gsap.to(words, {
        opacity: 1, yPercent: 0, rotationX: 0, rotation: 0, filter: 'blur(0px)',
        duration: 0.85, ease: 'power3.out',
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

    // Dérive horizontale des grands titres de sections (subtile : jamais au bord)
    gsap.utils.toArray('.section__title').forEach(function (title, i) {
      var dir = i % 2 === 0 ? 1 : -1;
      gsap.fromTo(title, { xPercent: 1.6 * dir }, {
        xPercent: -1.6 * dir, ease: 'none',
        scrollTrigger: {
          trigger: title.closest('section'),
          start: 'top bottom', end: 'bottom top', scrub: 1.2
        }
      });
    });

    // Skew des cartes à propos selon la vélocité du scroll
    var proxy = { skew: 0 };
    var skewSetter = gsap.quickSetter('.about__card', 'skewY', 'deg');
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
     10. MENU MOBILE — CASCADE JAUNE / CRÈME / NOIR
     ============================================================ */
  (function initMobileMenu() {
    var burger = document.getElementById('burger');
    var menu = document.getElementById('mobileMenu');
    if (!burger || !menu) { return; }
    var isOpen = false;

    var menuTl = null;
    if (hasGsap && !REDUCED) {
      menuTl = gsap.timeline({ paused: true })
        .to('.mm-panel', { yPercent: 0, duration: 0.55, stagger: 0.09, ease: 'expo.inOut' }, 0)
        .fromTo('.mobile-menu__glow', { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power2.out' }, 0.3)
        .fromTo('.mobile-menu__link', { y: 84, opacity: 0, rotation: 2.5 },
          { y: 0, opacity: 1, rotation: 0, duration: 0.75, stagger: 0.08, ease: 'expo.out' }, 0.42)
        .fromTo('.mobile-menu__asterisk', { scale: 0, rotation: -120 },
          { scale: 1, rotation: 0, duration: 0.9, ease: 'back.out(1.5)' }, 0.55)
        .fromTo('.mobile-menu__foot', { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 0.78);
      gsap.set('.mm-panel', { yPercent: -101, y: 0 });
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
     11. PARALLAX À LA SOURIS — FORMES DU HERO
     ============================================================ */
  (function initHeroMouse() {
    if (!FINE_POINTER || !hasGsap || REDUCED) { return; }
    var hero = document.getElementById('hero');
    if (!hero) { return; }
    var shapes = hero.querySelectorAll('[data-mouse]');
    if (!shapes.length) { return; }
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
     12. BOUTON LIQUIDE (contact)
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
     13. ANCRES, HORLOGE, ANNÉE
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
     14. À PROPOS — ÉVENTAIL AU SCROLL + TILT 3D
     ============================================================ */
  (function initAbout() {
    if (!hasGsap || REDUCED) { return; }
    var cards = gsap.utils.toArray('.about__card');
    if (!cards.length) { return; }

    cards.forEach(function (card, i) {
      gsap.fromTo(card,
        { y: 130 + i * 45, rotation: (i - 1) * 6 },
        {
          y: 0, rotation: (i - 1) * 1.5, ease: 'none',
          scrollTrigger: { trigger: '#aboutDeck', start: 'top 92%', end: 'top 35%', scrub: 1 }
        });
    });

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
     15. MODALE LÉGALE / RGPD
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
          '<p>NOUS — Agence de branding, France.<br>Contact : contact@wearenous.fr</p>' +
          '<h4>DIRECTEUR DE LA PUBLICATION</h4>' +
          '<p>L’équipe NOUS.</p>' +
          '<h4>HÉBERGEMENT</h4>' +
          '<p>Site statique hébergé sur infrastructure cloud. Aucune base de données n’est associée au site.</p>' +
          '<h4>PROPRIÉTÉ INTELLECTUELLE</h4>' +
          '<p>L’ensemble des contenus (textes, visuels, code, vidéo) est la propriété de NOUS. Toute reproduction sans autorisation préalable est interdite.</p>'
      },
      privacy: {
        title: 'POLITIQUE DE CONFIDENTIALITÉ',
        html: '<h4>RESPONSABLE DE TRAITEMENT</h4>' +
          '<p>NOUS, France — contact@wearenous.fr</p>' +
          '<h4>DONNÉES COLLECTÉES</h4>' +
          '<p>Ce site ne stocke aucune donnée personnelle sur ses serveurs. Les formulaires et la prise de rendez-vous sont assurés par des services tiers (Typeform et Calendly), soumis à leurs propres politiques de confidentialité. Le lien mail ouvre simplement votre application de messagerie.</p>' +
          '<h4>COOKIES</h4>' +
          '<p>Aucun cookie de suivi ni traceur publicitaire n’est déposé par ce site. Les widgets tiers intégrés peuvent déposer leurs propres cookies techniques.</p>' +
          '<h4>VOS DROITS (RGPD)</h4>' +
          '<p>Conformément au Règlement Général sur la Protection des Données, vous disposez de droits d’accès, de rectification, d’effacement et d’opposition. Pour les exercer : contact@wearenous.fr. Vous pouvez également saisir la CNIL (cnil.fr).</p>'
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
     16. CONTACT — ONGLETS TYPEFORM / CALENDLY
     ============================================================ */
  (function initContactTabs() {
    var tabT = document.getElementById('tabTypeform');
    var tabC = document.getElementById('tabCalendly');
    var viewT = document.getElementById('viewTypeform');
    var viewC = document.getElementById('viewCalendly');
    var ink = document.querySelector('.contact-tabs__ink');
    if (!tabT || !tabC || !viewT || !viewC) { return; }

    var calendlyLoaded = false;

    function positionInk(tab) {
      if (!ink) { return; }
      ink.style.width = tab.offsetWidth + 'px';
      ink.style.transform = 'translateX(' + tab.offsetLeft + 'px)';
    }

    function activate(which) {
      var isT = which === 'typeform';
      tabT.classList.toggle('is-active', isT);
      tabC.classList.toggle('is-active', !isT);
      tabT.setAttribute('aria-selected', isT);
      tabC.setAttribute('aria-selected', !isT);
      viewT.classList.toggle('is-active', isT);
      viewC.classList.toggle('is-active', !isT);
      viewT.hidden = !isT;
      viewC.hidden = isT;
      positionInk(isT ? tabT : tabC);

      if (!isT && !calendlyLoaded) {
        calendlyLoaded = true;
        var initCal = function () {
          if (window.Calendly) {
            Calendly.initInlineWidget({
              url: 'https://calendly.com/wearenous01/30min?primary_color=ffbf00&hide_landing_page_details=1',
              parentElement: document.getElementById('calendly-inline'),
              prefill: {}, utm: {}, autoLoad: true
            });
          }
        };
        if (window.Calendly) { initCal(); }
        else {
          var check = setInterval(function () {
            if (window.Calendly) { clearInterval(check); initCal(); }
          }, 60);
          setTimeout(function () { clearInterval(check); }, 12000);
        }
      }
    }

    tabT.addEventListener('click', function () { activate('typeform'); });
    tabC.addEventListener('click', function () { activate('calendly'); });
    window.addEventListener('resize', function () {
      positionInk(document.querySelector('.contact-tab.is-active'));
    });
    positionInk(tabT);
    setTimeout(function () { positionInk(tabT); }, 600);
  })();

})();

/* ============================================================
   18. L'ATELIER NOUS — BREAKOUT DU BRANDING
   Les bons ingrédients d'une marque élargissent la raquette,
   les mauvaises pratiques la font rétrécir.
   ============================================================ */
(function () {
  'use strict';

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

  var LW = 920, LH = 580;
  var scale = 1, dpr = 1;
  var running = false, inView = true, rafId = null, lastT = 0;
  var paddle = { w: 112, h: 13, x: 0, y: 0, target: 0 };
  var ball = { x: 0, y: 0, vx: 0, vy: 0, r: 9, speed: 6.2 };
  var bricks = [], floats = [], flashes = [];
  var score = 0, goods = 0, totalGoods = 0, lostPause = 0;
  var keys = { left: false, right: false };

  var GOOD = ['IDENTITÉ', 'RÉCIT', 'COHÉRENCE', 'AUDACE', 'ANCRAGE', 'ÉCOUTE',
              'STRATÉGIE', 'ÉMOTION', 'SINGULARITÉ', 'VÉRITÉ', 'DURABILITÉ'];
  var BAD = ['CLICHÉ', 'TEMPLATE', 'BLABLA', 'COPIE CONFORME', 'LOGO CLIPART',
             'GREENWASHING', 'TENDANCE CREUSE', 'DÉCONNECTÉ', 'AMATEURISME'];
  var mode = '';
  var COLS = 5, ROWS = 4, GAP = 14, TOP = 76, SIDE = 44, BH = 48;
  var BW = 0, brickFont = 11, brickFontSm = 10, paddleW0 = 112;

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
    overlayTitle.textContent = win ? 'VOUS AVEZ L\u2019\u0152IL.' : 'MARQUE DILUÉE.';
    overlayText.textContent = win
      ? 'Toutes les fondations d\u2019une marque forte sont réunies.'
      : 'Trop de mauvaises pratiques accumulées.';
    btn.querySelector('.btn__text').textContent = 'Rejouer';
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

    if (ball.vy > 0 &&
        ball.y + ball.r >= paddle.y && ball.y - ball.r <= paddle.y + paddle.h &&
        ball.x >= paddle.x - ball.r && ball.x <= paddle.x + paddle.w + ball.r) {
      var rel = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
      var ang = rel * (Math.PI / 3.2);
      ball.vx = Math.sin(ang) * ball.speed;
      ball.vy = -Math.abs(Math.cos(ang) * ball.speed);
      ball.y = paddle.y - ball.r - 0.5;
    }

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
    ctx.fillStyle = 'rgba(245,243,239,0.05)';
    for (var gx = 40; gx < LW; gx += 46) {
      for (var gy = 30; gy < LH; gy += 46) {
        ctx.fillRect(gx, gy, 2, 2);
      }
    }

    // Briques
    bricks.forEach(function (b) {
      if (!b.alive) { return; }
      roundRect(b.x, b.y, b.w, b.h, 9);
      ctx.fillStyle = 'rgba(245,243,239,0.05)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(245,243,239,0.22)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = 'rgba(245,243,239,0.82)';
      ctx.font = (b.label.length > 11 ? brickFontSm : brickFont) + 'px "Space Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2);
    });

    // Flashs d'impact
    flashes.forEach(function (f) {
      roundRect(f.x, f.y, f.w, f.h, 9);
      ctx.fillStyle = f.good
        ? 'rgba(255,191,0,' + (f.life * 0.9) + ')'
        : 'rgba(120,60,20,' + (f.life * 0.9) + ')';
      ctx.fill();
    });

    // Raquette
    roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 7);
    ctx.fillStyle = '#F5F3EF';
    ctx.fill();

    // Balle jaune NOUS
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fillStyle = '#FFBF00';
    ctx.shadowColor = 'rgba(255,191,0,0.7)';
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Textes flottants
    floats.forEach(function (f) {
      ctx.fillStyle = (f.good ? 'rgba(255,191,0,' : 'rgba(200,155,109,') + f.life + ')';
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

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      if (inView) { lastT = performance.now(); }
    }, { threshold: 0.15 }).observe(frame);
  }

  btn.addEventListener('click', start);
  window.addEventListener('resize', resize);
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(render); }

  resize();
})();
