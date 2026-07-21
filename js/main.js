/* ============================================================
   main.js — Utilitaires partagés + micro-interactions globales
   Expose : MJ.confetti(), MJ.toast()
   Gère : curseur custom, boutons magnétiques, tilt 3D, compteurs
   ============================================================ */
(function () {
  "use strict";
  window.MJ = window.MJ || {};

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var CONF_COLORS = ["#F6D2CE", "#FBE3A1", "#E39AA1", "#AFC7A6", "#F4C871", "#E38B6D", "#C9A227"];

  /* -------------------------------------------------
     CONFETTIS / PÉTALES sur actions clés (§10)
     ------------------------------------------------- */
  var confCanvas, confCtx, confParts = [], confRAF = null;
  function ensureConfCanvas() {
    if (confCanvas) return;
    confCanvas = document.createElement("canvas");
    confCanvas.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:95;";
    document.body.appendChild(confCanvas);
    confCtx = confCanvas.getContext("2d");
    sizeConf();
    window.addEventListener("resize", sizeConf);
  }
  function sizeConf() {
    if (!confCanvas) return;
    confCanvas.width = window.innerWidth;
    confCanvas.height = window.innerHeight;
  }
  MJ.confetti = function (x, y, amount) {
    if (reduce) return;
    ensureConfCanvas();
    x = x == null ? window.innerWidth / 2 : x;
    y = y == null ? window.innerHeight / 2 : y;
    var n = amount || 44;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 4 + Math.random() * 9;
      confParts.push({
        x: x, y: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 4,
        g: 0.16 + Math.random() * 0.12,
        size: 5 + Math.random() * 7,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: CONF_COLORS[(Math.random() * CONF_COLORS.length) | 0],
        life: 1,
        decay: 0.008 + Math.random() * 0.01
      });
    }
    if (!confRAF) confRAF = requestAnimationFrame(confLoop);
  };
  function confLoop() {
    confCtx.clearRect(0, 0, confCanvas.width, confCanvas.height);
    for (var i = confParts.length - 1; i >= 0; i--) {
      var p = confParts[i];
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= p.decay;
      if (p.life <= 0 || p.y > confCanvas.height + 40) { confParts.splice(i, 1); continue; }
      confCtx.save();
      confCtx.translate(p.x, p.y);
      confCtx.rotate(p.rot);
      confCtx.globalAlpha = Math.max(p.life, 0);
      confCtx.fillStyle = p.color;
      var s = p.size;
      confCtx.beginPath();
      confCtx.moveTo(0, -s);
      confCtx.bezierCurveTo(s * 0.7, -s * 0.5, s * 0.7, s * 0.5, 0, s);
      confCtx.bezierCurveTo(-s * 0.7, s * 0.5, -s * 0.7, -s * 0.5, 0, -s);
      confCtx.fill();
      confCtx.restore();
    }
    if (confParts.length) { confRAF = requestAnimationFrame(confLoop); }
    else { confRAF = null; confCtx.clearRect(0, 0, confCanvas.width, confCanvas.height); }
  }

  // Confetti au survol/clic sur éléments [data-confetti]
  document.addEventListener("mouseover", function (e) {
    var t = e.target.closest("[data-confetti]");
    if (t && fine && !t._confCooldown) {
      t._confCooldown = true;
      var r = t.getBoundingClientRect();
      MJ.confetti(r.left + r.width / 2, r.top + r.height / 2, 16);
      setTimeout(function () { t._confCooldown = false; }, 900);
    }
  });

  /* -------------------------------------------------
     TOASTS custom (§10)
     ------------------------------------------------- */
  var toastStack;
  MJ.toast = function (title, message, type) {
    if (!toastStack) {
      toastStack = document.createElement("div");
      toastStack.className = "toast-stack";
      toastStack.setAttribute("role", "status");
      toastStack.setAttribute("aria-live", "polite");
      document.body.appendChild(toastStack);
    }
    var t = document.createElement("div");
    t.className = "toast";
    if (type === "err") t.style.borderLeftColor = "#b04a3a";
    t.innerHTML = "<strong>" + title + "</strong>" + (message ? message : "");
    toastStack.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("show"); });
    setTimeout(function () {
      t.classList.remove("show");
      setTimeout(function () { t.remove(); }, 600);
    }, 4200);
  };

  /* -------------------------------------------------
     CURSEUR PERSONNALISÉ (§10)
     ------------------------------------------------- */
  if (fine && !reduce) {
    var dot = document.createElement("div"); dot.className = "cursor-dot";
    var halo = document.createElement("div"); halo.className = "cursor-halo";
    document.body.appendChild(dot); document.body.appendChild(halo);
    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var hx = mx, hy = my;
    document.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = "translate(" + mx + "px," + my + "px) translate(-50%,-50%)";
      document.body.classList.add("cursor-ready");
    });
    (function follow() {
      hx += (mx - hx) * 0.18; hy += (my - hy) * 0.18;
      halo.style.transform = "translate(" + hx + "px," + hy + "px) translate(-50%,-50%)";
      requestAnimationFrame(follow);
    })();
    document.addEventListener("mouseover", function (e) {
      if (e.target.closest('a, button, .opt, .gallery__item, input, textarea, select, [data-tilt]')) {
        document.body.classList.add("cursor-active");
      }
    });
    document.addEventListener("mouseout", function (e) {
      if (e.target.closest('a, button, .opt, .gallery__item, input, textarea, select, [data-tilt]')) {
        document.body.classList.remove("cursor-active");
      }
    });
  }

  /* -------------------------------------------------
     BOUTONS MAGNÉTIQUES (§10)
     ------------------------------------------------- */
  function initMagnetic() {
    if (!fine || reduce) return;
    document.querySelectorAll(".magnetic").forEach(function (wrap) {
      var el = wrap.querySelector(".btn") || wrap.firstElementChild;
      if (!el) return;
      wrap.addEventListener("mousemove", function (e) {
        var r = wrap.getBoundingClientRect();
        var x = e.clientX - r.left - r.width / 2;
        var y = e.clientY - r.top - r.height / 2;
        el.style.transform = "translate(" + x * 0.32 + "px," + y * 0.42 + "px)";
      });
      wrap.addEventListener("mouseleave", function () {
        el.style.transform = "translate(0,0)";
      });
    });
  }

  /* -------------------------------------------------
     TILT 3D (§10) — éléments [data-tilt]
     ------------------------------------------------- */
  function initTilt() {
    if (!fine || reduce) return;
    document.querySelectorAll("[data-tilt]").forEach(function (el) {
      var max = parseFloat(el.getAttribute("data-tilt")) || 8;
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = "perspective(900px) rotateY(" + (px * max) + "deg) rotateX(" + (-py * max) + "deg) translateY(-4px)";
      });
      el.addEventListener("mouseleave", function () {
        el.style.transform = "perspective(900px) rotateY(0) rotateX(0)";
      });
    });
  }

  /* -------------------------------------------------
     COMPTEURS ANIMÉS (§10)
     ------------------------------------------------- */
  function initCounters() {
    var counters = document.querySelectorAll("[data-count]");
    if (!counters.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        io.unobserve(el);
        var target = parseFloat(el.getAttribute("data-count"));
        var suffix = el.getAttribute("data-suffix") || "";
        if (reduce) { el.textContent = target + suffix; return; }
        var dur = 1400, t0 = performance.now();
        (function step(now) {
          var p = Math.min((now - t0) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased) + suffix;
          if (p < 1) requestAnimationFrame(step);
        })(performance.now());
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { io.observe(c); });
  }

  function boot() {
    initMagnetic();
    initTilt();
    initCounters();
  }

  // (re)initialiser après injection des composants + au chargement
  document.addEventListener("mj:components-ready", boot);
  if (document.readyState !== "loading") boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
