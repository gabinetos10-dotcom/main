/* Loc'N'Joy — logique du site (version statique) */

/* ============ Preloader ============ */
document.body.style.overflow = "hidden";
window.addEventListener("load", () => {
  setTimeout(() => {
    document.getElementById("preloader").classList.add("done");
    document.body.style.overflow = "";
    document.body.classList.add("loaded");
    document.getElementById("navbar").classList.add("shown");
  }, 2600);
});

/* ============ Navbar ============ */
const navbar = document.getElementById("navbar");
window.addEventListener("scroll", () => {
  navbar.classList.toggle("scrolled", window.scrollY > 40);
}, { passive: true });

const burger = document.getElementById("burger");
const mobileMenu = document.getElementById("mobile-menu");
burger.addEventListener("click", () => {
  burger.classList.toggle("open");
  mobileMenu.classList.toggle("open");
});
mobileMenu.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    burger.classList.remove("open");
    mobileMenu.classList.remove("open");
  })
);

/* ============ Lumières de la ville (hero) ============ */
const lights = document.getElementById("city-lights");
for (let i = 0; i < 24; i++) {
  const s = document.createElement("span");
  s.className = "city-light";
  s.style.left = ((i * 41) % 100) + "%";
  s.style.top = 18 + ((i * 23) % 55) + "%";
  s.style.animationDelay = (i % 6) * 0.5 + "s";
  lights.appendChild(s);
}

/* ============ Parallax hero ============ */
const heroContent = document.querySelector(".hero-content");
const heroCar = document.querySelector(".hero-car");
window.addEventListener("scroll", () => {
  const y = window.scrollY;
  if (y < window.innerHeight) {
    heroContent.style.transform = `translateY(${y * 0.35}px)`;
    heroContent.style.opacity = Math.max(0, 1 - y / (window.innerHeight * 0.7));
    heroCar.style.transform = `translateY(${y * 0.18}px)`;
  }
}, { passive: true });

/* ============ Reveal au scroll ============ */
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        observer.unobserve(e.target);
      }
    });
  },
  { rootMargin: "-60px" }
);
document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

/* Révélation mot à mot (section À propos) */
const punch = document.querySelector(".about-punch");
if (punch) {
  const words = punch.textContent.trim().split(/\s+/);
  punch.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(" ");
  const wordObs = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        punch.querySelectorAll(".w").forEach((w, i) => {
          setTimeout(() => w.classList.add("lit"), i * 40);
        });
        wordObs.disconnect();
      }
    },
    { rootMargin: "-100px" }
  );
  wordObs.observe(punch);
}

/* ============ Boutons magnétiques ============ */
document.querySelectorAll(".magnetic").forEach((el) => {
  el.addEventListener("mousemove", (e) => {
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * 0.3;
    const y = (e.clientY - (r.top + r.height / 2)) * 0.3;
    el.style.transform = `translate(${x}px, ${y}px)`;
  });
  el.addEventListener("mouseleave", () => {
    el.style.transform = "";
  });
});

/* ============ Flotte ============ */
const slider = document.getElementById("fleet-slider");
FLEET.forEach((car, i) => {
  const el = document.createElement("article");
  el.className = "car-card reveal";
  el.style.transitionDelay = (i % 3) * 0.1 + "s";
  el.innerHTML = `
    <div class="car-visual">
      <span class="car-num">${String(i + 1).padStart(2, "0")}</span>
      <span class="car-cat">${car.category}</span>
      <img src="${car.image}" alt="${car.brand} ${car.name}">
    </div>
    <div class="car-body">
      <div class="car-brand">${car.brand}</div>
      <div class="car-name">${car.name}</div>
      <div class="car-tagline">${car.tagline}</div>
      <div class="car-specs">
        <div><b>${car.power}</b><small>Puissance</small></div>
        <div><b>${car.acceleration}</b><small>0–100 km/h</small></div>
        <div><b>${car.seats} places</b><small>${car.transmission}</small></div>
      </div>
      <div class="car-foot">
        <div class="car-price">${car.pricePerDay}€ <small>/ jour</small></div>
        <button class="rent-btn" data-slug="${car.slug}">Louer ce véhicule</button>
      </div>
    </div>`;
  slider.appendChild(el);
  observer.observe(el);
});
slider.addEventListener("click", (e) => {
  const btn = e.target.closest(".rent-btn");
  if (!btn) return;
  selectVehicle(btn.dataset.slug);
  document.getElementById("reservation").scrollIntoView({ behavior: "smooth" });
});
document.getElementById("arrow-prev").addEventListener("click", () =>
  slider.scrollBy({ left: -360, behavior: "smooth" })
);
document.getElementById("arrow-next").addEventListener("click", () =>
  slider.scrollBy({ left: 360, behavior: "smooth" })
);

/* ============ Réservation ============ */
let selectedSlug = null;
let calMonth = new Date();
calMonth.setDate(1);
let selStart = null; // "YYYY-MM-DD"
let selEnd = null;

const picker = document.getElementById("vehicle-picker");
FLEET.forEach((car) => {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "vehicle-chip";
  b.dataset.slug = car.slug;
  b.innerHTML = `<small>${car.brand}</small><b>${car.name}</b>`;
  b.addEventListener("click", () => selectVehicle(car.slug));
  picker.appendChild(b);
});

function selectVehicle(slug) {
  selectedSlug = slug;
  selStart = null;
  selEnd = null;
  document.querySelectorAll(".vehicle-chip").forEach((c) =>
    c.classList.toggle("selected", c.dataset.slug === slug)
  );
  document.getElementById("calendar-placeholder").style.display = "none";
  document.getElementById("calendar").style.display = "block";
  renderCalendar();
  updateSummary();
}

