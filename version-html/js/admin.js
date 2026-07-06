/* Loc'N'Joy — tableau de bord admin (version statique).
   Mot de passe simple + données lues depuis localStorage. */

let view = "list";
let calMonth = new Date();
calMonth.setDate(1);

const CHIP_COLORS = ["#e11d2e", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#f97316"];
const STATUS_LABEL = { PENDING: "En attente", CONFIRMED: "Confirmée", CANCELLED: "Annulée" };

function carOf(slug) {
  return FLEET.find((c) => c.slug === slug) || { name: slug, brand: "", image: "" };
}
function chipColor(slug) {
  return CHIP_COLORS[FLEET.findIndex((c) => c.slug === slug) % CHIP_COLORS.length];
}

/* ---- Auth ---- */
function isAuthed() {
  return sessionStorage.getItem("lnj_admin") === "1";
}
document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const pwd = document.getElementById("login-password").value;
  if (pwd === ADMIN_PASSWORD) {
    sessionStorage.setItem("lnj_admin", "1");
    render();
  } else {
    document.getElementById("login-error").textContent = "Mot de passe incorrect.";
  }
});
document.getElementById("logout").addEventListener("click", () => {
  sessionStorage.removeItem("lnj_admin");
  render();
});

/* ---- Onglets ---- */
document.querySelectorAll(".tab").forEach((t) =>
  t.addEventListener("click", () => {
    view = t.dataset.view;
    document.querySelectorAll(".tab").forEach((x) =>
      x.classList.toggle("active", x.dataset.view === view)
    );
    renderContent();
  })
);

/* ---- Actions ---- */
function setStatus(id, status) {
  const bookings = getBookings();
  const b = bookings.find((x) => x.id === id);
  if (b) {
    b.status = status;
    saveBookings(bookings);
    render();
  }
}

/* ---- Rendu ---- */
function render() {
  const authed = isAuthed();
  document.getElementById("login-screen").style.display = authed ? "none" : "block";
  document.getElementById("dashboard").style.display = authed ? "block" : "none";
  if (authed) {
    const bookings = getBookings();
    const messages = getMessages();
    const pending = bookings.filter((b) => b.status === "PENDING").length;
    const confirmed = bookings.filter((b) => b.status === "CONFIRMED").length;
    document.getElementById("meta").textContent =
      `${pending} en attente · ${confirmed} confirmée${confirmed > 1 ? "s" : ""} · ` +
      `${messages.length} message${messages.length > 1 ? "s" : ""}`;
    renderContent();
  }
}

function renderContent() {
  const root = document.getElementById("content");
  root.innerHTML = "";
  if (view === "list") renderList(root);
  else if (view === "calendar") renderCal(root);
  else renderMessages(root);
}

function renderList(root) {
  const bookings = getBookings().slice().sort((a, b) => a.startDate.localeCompare(b.startDate));
  if (!bookings.length) {
    root.innerHTML = `<div class="empty-state">Aucune réservation pour le moment.<br>
      Les demandes faites sur la page d'accueil (dans ce navigateur) apparaîtront ici.</div>`;
    return;
  }
  bookings.forEach((b) => {
    const car = carOf(b.vehicleSlug);
    const row = document.createElement("div");
    row.className = "booking-row";
    row.innerHTML = `
      <img src="${car.image}" alt="">
      <div class="who">
        <b>${car.brand} ${car.name}</b>
        <span>${b.firstName} ${b.lastName}</span>
        <span>${b.email} · ${b.phone}</span>
      </div>
      <div class="when">
        Du ${formatFR(b.startDate)} à ${b.startTime}<br>
        Au ${formatFR(b.endDate)} à ${b.endTime}
      </div>
      <span class="badge ${b.status}">${STATUS_LABEL[b.status]}</span>
      <div class="row-actions">
        ${b.status !== "CONFIRMED" ? `<button class="action-btn approve" data-id="${b.id}" data-status="CONFIRMED">Approuver</button>` : ""}
        ${b.status !== "CANCELLED" ? `<button class="action-btn cancel" data-id="${b.id}" data-status="CANCELLED">Annuler</button>` : ""}
      </div>`;
    root.appendChild(row);
  });
  root.querySelectorAll(".action-btn").forEach((btn) =>
    btn.addEventListener("click", () => setStatus(btn.dataset.id, btn.dataset.status))
  );
}

