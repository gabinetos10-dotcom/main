/* ============================================================
   components.js — En-tête & pied de page partagés
   Injectés en JS (aucun fetch → compatible file://) avec
   fallback <noscript> présent dans chaque page pour le SEO.
   ============================================================ */
(function () {
  "use strict";

  // Monogramme MJ — filet d'or, réutilisé (header, footer, preloader, veil)
  window.MJ = window.MJ || {};
  MJ.monogram = function (cls) {
    return (
      '<svg class="' + (cls || "") + '" viewBox="0 0 120 120" role="img" aria-label="Monogramme Maison Jolie">' +
      '<circle cx="60" cy="60" r="52" class="mono-stroke" opacity="0.4"/>' +
      '<path class="mono-stroke" d="M34 82 L34 42 L54 68 L74 42 L74 82"/>' +
      '<path class="mono-stroke" d="M84 42 L84 72 Q84 84 70 81"/>' +
      '<circle cx="60" cy="26" r="2.4" fill="var(--or)" stroke="none"/>' +
      "</svg>"
    );
  };

  var INSTA = "https://instagram.com/maisonjolie_wedding";

  // Détermine la page active à partir du nom de fichier
  var path = window.location.pathname.split("/").pop() || "index.html";
  if (path === "") path = "index.html";

  function isActive(file) {
    return path === file ? ' aria-current="page"' : "";
  }

  var igIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">' +
    '<rect x="2.5" y="2.5" width="19" height="19" rx="5.5"/><circle cx="12" cy="12" r="4.2"/>' +
    '<circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none"/></svg>';

  var header =
    '<a class="skip-link" href="#main">Aller au contenu</a>' +
    '<div class="container-wide header-inner">' +
      '<a class="brand" href="index.html" aria-label="Maison Jolie Wedding — accueil">' +
        MJ.monogram("brand__mono") +
        '<span class="brand__word"><span class="brand__name">Maison Jolie</span>' +
        '<span class="brand__tag">Wedding</span></span>' +
      "</a>" +

      '<nav class="nav-desktop" aria-label="Navigation principale">' +
        '<ul class="nav-list">' +
          '<li class="nav-item"><a class="nav-link" href="index.html"' + isActive("index.html") + ">Accueil</a></li>" +
          '<li class="nav-item has-sub">' +
            '<a class="nav-link" href="#services" aria-haspopup="true">Mes services <span class="caret">▾</span></a>' +
            '<div class="subnav" role="menu">' +
              '<a role="menuitem" href="wedding-planner.html"><strong>Wedding Planner</strong><small>Organisation & coordination</small></a>' +
              '<a role="menuitem" href="wedding-designer.html"><strong>Wedding Designer</strong><small>Décoration & scénographie</small></a>' +
            "</div>" +
          "</li>" +
          '<li class="nav-item"><a class="nav-link" href="portfolio.html"' + isActive("portfolio.html") + ">Portfolio</a></li>" +
          '<li class="nav-item"><a class="nav-link" href="blog.html"' + isActive("blog.html") + ">Blog</a></li>" +
          '<li class="nav-item"><a class="nav-link" href="contact.html"' + isActive("contact.html") + ">Contact</a></li>" +
        "</ul>" +
      "</nav>" +

      '<div class="header-actions">' +
        '<a class="icon-btn" href="' + INSTA + '" target="_blank" rel="noopener" aria-label="Instagram @maisonjolie_wedding">' + igIcon + "</a>" +
        '<span class="magnetic header-cta"><a class="btn" href="contact.html" data-confetti><span class="btn__label">Je me marie&nbsp;!</span></a></span>' +
        '<button class="burger" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="nav-overlay">' +
          '<svg viewBox="0 0 30 30" aria-hidden="true">' +
            '<line class="b-line b-top" x1="4" y1="9" x2="26" y2="9"/>' +
            '<line class="b-line b-mid" x1="4" y1="15" x2="26" y2="15"/>' +
            '<line class="b-line b-bot" x1="4" y1="21" x2="26" y2="21"/>' +
            '<path class="petal" d="M15 4 C22 8 22 22 15 26 C8 22 8 8 15 4Z"/>' +
            '<path class="petal" d="M4 15 C8 8 22 8 26 15 C22 22 8 22 4 15Z"/>' +
          "</svg>" +
        "</button>" +
      "</div>" +
    "</div>" +

    // Overlay mobile plein écran
    '<div class="nav-overlay" id="nav-overlay" role="dialog" aria-modal="true" aria-label="Menu" tabindex="-1">' +
      '<div class="nav-overlay__inner">' +
        '<ul class="nav-mobile-list">' +
          '<li style="--i:0"><a class="nav-mobile-link" href="index.html">Accueil</a></li>' +
          '<li style="--i:1"><a class="nav-mobile-link" href="wedding-planner.html">Wedding Planner</a>' +
            '<div class="nav-mobile-sub"><a href="wedding-designer.html">— Wedding Designer</a></div></li>' +
          '<li style="--i:2"><a class="nav-mobile-link" href="portfolio.html">Portfolio</a></li>' +
          '<li style="--i:3"><a class="nav-mobile-link" href="blog.html">Blog</a></li>' +
          '<li style="--i:4"><a class="nav-mobile-link" href="contact.html">Contact</a></li>' +
        "</ul>" +
        '<div class="nav-overlay__footer">' +
          '<span class="magnetic"><a class="btn" href="contact.html" data-confetti><span class="btn__label">Je me marie&nbsp;!</span></a></span>' +
          '<p class="nav-overlay__contact">07 68 18 94 58<br><a href="mailto:contact@maisonjoliewedding.com">contact@maisonjoliewedding.com</a></p>' +
        "</div>" +
      "</div>" +
    "</div>";

  var year = new Date().getFullYear();

  var footer =
    '<div class="footer-wave" aria-hidden="true">' +
      '<svg viewBox="0 0 1440 90" preserveAspectRatio="none"><path fill="currentColor" d="M0,40 C240,90 480,0 720,32 C960,64 1200,96 1440,44 L1440,0 L0,0 Z"/></svg>' +
    "</div>" +
    '<svg class="footer-botanic" viewBox="0 0 400 300" aria-hidden="true" preserveAspectRatio="xMidYMid slice">' +
      '<g fill="none" stroke="currentColor" stroke-width="1">' +
        '<path d="M40 300 C40 200 80 140 60 60"/>' +
        '<path d="M60 120 C90 110 110 130 120 120"/><path d="M55 160 C25 150 15 170 5 160"/>' +
        '<path d="M62 200 C95 190 115 210 128 200"/>' +
        '<path d="M360 300 C360 210 320 150 345 70"/>' +
        '<path d="M345 130 C315 120 295 140 285 130"/><path d="M352 175 C382 165 392 185 400 175"/>' +
      "</g>" +
    "</svg>" +
    '<div class="container-wide footer-inner">' +
      '<div class="footer-top">' +
        "<div>" +
          MJ.monogram("footer-mono") +
          '<p class="footer-baseline">Des mariages élégants, pensés avec le cœur.</p>' +
        "</div>" +
        '<div class="footer-col">' +
          "<h4>Navigation</h4>" +
          '<ul><li><a href="index.html">Accueil</a></li>' +
          '<li><a href="wedding-planner.html">Wedding Planner</a></li>' +
          '<li><a href="wedding-designer.html">Wedding Designer</a></li>' +
          '<li><a href="portfolio.html">Portfolio</a></li>' +
          '<li><a href="blog.html">Blog</a></li></ul>' +
        "</div>" +
        '<div class="footer-col">' +
          "<h4>Contact</h4>" +
          '<ul><li><a href="tel:+33768189458">07 68 18 94 58</a></li>' +
          '<li><a href="mailto:contact@maisonjoliewedding.com">contact@maisonjoliewedding.com</a></li>' +
          '<li><a href="' + INSTA + '" target="_blank" rel="noopener">@maisonjolie_wedding</a></li>' +
          '<li><p>Montpellier · Béziers · Narbonne</p></li></ul>' +
        "</div>" +
        '<div class="footer-col">' +
          "<h4>Restons en lien</h4>" +
          '<p>Inspirations, coulisses et conseils, quelques fois par an — jamais plus.</p>' +
          '<form class="footer-news" data-newsletter novalidate>' +
            '<label class="sr-only" for="nl-email">Votre e-mail</label>' +
            '<input id="nl-email" type="email" name="email" placeholder="Votre e-mail" autocomplete="email" required>' +
            '<button type="submit" aria-label="S’inscrire à la newsletter"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>' +
          "</form>" +
          '<label class="footer-consent"><input type="checkbox" required> J’accepte de recevoir la newsletter et la <a href="politique-confidentialite.html">politique de confidentialité</a>.</label>' +
        "</div>" +
      "</div>" +
      '<div class="footer-bottom">' +
        '<p>© ' + year + " Maison Jolie Wedding — Tous droits réservés.</p>" +
        '<nav class="footer-links" aria-label="Liens légaux"><a href="mentions-legales-cgv.html">Mentions légales & CGV</a> · <a href="politique-confidentialite.html">Confidentialité</a> · <a href="#" data-cookie-open>Cookies</a></nav>' +
        '<div class="footer-social">' +
          '<a href="' + INSTA + '" target="_blank" rel="noopener" aria-label="Instagram">' + igIcon + "</a>" +
        "</div>" +
      "</div>" +
      '<p class="footer-bottom footer-credit" style="justify-content:center;border:0;padding-top:0.4rem;">Conçu comme un faire-part — avec soin &amp; lumière du Sud.</p>' +
    "</div>";

  var h = document.querySelector('[data-mj="header"]');
  if (h) { h.className = "site-header"; h.innerHTML = header; }

  var f = document.querySelector('[data-mj="footer"]');
  if (f) { f.className = "site-footer"; f.innerHTML = footer; }

  document.dispatchEvent(new CustomEvent("mj:components-ready"));
})();
