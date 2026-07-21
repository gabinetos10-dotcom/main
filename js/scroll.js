/* ============================================================
   scroll.js — Révélations, parallaxe, timeline, carrousel, galerie
   Tout en vanilla : IntersectionObserver + requestAnimationFrame.
   ============================================================ */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* -------------------------------------------------
     RÉVÉLATIONS AU SCROLL
     ------------------------------------------------- */
  function initReveals() {
    var els = document.querySelectorAll(".reveal, .reveal-veil, .reveal-img, .draw-path");
    if (!els.length) return;
    // Fallback : reduced-motion ou navigateur sans IntersectionObserver → tout visible
    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach(function (e) { e.classList.add("in"); }); return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (e) { io.observe(e); });
  }

  /* -------------------------------------------------
     PARALLAXE MULTI-COUCHES (rAF, jamais dans scroll brut)
     ------------------------------------------------- */
  function initParallax() {
    if (reduce) return;
    var halo = document.querySelector(".bg-halo");
    var layers = document.querySelectorAll("[data-parallax]");
    var ticking = false, y = window.scrollY;

    function update() {
      if (halo) halo.style.setProperty("--halo-shift", (y * 0.12) + "px");
      layers.forEach(function (el) {
        var speed = parseFloat(el.getAttribute("data-parallax")) || 0.1;
        var rect = el.getBoundingClientRect();
        var offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * speed;
        el.style.transform = "translate3d(0," + (-offset).toFixed(1) + "px,0)";
      });
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      y = window.scrollY;
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* -------------------------------------------------
     TIMELINE « Le parcours d'un oui » — progression épinglée
     ------------------------------------------------- */
  function initJourney() {
    var track = document.querySelector(".journey__track");
    var line = document.querySelector(".journey__line");
    if (!track || !line) return;
    var ticking = false;
    function update() {
      var r = track.getBoundingClientRect();
      var vh = window.innerHeight;
      var total = r.height + vh * 0.4;
      var passed = vh * 0.6 - r.top;
      var p = Math.max(0, Math.min(passed / total, 1));
      line.style.setProperty("--progress", (p * 100).toFixed(1) + "%");
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* -------------------------------------------------
     CARROUSEL TÉMOIGNAGES
     ------------------------------------------------- */
  function initTestimonials() {
    var track = document.querySelector(".testi-track");
    if (!track) return;
    var prev = document.querySelector(".testi-controls .prev");
    var next = document.querySelector(".testi-controls .next");
    function card() {
      var c = track.querySelector(".testi-card");
      return c ? c.getBoundingClientRect().width + 34 : 360;
    }
    if (prev) prev.addEventListener("click", function () { track.scrollBy({ left: -card(), behavior: reduce ? "auto" : "smooth" }); });
    if (next) next.addEventListener("click", function () { track.scrollBy({ left: card(), behavior: reduce ? "auto" : "smooth" }); });
  }

  /* -------------------------------------------------
     PORTFOLIO — filtres + lightbox custom
     ------------------------------------------------- */
  function initGallery() {
    var gallery = document.querySelector(".gallery");
    if (!gallery) return;

    // Filtres
    var filters = document.querySelectorAll(".filter");
    filters.forEach(function (btn) {
      btn.addEventListener("click", function () {
        filters.forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
        btn.setAttribute("aria-pressed", "true");
        var f = btn.getAttribute("data-filter");
        gallery.querySelectorAll(".gallery__item").forEach(function (item) {
          var cat = item.getAttribute("data-cat") || "";
          var show = f === "all" || cat.indexOf(f) !== -1;
          item.classList.toggle("is-hidden", !show);
        });
      });
    });

    // Lightbox
    var lb = document.querySelector(".lightbox");
    if (!lb) return;
    var items = Array.prototype.slice.call(gallery.querySelectorAll(".gallery__item"));
    var media = lb.querySelector(".lightbox__media");
    var titleEl = lb.querySelector(".lightbox__bar h3");
    var metaEl = lb.querySelector(".lightbox__bar span");
    var current = 0;
    var lastFocus = null;

    function open(i) {
      current = i;
      var item = items[i];
      var fig = item.querySelector(".gallery__media").innerHTML;
      media.innerHTML = fig;
      if (titleEl) titleEl.textContent = item.getAttribute("data-title") || "";
      if (metaEl) metaEl.textContent = item.getAttribute("data-credit") || "";
      lb.classList.add("open");
      document.body.classList.add("is-locked");
      lastFocus = document.activeElement;
      lb.querySelector(".lightbox__close").focus();
      document.addEventListener("keydown", onKey);
    }
    function close() {
      lb.classList.remove("open");
      document.body.classList.remove("is-locked");
      document.removeEventListener("keydown", onKey);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    function go(dir) {
      var vis = items.filter(function (it) { return !it.classList.contains("is-hidden"); });
      var idxInVis = vis.indexOf(items[current]);
      idxInVis = (idxInVis + dir + vis.length) % vis.length;
      open(items.indexOf(vis[idxInVis]));
    }
    function onKey(e) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    }

    items.forEach(function (item, i) {
      item.setAttribute("tabindex", "0");
      item.setAttribute("role", "button");
      item.setAttribute("aria-label", "Agrandir : " + (item.getAttribute("data-title") || "photo"));
      item.addEventListener("click", function () { open(i); });
      item.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(i); }
      });
    });
    lb.querySelector(".lightbox__close").addEventListener("click", close);
    lb.querySelector(".lightbox__nav.prev").addEventListener("click", function () { go(-1); });
    lb.querySelector(".lightbox__nav.next").addEventListener("click", function () { go(1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
  }

  function boot() {
    initReveals();
    initParallax();
    initJourney();
    initTestimonials();
    initGallery();
  }
  if (document.readyState !== "loading") boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