function renderCal(root) {
  const bookings = getBookings().filter((b) => b.status !== "CANCELLED");
  const y = calMonth.getFullYear();
  const m = calMonth.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const firstDow = (new Date(y, m, 1).getDay() + 6) % 7;

  const wrap = document.createElement("div");
  wrap.className = "admin-cal";
  wrap.innerHTML = `
    <div class="cal-head">
      <button type="button" id="acal-prev" class="cal-nav">←</button>
      <span class="cal-title">${MONTHS_FR[m]} ${y}</span>
      <button type="button" id="acal-next" class="cal-nav">→</button>
    </div>
    <div class="cal-grid">
      <span class="cal-dow">Lun</span><span class="cal-dow">Mar</span><span class="cal-dow">Mer</span>
      <span class="cal-dow">Jeu</span><span class="cal-dow">Ven</span><span class="cal-dow">Sam</span><span class="cal-dow">Dim</span>
    </div>
    <div class="cal-grid" id="acal-days"></div>
    <p style="margin-top:16px;font-size:11px;color:var(--smoke)">
      Couleur pleine : confirmée · Couleur atténuée : en attente
    </p>`;
  root.appendChild(wrap);

  const grid = wrap.querySelector("#acal-days");
  for (let i = 0; i < firstDow; i++) grid.appendChild(document.createElement("span"));
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = toISO(new Date(y, m, d));
    const cell = document.createElement("div");
    cell.className = "cal-cell";
    cell.innerHTML = `<small>${d}</small>`;
    const dayBookings = bookings.filter((b) => iso >= b.startDate && iso <= b.endDate);
    dayBookings.slice(0, 3).forEach((b) => {
      const car = carOf(b.vehicleSlug);
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.textContent = car.name;
      chip.title = `${car.name} — ${b.firstName} ${b.lastName} (${STATUS_LABEL[b.status]})`;
      chip.style.backgroundColor = chipColor(b.vehicleSlug) + (b.status === "PENDING" ? "55" : "cc");
      cell.appendChild(chip);
    });
    if (dayBookings.length > 3) {
      const more = document.createElement("small");
      more.textContent = `+${dayBookings.length - 3}`;
      cell.appendChild(more);
    }
    grid.appendChild(cell);
  }

  wrap.querySelector("#acal-prev").addEventListener("click", () => {
    calMonth.setMonth(calMonth.getMonth() - 1);
    renderContent();
  });
  wrap.querySelector("#acal-next").addEventListener("click", () => {
    calMonth.setMonth(calMonth.getMonth() + 1);
    renderContent();
  });
}

function renderMessages(root) {
  const messages = getMessages();
  if (!messages.length) {
    root.innerHTML = `<div class="empty-state">Aucun message reçu.</div>`;
    return;
  }
  messages.forEach((m) => {
    const d = new Date(m.createdAt);
    const card = document.createElement("div");
    card.className = "message-card";
    card.innerHTML = `
      <div class="head">
        <span>
          <b>${m.firstName} ${m.lastName}</b>
          <span class="mail">${m.email}</span>
          ${m.snapchat ? `<span class="snap">👻 ${m.snapchat}</span>` : ""}
        </span>
        <time>${d.getDate()} ${MONTHS_FR[d.getMonth()].toLowerCase()} ${d.getFullYear()} à ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}</time>
      </div>
      <div class="body"></div>`;
    card.querySelector(".body").textContent = m.message;
    root.appendChild(card);
  });
}

render();
