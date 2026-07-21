/* ============================================================
   petals.js — Pétales dérivant en <canvas> (§5.2)
   Densité faible, réagit au curseur et au scroll, 60fps, throttlé.
   ============================================================ */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canvas = document.getElementById("petals-canvas");
  if (!canvas || reduce) return;

  var ctx = canvas.getContext("2d");
  var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
  var petals = [];
  var mouse = { x: -999, y: -999, active: false };
  var scrollV = 0, lastScroll = window.scrollY;

  // Teintes des pétales — accord solaire & poudré
  var COLORS = ["#F6D2CE", "#FBE3A1", "#E39AA1", "#AFC7A6", "#F4C871"];

  function count() {
    var w = window.innerWidth;
    if (w < 620) return 12;
    if (w < 1100) return 20;
    return 30;
  }

  function resize() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function Petal(initial) {
    this.reset(initial);
  }
  Petal.prototype.reset = function (initial) {
    this.x = Math.random() * W;
    this.y = initial ? Math.random() * H : -20;
    this.size = 5 + Math.random() * 9;
    this.speedY = 0.25 + Math.random() * 0.7;
    this.speedX = 0.15 + Math.random() * 0.5;
    this.rot = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.02;
    this.sway = Math.random() * Math.PI * 2;
    this.swaySpeed = 0.008 + Math.random() * 0.014;
    this.opacity = 0.35 + Math.random() * 0.4;
    this.color = COLORS[(Math.random() * COLORS.length) | 0];
  };
  Petal.prototype.step = function () {
    this.sway += this.swaySpeed;
    this.x += this.speedX + Math.sin(this.sway) * 0.4;
    this.y += this.speedY + scrollV * 0.015;
    this.rot += this.rotSpeed;

    // Réaction au curseur : le pétale s'écarte doucement
    if (mouse.active) {
      var dx = this.x - mouse.x, dy = this.y - mouse.y;
      var d2 = dx * dx + dy * dy;
      if (d2 < 14000) {
        var d = Math.sqrt(d2) || 1;
        var f = (1 - d / 118) * 1.4;
        this.x += (dx / d) * f;
        this.y += (dy / d) * f;
      }
    }
    if (this.y > H + 20 || this.x > W + 30) this.reset(false);
  };
  Petal.prototype.draw = function () {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;
    // forme de pétale (deux courbes)
    var s = this.size;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s * 0.7, -s * 0.5, s * 0.7, s * 0.5, 0, s);
    ctx.bezierCurveTo(-s * 0.7, s * 0.5, -s * 0.7, -s * 0.5, 0, -s);
    ctx.fill();
    ctx.restore();
  };

  function build() {
    petals = [];
    var n = count();
    for (var i = 0; i < n; i++) petals.push(new Petal(true));
  }

  var raf;
  function loop() {
    ctx.clearRect(0, 0, W, H);
    scrollV *= 0.9; // amortissement
    for (var i = 0; i < petals.length; i++) {
      petals[i].step();
      petals[i].draw();
    }
    raf = requestAnimationFrame(loop);
  }

  window.addEventListener("mousemove", function (e) {
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
  }, { passive: true });
  window.addEventListener("mouseout", function () { mouse.active = false; });

  window.addEventListener("scroll", function () {
    scrollV += (window.scrollY - lastScroll);
    lastScroll = window.scrollY;
  }, { passive: true });

  // Le site réagit au goût de l'utilisateur (mini-jeu moodboard §9)
  document.addEventListener("mj:palette", function (e) {
    if (e.detail && e.detail.colors && e.detail.colors.length) {
      COLORS = e.detail.colors.slice();
      for (var i = 0; i < petals.length; i++) {
        petals[i].color = COLORS[(Math.random() * COLORS.length) | 0];
      }
    }
  });

  var rt;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () { resize(); build(); }, 200);
  });

  // Pause si onglet caché (perf)
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { cancelAnimationFrame(raf); }
    else { loop(); }
  });

  resize();
  build();
  loop();
})();
