/* ============================================================
   transitions.js — Transitions inter-pages (§12)
   Voile/rideau blush→soleil + monogramme. Fallback sans JS : OK.
   ============================================================ */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Construit le voile
  var veil = document.createElement("div");
  veil.className = "page-veil";
  veil.setAttribute("aria-hidden", "true");
  veil.innerHTML =
    '<div class="page-veil__pane top"></div>' +
    '<div class="page-veil__pane bottom"></div>' +
    (window.MJ && MJ.monogram ? MJ.monogram("page-veil__mono mono-stroke-wrap") : "");
  document.body.appendChild(veil);
  // le monogramme injecté a la classe brand__mono-like : forcer le stroke
  var monoSvg = veil.querySelector("svg");
  if (monoSvg) monoSvg.classList.add("page-veil__mono");

  // Entrée : si l'on vient d'une navigation interne
  var came = false;
  try { came = sessionStorage.getItem("mj_nav") === "1"; } catch (e) {}
  if (came && !reduce) {
    veil.classList.add("active");
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        veil.classList.remove("active");
      });
    });
  }
  try { sessionStorage.removeItem("mj_nav"); } catch (e) {}

  function isInternal(a) {
    if (!a) return false;
    if (a.target === "_blank") return false;
    if (a.hasAttribute("download")) return false;
    if (a.getAttribute("data-cookie-open") !== null) return false;
    var href = a.getAttribute("href") || "";
    if (!href || href.charAt(0) === "#") return false;
    if (/^(mailto:|tel:|http:|https:)/i.test(href)) {
      // lien externe absolu → laisser
      return false;
    }
    return /\.html($|[?#])/.test(href) || href.indexOf(".html") !== -1;
  }

  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    var a = e.target.closest("a");
    if (!isInternal(a)) return;
    var href = a.getAttribute("href");
    // même page → ignorer
    if (href === (window.location.pathname.split("/").pop() || "index.html")) return;

    e.preventDefault();
    try { sessionStorage.setItem("mj_nav", "1"); } catch (er) {}

    if (reduce) { window.location.href = href; return; }
    veil.classList.add("active");
    setTimeout(function () { window.location.href = href; }, 620);
  });

  // Sécurité bfcache : retour arrière → nettoyer le voile
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) { veil.classList.remove("active"); }
  });
})();
