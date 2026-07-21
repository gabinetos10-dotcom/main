/* ============================================================
   moodboard.js — Feature signature « Composez votre univers » (§9)
   Générateur de moodboard interactif, 100% vanilla + <canvas>.
   Accessible clavier, recompose en direct, débouche sur le contact.
   ============================================================ */
(function () {
  "use strict";

  var root = document.querySelector("[data-moodboard]");
  if (!root) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canvas = root.querySelector("#moodboard-canvas");
  var ctx = canvas.getContext("2d");

  /* ---------------- Données ---------------- */
  var STEPS = [
    {
      key: "ambiance", title: "L'ambiance", hint: "Le fil conducteur de votre journée.", multi: false,
      options: [
        { id: "boheme", name: "Bohème", desc: "Libre, chaleureux, pampa", palette: ["#F6D2CE", "#F4C871", "#AFC7A6", "#E38B6D"] },
        { id: "minerale", name: "Élégance minérale", desc: "Épuré, terreux, précieux", palette: ["#EFE6DB", "#C9B79C", "#AFC7A6", "#46343B"] },
        { id: "jardin", name: "Romantique jardin", desc: "Fleuri, tendre, poudré", palette: ["#F6D2CE", "#E39AA1", "#AFC7A6", "#FBE3A1"] },
        { id: "solaire", name: "Solaire méditerranéen", desc: "Doré, vibrant, olivier", palette: ["#FBE3A1", "#F4C871", "#E38B6D", "#AFC7A6"] }
      ]
    },
    {
      key: "palette", title: "La palette", hint: "Choisissez l'accord de couleurs qui vous ressemble.", multi: false,
      options: [
        { id: "blush", name: "Blush & miel", desc: "Douceur solaire", palette: ["#F6D2CE", "#FBE3A1", "#E39AA1", "#F4C871"] },
        { id: "sauge", name: "Sauge & crème", desc: "Botanique apaisé", palette: ["#EDE7DC", "#AFC7A6", "#C9B79C", "#8FA986"] },
        { id: "terracotta", name: "Terracotta & or", desc: "Chaleur du Sud", palette: ["#E38B6D", "#F4C871", "#C9A227", "#F6D2CE"] },
        { id: "prune", name: "Prune & poudre", desc: "Nuit précieuse", palette: ["#46343B", "#E39AA1", "#F6D2CE", "#C9A227"] }
      ]
    },
    {
      key: "fleurs", title: "Les fleurs", hint: "Jusqu'à deux essences — cliquez pour composer.", multi: true, max: 2,
      options: [
        { id: "pampa", name: "Herbe de la pampa", desc: "Nuage doré" },
        { id: "olivier", name: "Rameaux d'olivier", desc: "Vert argenté" },
        { id: "roses", name: "Roses de jardin", desc: "Rondeur tendre" },
        { id: "saison", name: "Fleurs de saison", desc: "Au gré du marché" }
      ]
    },
    {
      key: "lieu", title: "Le lieu", hint: "Le décor de votre oui.", multi: false,
      options: [
        { id: "domaine", name: "Domaine viticole", desc: "Vignes & pierres" },
        { id: "mas", name: "Mas provençal", desc: "Volets & cyprès" },
        { id: "mer", name: "Bord de mer", desc: "Horizon & lumière" },
        { id: "orangerie", name: "Orangerie", desc: "Verrière & arches" }
      ]
    },
    {
      key: "details", title: "Les détails", hint: "La signature papeterie — jusqu'à deux.", multi: true, max: 2,
      options: [
        { id: "sceau", name: "Sceau de cire", desc: "Cachet précieux" },
        { id: "calligraphie", name: "Calligraphie", desc: "Prénoms à la plume" },
        { id: "ruban", name: "Ruban de soie", desc: "Noué à la main" },
        { id: "calque", name: "Papier calque", desc: "Transparence délicate" }
      ]
    }
  ];

  // Noms de style générés selon l'ambiance
  var STYLE_NAMES = {
    boheme: "L'Âme bohème",
    minerale: "L'Épure minérale",
    jardin: "Le Jardin romantique",
    solaire: "Le Songe solaire"
  };
  // Textes « voix de Mélina » — CONTENU RÉDIGÉ (à valider) voix de marque
  var MELINA_WORDS = {
    boheme: "Un mariage qui respire la liberté : matières brutes, pampa dorée et lumière rasante. Je composerais pour vous une scénographie chaleureuse, sincère, où chaque détail semble avoir toujours été là.",
    minerale: "Une élégance qui parle à voix basse. Des tons terreux, des matières nobles, une précision douce. J'imaginerais des tables épurées où la beauté naît de la justesse plus que de l'abondance.",
    jardin: "Le romantisme d'un jardin au petit matin. Roses de saison, verts tendres, rose poudré. Je dessinerais un décor foisonnant et délicat, à l'image d'un amour qui s'épanouit.",
    solaire: "Toute la lumière du Sud dans une journée. Or, olivier, terracotta : une fête vibrante et généreuse. Je créerais une ambiance solaire où l'on se sent, tout simplement, heureux."
  };

  /* ---------------- État ---------------- */
  var state = { ambiance: null, palette: null, fleurs: [], lieu: null, details: [] };
  var stepIndex = 0;

  /* ---------------- Refs DOM ---------------- */
  var dotsEl = root.querySelector(".game__steps");
  var titleEl = root.querySelector(".game__step-title");
  var hintEl = root.querySelector(".game__step-hint");
  var optionsEl = root.querySelector(".game__options");
  var prevBtn = root.querySelector(".game__prev");
  var nextBtn = root.querySelector(".game__next");
  var quiz = root.querySelector(".game__quiz");

  /* ---------------- Rendu des étapes (dots) ---------------- */
  function renderDots() {
    dotsEl.innerHTML = "";
    STEPS.forEach(function (s, i) {
      var d = document.createElement("span");
      d.className = "game__step-dot" + (i === stepIndex ? " active" : (i < stepIndex ? " done" : ""));
      dotsEl.appendChild(d);
    });
  }

  function currentPalette() {
    // priorité à la palette explicite, sinon celle de l'ambiance
    if (state.palette) {
      var p = STEPS[1].options.find(function (o) { return o.id === state.palette; });
      if (p) return p.palette;
    }
    if (state.ambiance) {
      var a = STEPS[0].options.find(function (o) { return o.id === state.ambiance; });
      if (a) return a.palette;
    }
    return ["#F6D2CE", "#FBE3A1", "#AFC7A6", "#E38B6D"];
  }

  /* ---------------- Rendu des options ---------------- */
  function renderStep() {
    var step = STEPS[stepIndex];
    titleEl.textContent = step.title;
    hintEl.textContent = step.hint;
    optionsEl.innerHTML = "";
    renderDots();

    step.options.forEach(function (opt) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "opt";
      btn.setAttribute("data-id", opt.id);

      var selected = step.multi
        ? state[step.key].indexOf(opt.id) !== -1
        : state[step.key] === opt.id;
      btn.setAttribute("aria-pressed", selected ? "true" : "false");

      var swatches = "";
      if (opt.palette) {
        swatches = '<span class="opt__swatches">' +
          opt.palette.map(function (c) { return '<span style="background:' + c + '"></span>'; }).join("") +
          "</span>";
      }
      btn.innerHTML = swatches +
        '<span class="opt__name">' + opt.name + "</span>" +
        '<span class="opt__desc">' + opt.desc + "</span>";

      btn.addEventListener("click", function () { choose(step, opt, btn); });
      optionsEl.appendChild(btn);
    });

    prevBtn.disabled = stepIndex === 0;
    nextBtn.querySelector(".label").textContent =
      stepIndex === STEPS.length - 1 ? "Révéler mon univers" : "Continuer";
    updateNavState();
  }

  function choose(step, opt, btn) {
    if (step.multi) {
      var arr = state[step.key];
      var idx = arr.indexOf(opt.id);
      if (idx !== -1) { arr.splice(idx, 1); btn.setAttribute("aria-pressed", "false"); }
      else {
        if (arr.length >= (step.max || 99)) {
          // retire le plus ancien pour respecter la limite
          var first = arr.shift();
          var firstBtn = optionsEl.querySelector('[data-id="' + first + '"]');
          if (firstBtn) firstBtn.setAttribute("aria-pressed", "false");
        }
        arr.push(opt.id); btn.setAttribute("aria-pressed", "true");
      }
    } else {
      state[step.key] = opt.id;
      optionsEl.querySelectorAll(".opt").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
      btn.setAttribute("aria-pressed", "true");
      // la palette influence aussi le fond du site (le site réagit)
      if (step.key === "palette" || step.key === "ambiance") tintSite();
    }
    draw();
    updateNavState();
  }

  function updateNavState() {
    var step = STEPS[stepIndex];
    var chosen = step.multi ? state[step.key].length > 0 : !!state[step.key];
    nextBtn.disabled = !chosen;
    nextBtn.style.opacity = chosen ? "1" : "0.45";
  }

  /* ---------------- Le site réagit (mesh + pétales) ---------------- */
  function tintSite() {
    var pal = currentPalette();
    document.dispatchEvent(new CustomEvent("mj:palette", { detail: { colors: pal } }));
    // halo derrière le stage
    var stage = root.querySelector(".game__stage");
    if (stage) stage.style.boxShadow = "inset 0 0 120px -20px " + pal[0] + "55";
  }

  /* ---------------- Navigation ---------------- */
  prevBtn.addEventListener("click", function () {
    if (stepIndex > 0) { stepIndex--; renderStep(); }
  });
  nextBtn.addEventListener("click", function () {
    var step = STEPS[stepIndex];
    var chosen = step.multi ? state[step.key].length > 0 : !!state[step.key];
    if (!chosen) return;
    if (stepIndex < STEPS.length - 1) { stepIndex++; renderStep(); }
    else complete();
  });

  /* ================= DESSIN DU MOODBOARD ================= */
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var CW = 0, CH = 0;
  function sizeCanvas() {
    CW = canvas.clientWidth; CH = canvas.clientHeight;
    canvas.width = CW * DPR; canvas.height = CH * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function lerpColor(a, b, t) {
    function h(x) { return [parseInt(x.slice(1, 3), 16), parseInt(x.slice(3, 5), 16), parseInt(x.slice(5, 7), 16)]; }
    var ca = h(a), cb = h(b);
    return "rgb(" + Math.round(ca[0] + (cb[0] - ca[0]) * t) + "," +
      Math.round(ca[1] + (cb[1] - ca[1]) * t) + "," +
      Math.round(ca[2] + (cb[2] - ca[2]) * t) + ")";
  }

  function draw() {
    if (!CW) sizeCanvas();
    var pal = currentPalette();
    ctx.clearRect(0, 0, CW, CH);

    // 1. Fond dégradé
    var g = ctx.createLinearGradient(0, 0, CW, CH);
    g.addColorStop(0, pal[0]); g.addColorStop(0.55, pal[1]); g.addColorStop(1, lerpColor(pal[1], pal[3], 0.4));
    ctx.fillStyle = g; ctx.fillRect(0, 0, CW, CH);

    // 2. Blobs mesh doux
    softBlob(CW * 0.25, CH * 0.28, CW * 0.5, pal[2], 0.45);
    softBlob(CW * 0.8, CH * 0.7, CW * 0.55, pal[3], 0.35);
    softBlob(CW * 0.6, CH * 0.15, CW * 0.4, pal[1], 0.4);

    // 3. Décor du lieu (bas)
    drawLieu(pal);

    // 4. Fleurs
    drawFleurs(pal);

    // 5. Carte papeterie centrale
    drawCard(pal);

    // 6. Grain léger
    grain();
  }

  function softBlob(x, y, r, color, alpha) {
    var rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, hexA(color, alpha));
    rg.addColorStop(1, hexA(color, 0));
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  function hexA(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
  }

  function drawLieu(pal) {
    var base = CH * 0.82;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = hexA("#46343B", 0.14);
    if (state.lieu === "mer") {
      // vagues + soleil
      ctx.fillStyle = hexA(pal[3], 0.2);
      for (var w = 0; w < 3; w++) {
        ctx.beginPath();
        ctx.moveTo(0, base + w * 14);
        for (var x = 0; x <= CW; x += 20) ctx.lineTo(x, base + w * 14 + Math.sin(x / 30 + w) * 5);
        ctx.lineTo(CW, CH); ctx.lineTo(0, CH); ctx.fill();
      }
    } else if (state.lieu === "orangerie") {
      // arches en verrière
      ctx.strokeStyle = hexA("#46343B", 0.28); ctx.lineWidth = 2;
      for (var a = 0; a < 4; a++) {
        var ax = CW * (0.15 + a * 0.23);
        ctx.beginPath();
        ctx.moveTo(ax, base);
        ctx.quadraticCurveTo(ax, base - 90, ax + CW * 0.11, base - 90);
        ctx.quadraticCurveTo(ax + CW * 0.22, base - 90, ax + CW * 0.22, base);
        ctx.stroke();
      }
    } else if (state.lieu === "mas") {
      // maison + cyprès
      ctx.fillStyle = hexA("#46343B", 0.16);
      ctx.fillRect(CW * 0.35, base - 70, CW * 0.3, 70);
      ctx.beginPath(); ctx.moveTo(CW * 0.33, base - 70); ctx.lineTo(CW * 0.5, base - 105); ctx.lineTo(CW * 0.67, base - 70); ctx.fill();
      for (var c = 0; c < 3; c++) {
        var cx = CW * (0.18 + c * 0.03) + (c > 1 ? CW * 0.55 : 0);
        ctx.beginPath(); ctx.ellipse(cx, base - 40, 10, 45, 0, 0, Math.PI * 2); ctx.fill();
      }
    } else if (state.lieu === "domaine") {
      // rangs de vignes (collines)
      ctx.fillStyle = hexA(pal[2], 0.4);
      ctx.beginPath(); ctx.moveTo(0, base);
      ctx.quadraticCurveTo(CW * 0.3, base - 50, CW * 0.55, base - 10);
      ctx.quadraticCurveTo(CW * 0.8, base + 20, CW, base - 30);
      ctx.lineTo(CW, CH); ctx.lineTo(0, CH); ctx.fill();
    }
    // sol
    ctx.fillStyle = hexA("#46343B", 0.08);
    ctx.fillRect(0, base, CW, CH - base);
    ctx.restore();
  }

  function drawFleurs(pal) {
    var y0 = CH * 0.82;
    if (state.fleurs.indexOf("olivier") !== -1) branch(CW * 0.14, y0, -0.5, pal, "#7f9a74");
    if (state.fleurs.indexOf("pampa") !== -1) pampa(CW * 0.86, y0, pal);
    if (state.fleurs.indexOf("roses") !== -1) { rose(CW * 0.22, y0 - 30, pal[2]); rose(CW * 0.3, y0 - 8, pal[0]); }
    if (state.fleurs.indexOf("saison") !== -1) { daisy(CW * 0.78, y0 - 26, pal[1]); daisy(CW * 0.7, y0 - 4, pal[3]); }
  }
  function branch(x, y, dir, pal, col) {
    ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + dir * 30, y - 70, x + dir * 15, y - 130); ctx.stroke();
    for (var i = 0; i < 8; i++) {
      var t = i / 8; var lx = x + dir * (18 - t * 6) - dir * 26 * Math.sin(t * 3);
      var ly = y - t * 130;
      ctx.beginPath(); ctx.ellipse(lx, ly, 8, 3.4, (i % 2 ? 0.6 : -0.6), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function pampa(x, y, pal) {
    ctx.save(); ctx.strokeStyle = hexA(pal[1], 0.9); ctx.lineWidth = 1.4;
    for (var s = 0; s < 3; s++) {
      var bx = x + (s - 1) * 22;
      ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(bx - 6, y - 150); ctx.stroke();
      for (var f = 0; f < 26; f++) {
        var ty = y - 40 - (f / 26) * 110;
        var side = f % 2 ? 1 : -1;
        ctx.beginPath(); ctx.moveTo(bx - 6 * (ty - y) / -150, ty);
        ctx.lineTo(bx - 6 * (ty - y) / -150 + side * 16, ty - 8); ctx.stroke();
      }
    }
    ctx.restore();
  }
  function rose(x, y, col) {
    ctx.save(); ctx.fillStyle = col; ctx.strokeStyle = "#7f9a74"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y + 40); ctx.lineTo(x, y + 6); ctx.stroke();
    for (var r = 3; r > 0; r--) { ctx.globalAlpha = 0.5 + r * 0.15; ctx.beginPath(); ctx.arc(x, y, r * 5, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  function daisy(x, y, col) {
    ctx.save(); ctx.fillStyle = col;
    for (var p = 0; p < 8; p++) { var a = p / 8 * Math.PI * 2; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 9, y + Math.sin(a) * 9, 5, 2.4, a, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#C9A227"; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#7f9a74"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.lineTo(x, y + 40); ctx.stroke();
    ctx.restore();
  }

  function drawCard(pal) {
    var w = CW * 0.44, h = CH * 0.5, x = (CW - w) / 2, y = (CH - h) / 2 - CH * 0.02;
    ctx.save();
    ctx.shadowColor = "rgba(70,52,59,0.35)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 14;
    ctx.fillStyle = "#FFFDFA";
    roundRect(x, y, w, h, 10); ctx.fill();
    ctx.shadowColor = "transparent";

    // filet or
    ctx.strokeStyle = hexA("#C9A227", 0.7); ctx.lineWidth = 1;
    roundRect(x + 8, y + 8, w - 16, h - 16, 6); ctx.stroke();

    var cx = x + w / 2;
    // Calligraphie / initiales
    ctx.fillStyle = "#46343B"; ctx.textAlign = "center";
    ctx.font = "500 " + Math.round(w * 0.09) + "px 'Fraunces', Georgia, serif";
    ctx.fillText("M  &  V", cx, y + h * 0.3);
    ctx.fillStyle = "#C56A73";
    var showCalli = state.details.indexOf("calligraphie") !== -1;
    ctx.font = (showCalli ? Math.round(w * 0.12) : Math.round(w * 0.08)) + "px 'Ephesis', cursive";
    ctx.fillText("nous nous marions", cx, y + h * 0.46);

    // Ruban
    if (state.details.indexOf("ruban") !== -1) {
      ctx.strokeStyle = pal[3]; ctx.lineWidth = 4; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x + 4, y + h * 0.62);
      ctx.quadraticCurveTo(cx, y + h * 0.55, x + w - 4, y + h * 0.62);
      ctx.stroke();
      // nœud
      ctx.beginPath(); ctx.arc(cx, y + h * 0.585, 5, 0, Math.PI * 2); ctx.fillStyle = pal[3]; ctx.fill();
    }
    // Papier calque (voile translucide)
    if (state.details.indexOf("calque") !== -1) {
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      roundRect(x + w * 0.12, y + h * 0.7, w * 0.76, h * 0.22, 4); ctx.fill();
    }
    // Sceau de cire
    if (state.details.indexOf("sceau") !== -1) {
      var sx = cx, sy = y + h * 0.8;
      ctx.fillStyle = "#B45B49";
      ctx.beginPath();
      for (var i = 0; i < 12; i++) { var a = i / 12 * Math.PI * 2; var rr = i % 2 ? 15 : 18; ctx.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#8f3f30"; ctx.font = "600 13px 'Fraunces', serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("MJ", sx, sy + 1); ctx.textBaseline = "alphabetic";
    }
    ctx.restore();
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

  var grainPattern = null;
  function grain() {
    ctx.save(); ctx.globalAlpha = 0.04; ctx.globalCompositeOperation = "multiply";
    for (var i = 0; i < 400; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? "#46343B" : "#ffffff";
      ctx.fillRect(Math.random() * CW, Math.random() * CH, 1, 1);
    }
    ctx.restore();
  }

  /* ================= RÉSULTAT ================= */
  function complete() {
    root.classList.add("is-complete");
    var amb = state.ambiance || "solaire";
    var result = root.querySelector(".game__result");
    result.querySelector(".game__result-style").textContent = STYLE_NAMES[amb];
    var ambName = (STEPS[0].options.find(function (o) { return o.id === amb; }) || {}).name || "";
    result.querySelector(".game__result-name").textContent = "Votre univers : " + ambName;
    result.querySelector(".game__result-text").textContent = MELINA_WORDS[amb];

    // Lien pré-rempli vers le contact
    var details = summarize();
    var link = result.querySelector(".game__result-cta");
    if (link) {
      link.href = "contact.html?univers=" + encodeURIComponent(ambName) +
        "&details=" + encodeURIComponent(details);
    }

    if (!reduce && window.MJ && MJ.confetti) {
      var r = canvas.getBoundingClientRect();
      MJ.confetti(r.left + r.width / 2, r.top + r.height / 2, 70);
    }
    if (window.MJ && MJ.toast) MJ.toast("Votre univers est prêt ✨", "Découvrez le mot de Mélina.");
    result.setAttribute("tabindex", "-1");
    result.focus();
  }

  function labelOf(stepKey, id) {
    var step = STEPS.find(function (s) { return s.key === stepKey; });
    var o = step.options.find(function (x) { return x.id === id; });
    return o ? o.name : id;
  }
  function summarize() {
    var parts = [];
    if (state.palette) parts.push("palette " + labelOf("palette", state.palette));
    if (state.fleurs.length) parts.push("fleurs : " + state.fleurs.map(function (f) { return labelOf("fleurs", f); }).join(", "));
    if (state.lieu) parts.push("lieu : " + labelOf("lieu", state.lieu));
    if (state.details.length) parts.push("détails : " + state.details.map(function (d) { return labelOf("details", d); }).join(", "));
    return parts.join(" · ");
  }

  /* ---------------- Actions résultat ---------------- */
  root.querySelector(".game__restart").addEventListener("click", function () {
    state = { ambiance: null, palette: null, fleurs: [], lieu: null, details: [] };
    stepIndex = 0;
    root.classList.remove("is-complete");
    renderStep(); draw();
    quiz.focus();
  });

  root.querySelector(".game__share").addEventListener("click", function () {
    // Export du canvas en image (§9)
    try {
      canvas.toBlob(function (blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url; a.download = "mon-univers-maison-jolie.png";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        if (window.MJ && MJ.toast) MJ.toast("Moodboard enregistré 🤍", "Partagez-le, il est à vous.");
      });
    } catch (e) {
      if (window.MJ && MJ.toast) MJ.toast("Export indisponible", "Réessayez depuis un autre navigateur.", "err");
    }
  });

  /* ---------------- Init ---------------- */
  function init() {
    sizeCanvas();
    renderStep();
    // dessin après chargement des polices (pour le texte du canvas)
    draw();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { draw(); });
    }
  }

  var rt;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () { sizeCanvas(); draw(); }, 200);
  });

  // Dessin paresseux quand le jeu entre à l'écran
  var io = new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting) { init(); io.disconnect(); }
  }, { threshold: 0.2 });
  io.observe(root);
})();
