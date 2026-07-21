/* ============================================================
   preloader.js — Écran de chargement cinématographique (§6)
   Une fois par session (sessionStorage). Skippable après 1s.
   ============================================================ */
(function () {
  "use strict";

  var el = document.querySelector("[data-preloader]");
  var body = document.body;

  function revealSite() {
    body.classList.remove("preloading");
    body.classList.remove("is-locked");
    document.dispatchEvent(new CustomEvent("mj:preloader-done"));
  }

  // Pas de preloader sur cette page
  if (!el) { revealSite(); return; }

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var seen = false;
  try { seen = sessionStorage.getItem("mj_seen") === "1"; } catch (e) {}

  // Déjà vu OU reduced-motion → sortie immédiate/douce
  if (seen) {
    el.setAttribute("hidden", "");
    revealSite();
    return;
  }

  body.classList.add("preloading");

  var bar = el.querySelector(".preloader__bar span");
  var punchEl = el.querySelector(".preloader__punch");
  var skip = el.querySelector(".preloader__skip");

  var punchlines = [
    "On prépare votre plus belle histoire…",
    "On dresse la table…",
    "On accorde les couleurs…",
    "On noue le dernier ruban…"
  ];
  var pIndex = 0;
  if (punchEl) punchEl.textContent = punchlines[0];

  var punchTimer = setInterval(function () {
    pIndex = (pIndex + 1) % punchlines.length;
    if (!punchEl) return;
    punchEl.style.opacity = "0";
    setTimeout(function () {
      punchEl.textContent = punchlines[pIndex];
      punchEl.style.opacity = "1";
    }, 250);
  }, 900);

  var done = false;
  function finish() {
    if (done) return;
    done = true;
    clearInterval(punchTimer);
    try { sessionStorage.setItem("mj_seen", "1"); } catch (e) {}
    // le voile se soulève
    el.classList.add("lift");
    revealSite();
    setTimeout(function () {
      el.setAttribute("hidden", "");
    }, 1100);
  }

  if (reduce) {
    if (bar) bar.style.width = "100%";
    setTimeout(finish, 600);
    return;
  }

  // Progression pilotée dans le temps (~2.6s) + fin au chargement complet
  var start = performance.now();
  var TOTAL = 2600;
  var raf;
  function tick(now) {
    var t = Math.min((now - start) / TOTAL, 1);
    // easing out-expo
    var eased = 1 - Math.pow(2, -10 * t);
    if (bar) bar.style.width = (eased * 100).toFixed(1) + "%";
    if (t < 1) { raf = requestAnimationFrame(tick); }
    else { finish(); }
  }
  raf = requestAnimationFrame(tick);

  // Skip après 1s
  setTimeout(function () {
    if (skip) skip.classList.add("show");
  }, 1000);

  function trySkip() {
    if (performance.now() - start < 1000) return;
    cancelAnimationFrame(raf);
    if (bar) bar.style.width = "100%";
    finish();
  }
  el.addEventListener("click", trySkip);
  window.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === "Escape" || e.key === " ") trySkip();
  });

  // Sécurité : ne jamais bloquer plus de 5s
  setTimeout(finish, 5000);
})();
