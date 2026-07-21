/* ============================================================
   nav.js — Header au scroll, burger fleuri, overlay + focus trap
   ============================================================ */
(function () {
  "use strict";

  function init() {
    var header = document.querySelector(".site-header");
    var burger = document.querySelector(".burger");
    var overlay = document.getElementById("nav-overlay");
    var body = document.body;

    // --- Header translucide au scroll ---
    if (header) {
      var onScroll = function () {
        if (window.scrollY > 40) header.classList.add("scrolled");
        else header.classList.remove("scrolled");
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    if (!burger || !overlay) return;

    var lastFocus = null;

    function focusables() {
      return overlay.querySelectorAll('a[href], button:not([disabled])');
    }

    function openMenu() {
      lastFocus = document.activeElement;
      body.classList.add("menu-open", "is-locked");
      burger.setAttribute("aria-expanded", "true");
      burger.setAttribute("aria-label", "Fermer le menu");
      overlay.setAttribute("tabindex", "-1");
      var f = focusables();
      setTimeout(function () { if (f[0]) f[0].focus(); }, 350);
      document.addEventListener("keydown", onKey);
    }

    function closeMenu() {
      body.classList.remove("menu-open", "is-locked");
      burger.setAttribute("aria-expanded", "false");
      burger.setAttribute("aria-label", "Ouvrir le menu");
      document.removeEventListener("keydown", onKey);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function onKey(e) {
      if (e.key === "Escape") { closeMenu(); return; }
      if (e.key !== "Tab") return;
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }

    burger.addEventListener("click", function () {
      if (body.classList.contains("menu-open")) closeMenu();
      else openMenu();
    });

    // Fermer quand on suit un lien (la transition de page prend le relais)
    overlay.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeMenu();
    });

    // Sous-menu desktop : ouverture au clavier
    document.querySelectorAll(".has-sub > .nav-link").forEach(function (link) {
      link.addEventListener("click", function (e) {
        // sur desktop, laisser l'ancre ; le survol/focus gère l'affichage
      });
    });
  }

  if (document.querySelector(".site-header")) init();
  else document.addEventListener("mj:components-ready", init);
})();
