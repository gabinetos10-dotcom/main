/* ============================================================
   form.js — Formulaires (contact + newsletter) & bannière cookies
   Envoi : fallback mailto: (// TODO endpoint pour brancher un backend)
   ============================================================ */
(function () {
  "use strict";

  /* -------------------------------------------------
     FORMULAIRE CONTACT « Je me marie ! » (§8.10)
     ------------------------------------------------- */
  function initContactForm() {
    var form = document.querySelector("[data-contact-form]");
    if (!form) return;
    var status = form.querySelector(".form__status");

    // Pré-remplissage depuis le mini-jeu (paramètres d'URL)
    var params = new URLSearchParams(window.location.search);
    if (params.get("univers")) {
      var msg = form.querySelector('[name="message"]');
      var presta = form.querySelector('[name="prestation"]');
      if (msg && !msg.value) {
        msg.value = "Bonjour Mélina,\n\nJ'ai composé mon univers sur votre site : « " +
          params.get("univers") + " »" +
          (params.get("details") ? " (" + params.get("details") + ")" : "") +
          ".\nJ'aimerais qu'on en parle ensemble.\n\nÀ très vite !";
      }
      if (presta && params.get("univers")) presta.value = "designer";
      form.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      var btn = form.querySelector('button[type="submit"]');
      var label = btn ? btn.textContent : "";
      if (btn) { btn.disabled = true; btn.textContent = "Envoi en cours…"; }
      if (status) { status.textContent = ""; status.className = "form__status"; }

      // --- Récupération des champs ---
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });

      // TODO endpoint : brancher ici l'appel fetch() vers votre service
      // d'e-mail (ex. Formspree, Basin, une Cloud Function…).
      // fetch('https://votre-endpoint', { method:'POST', body: JSON.stringify(data) })

      // Fallback élégant : ouverture du client mail pré-rempli.
      setTimeout(function () {
        var subject = "Je me marie ! — " + (data.prenoms || "Futurs mariés");
        var body =
          "Prénoms : " + (data.prenoms || "") + "\n" +
          "Date envisagée : " + (data.date || "") + "\n" +
          "Lieu : " + (data.lieu || "") + "\n" +
          "Prestation : " + (data.prestation || "") + "\n\n" +
          (data.message || "");
        var mailto = "mailto:contact@maisonjoliewedding.com?subject=" +
          encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);

        if (window.MJ && MJ.confetti) {
          var r = form.getBoundingClientRect();
          MJ.confetti(r.left + r.width / 2, Math.max(r.top, 80), 60);
        }
        if (status) {
          status.textContent = "Merci ! Votre message est prêt — votre logiciel de messagerie va s'ouvrir pour l'envoyer à Mélina.";
          status.className = "form__status ok";
        }
        if (window.MJ && MJ.toast) MJ.toast("C'est noté 🤍", "Mélina vous répond sous 48h.");
        window.location.href = mailto;
        if (btn) { btn.disabled = false; btn.textContent = label; }
        form.reset();
      }, 700);
    });
  }

  /* -------------------------------------------------
     NEWSLETTER (footer)
     ------------------------------------------------- */
  function initNewsletter() {
    document.querySelectorAll("[data-newsletter]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var input = form.querySelector('input[type="email"]');
        if (!input || !input.value || !form.checkValidity()) { form.reportValidity(); return; }
        // TODO endpoint : brancher votre outil d'e-mailing
        if (window.MJ && MJ.toast) MJ.toast("Bienvenue dans la Maison 🤍", "Vous recevrez bientôt nos inspirations.");
        if (window.MJ && MJ.confetti) {
          var r = form.getBoundingClientRect();
          MJ.confetti(r.left + r.width / 2, r.top, 24);
        }
        form.reset();
      });
    });
  }

  /* -------------------------------------------------
     BANNIÈRE COOKIES RGPD (§19)
     ------------------------------------------------- */
  function initCookies() {
    var KEY = "mj_cookie_consent";
    var banner = document.querySelector("[data-cookie-banner]");
    if (!banner) return;
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}

    function show() { requestAnimationFrame(function () { banner.classList.add("show"); }); }
    function hide() { banner.classList.remove("show"); }
    function save(val) {
      try { localStorage.setItem(KEY, JSON.stringify(val)); } catch (e) {}
      hide();
      // Aucun dépôt de cookie tiers avant consentement : on n'active
      // les mesures d'audience QUE si val.analytics === true.
      // TODO : initialiser ici votre outil d'analytics si consenti.
    }

    if (!saved) { setTimeout(show, 1400); }

    var prefs = banner.querySelector(".cookie-prefs");
    banner.addEventListener("click", function (e) {
      var act = e.target.getAttribute("data-cookie");
      if (act === "accept") save({ necessary: true, analytics: true, date: Date.now() });
      else if (act === "refuse") save({ necessary: true, analytics: false, date: Date.now() });
      else if (act === "customize") { if (prefs) prefs.classList.toggle("show"); }
      else if (act === "save") {
        var an = banner.querySelector('[name="c-analytics"]');
        save({ necessary: true, analytics: an ? an.checked : false, date: Date.now() });
      }
    });

    // Rouvrir depuis le footer
    document.addEventListener("click", function (e) {
      if (e.target.closest("[data-cookie-open]")) { e.preventDefault(); show(); }
    });
  }

  function boot() {
    initContactForm();
    initNewsletter();
    initCookies();
  }
  if (document.readyState !== "loading") boot();
  else document.addEventListener("DOMContentLoaded", boot);
  document.addEventListener("mj:components-ready", function () {
    initNewsletter(); initCookies();
  });
})();
