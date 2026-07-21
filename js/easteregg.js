/* ============================================================
   easteregg.js — « Dites OUI » (§13)
   Taper « OUI » au clavier OU 5 clics sur le monogramme.
   ============================================================ */
(function () {
  "use strict";

  // Clin d'œil calligraphié pour les curieux
  try {
    console.log(
      "%cMaison Jolie Wedding",
      "font-size:22px;font-family:cursive;color:#E39AA1;"
    );
    console.log(
      "%c✦ Astuce : tapez « OUI » ou cliquez 5 fois sur le monogramme… ✦",
      "color:#C9A227;font-style:italic;"
    );
  } catch (e) {}

  var banner = null;
  function ensureBanner() {
    if (banner) return banner;
    banner = document.createElement("div");
    banner.className = "oui-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-live", "assertive");
    banner.innerHTML =
      '<span class="script">Félicitations&nbsp;!</span>' +
      "<p>Vous venez de dire <strong>oui</strong> 🤍</p>" +
      '<button type="button" aria-label="Fermer">Fermer ce petit bonheur</button>';
    document.body.appendChild(banner);
    banner.querySelector("button").addEventListener("click", hide);
    return banner;
  }

  var timer;
  function celebrate() {
    ensureBanner().classList.add("show");
    if (window.MJ && MJ.confetti) {
      // pluie de pétales depuis le haut
      var i = 0;
      var rain = setInterval(function () {
        MJ.confetti(Math.random() * window.innerWidth, -10, 10);
        if (++i > 8) clearInterval(rain);
      }, 140);
      MJ.confetti(window.innerWidth / 2, window.innerHeight / 2, 50);
    }
    clearTimeout(timer);
    timer = setTimeout(hide, 6000);
  }
  function hide() { if (banner) banner.classList.remove("show"); }

  // 1) Buffer clavier « OUI »
  var buffer = "";
  window.addEventListener("keydown", function (e) {
    if (e.key && e.key.length === 1) {
      buffer = (buffer + e.key).toUpperCase().slice(-3);
      if (buffer === "OUI") { buffer = ""; celebrate(); }
    }
  });

  // 2) Cinq clics sur le monogramme (délégation)
  var clicks = 0, clickTimer;
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".brand__mono, .brand")) return;
    clicks++;
    clearTimeout(clickTimer);
    clickTimer = setTimeout(function () { clicks = 0; }, 1200);
    if (clicks >= 5) { clicks = 0; celebrate(); }
  });
})();