function renderCalendar() {
  const ranges = bookedRangesFor(selectedSlug);
  const today = todayISO();
  const y = calMonth.getFullYear();
  const m = calMonth.getMonth();

  document.getElementById("cal-title").textContent = `${MONTHS_FR[m]} ${y}`;
  const now = new Date();
  document.getElementById("cal-prev").disabled =
    y === now.getFullYear() && m === now.getMonth();

  const grid = document.getElementById("cal-days");
  grid.innerHTML = "";
  const firstDow = (new Date(y, m, 1).getDay() + 6) % 7; // lundi = 0
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  for (let i = 0; i < firstDow; i++) grid.appendChild(document.createElement("span"));

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = toISO(new Date(y, m, d));
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cal-day";
    btn.textContent = d;
    const past = iso < today;
    const occupied = isDateBooked(iso, ranges);
    if (past || occupied) {
      btn.disabled = true;
      if (occupied) {
        btn.classList.add("booked");
        btn.title = "Déjà réservé";
      }
    } else {
      btn.addEventListener("click", () => pickDate(iso));
    }
    if (iso === selStart || iso === selEnd) btn.classList.add("sel");
    else if (selStart && selEnd && iso > selStart && iso < selEnd)
      btn.classList.add("between");
    grid.appendChild(btn);
  }
}

function pickDate(iso) {
  const ranges = bookedRangesFor(selectedSlug);
  if (!selStart || (selStart && selEnd)) {
    selStart = iso;
    selEnd = null;
  } else if (iso < selStart) {
    selStart = iso;
  } else if (rangeOverlaps(selStart, iso, ranges)) {
    // une date occupée est dans l'intervalle → on repart de la date cliquée
    selStart = iso;
    selEnd = null;
  } else {
    selEnd = iso;
  }
  renderCalendar();
  updateSummary();
}

document.getElementById("cal-prev").addEventListener("click", () => {
  calMonth.setMonth(calMonth.getMonth() - 1);
  renderCalendar();
});
document.getElementById("cal-next").addEventListener("click", () => {
  calMonth.setMonth(calMonth.getMonth() + 1);
  renderCalendar();
});

function updateSummary() {
  const car = FLEET.find((c) => c.slug === selectedSlug);
  const startTime = document.getElementById("start-time").value;
  const endTime = document.getElementById("end-time").value;
  document.getElementById("sum-vehicle").textContent = car
    ? `${car.brand} ${car.name}`
    : "—";
  document.getElementById("sum-start").textContent = selStart
    ? `${formatFR(selStart)} · ${startTime}`
    : "—";
  document.getElementById("sum-end").textContent = selEnd
    ? `${formatFR(selEnd)} · ${endTime}`
    : "—";
  const days = selStart && selEnd ? Math.max(1, daysBetween(selStart, selEnd)) : 0;
  document.getElementById("sum-days").textContent = days
    ? `${days} jour${days > 1 ? "s" : ""}`
    : "—";
  document.getElementById("sum-total").textContent =
    days && car ? `${days * car.pricePerDay}€` : "—";
  document.getElementById("booking-submit").disabled = !(selectedSlug && selStart && selEnd);
}
document.getElementById("start-time").addEventListener("change", updateSummary);
document.getElementById("end-time").addEventListener("change", updateSummary);

document.getElementById("booking-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const okBox = document.getElementById("booking-ok");
  const errBox = document.getElementById("booking-err");
  okBox.classList.remove("show");
  errBox.classList.remove("show");

  const ranges = bookedRangesFor(selectedSlug);
  if (rangeOverlaps(selStart, selEnd, ranges)) {
    errBox.textContent = "Ce véhicule est déjà réservé sur ces dates.";
    errBox.classList.add("show");
    return;
  }

  const bookings = getBookings();
  bookings.push({
    id: "b" + Date.now(),
    vehicleSlug: selectedSlug,
    firstName: document.getElementById("bk-firstname").value.trim(),
    lastName: document.getElementById("bk-lastname").value.trim(),
    email: document.getElementById("bk-email").value.trim(),
    phone: document.getElementById("bk-phone").value.trim(),
    startDate: selStart,
    endDate: selEnd,
    startTime: document.getElementById("start-time").value,
    endTime: document.getElementById("end-time").value,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  });
  saveBookings(bookings);

  okBox.textContent = "Demande envoyée ! Nous vous confirmons la réservation très vite.";
  okBox.classList.add("show");
  selStart = null;
  selEnd = null;
  renderCalendar();
  updateSummary();
  e.target.querySelectorAll("input").forEach((i) => {
    if (i.type !== "time") i.value = "";
  });
});

/* ============ Contact ============ */
document.getElementById("contact-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const messages = getMessages();
  messages.unshift({
    id: "m" + Date.now(),
    firstName: document.getElementById("ct-firstname").value.trim(),
    lastName: document.getElementById("ct-lastname").value.trim(),
    email: document.getElementById("ct-email").value.trim(),
    snapchat: document.getElementById("ct-snapchat").value.trim(),
    message: document.getElementById("ct-message").value.trim(),
    createdAt: new Date().toISOString(),
  });
  saveMessages(messages);
  const ok = document.getElementById("contact-ok");
  ok.textContent = "Message envoyé. Nous revenons vers vous rapidement !";
  ok.classList.add("show");
  e.target.reset();
});

/* ============ Footer année ============ */
document.getElementById("year").textContent = new Date().getFullYear();
