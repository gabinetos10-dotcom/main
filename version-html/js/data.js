/* Loc'N'Joy — données partagées (version statique).
   Les réservations et messages sont stockés dans le navigateur
   (localStorage) : parfait pour une démo sans serveur. */

const FLEET = [
  {
    slug: "audi-rs3-sportback",
    name: "RS3 Sportback",
    brand: "Audi",
    category: "Compacte Sport",
    pricePerDay: 329,
    seats: 5,
    power: "400 ch",
    transmission: "Automatique",
    acceleration: "3.8s",
    image: "cars/rs3.svg",
    tagline: "Cinq cylindres, zéro compromis.",
  },
  {
    slug: "mercedes-amg-a45s",
    name: "AMG A45 S",
    brand: "Mercedes-AMG",
    category: "Compacte Sport",
    pricePerDay: 349,
    seats: 5,
    power: "421 ch",
    transmission: "Automatique",
    acceleration: "3.9s",
    image: "cars/a45s.svg",
    tagline: "La compacte la plus radicale de sa génération.",
  },
  {
    slug: "bmw-m4-competition",
    name: "M4 Competition",
    brand: "BMW",
    category: "Coupé Sport",
    pricePerDay: 449,
    seats: 4,
    power: "510 ch",
    transmission: "Automatique",
    acceleration: "3.5s",
    image: "cars/m4.svg",
    tagline: "Le coupé qui ne dort jamais.",
  },
  {
    slug: "range-rover-sport",
    name: "Range Rover Sport",
    brand: "Land Rover",
    category: "SUV Premium",
    pricePerDay: 499,
    seats: 5,
    power: "530 ch",
    transmission: "Automatique",
    acceleration: "4.5s",
    image: "cars/range.svg",
    tagline: "L'élégance en hauteur.",
  },
  {
    slug: "porsche-911-carrera",
    name: "911 Carrera",
    brand: "Porsche",
    category: "Sportive",
    pricePerDay: 649,
    seats: 2,
    power: "450 ch",
    transmission: "PDK",
    acceleration: "3.7s",
    image: "cars/911.svg",
    tagline: "L'icône. Simplement.",
  },
  {
    slug: "lamborghini-urus",
    name: "Urus",
    brand: "Lamborghini",
    category: "Super SUV",
    pricePerDay: 899,
    seats: 5,
    power: "666 ch",
    transmission: "Automatique",
    acceleration: "3.6s",
    image: "cars/urus.svg",
    tagline: "Le taureau des Champs-Élysées.",
  },
];

const ADMIN_PASSWORD = "locnjoy-admin";

/* ---- Stockage ---- */
function getBookings() {
  try {
    return JSON.parse(localStorage.getItem("lnj_bookings") || "[]");
  } catch {
    return [];
  }
}
function saveBookings(list) {
  localStorage.setItem("lnj_bookings", JSON.stringify(list));
}
function getMessages() {
  try {
    return JSON.parse(localStorage.getItem("lnj_messages") || "[]");
  } catch {
    return [];
  }
}
function saveMessages(list) {
  localStorage.setItem("lnj_messages", JSON.stringify(list));
}

/* ---- Dates (format "YYYY-MM-DD") ---- */
function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function fromISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function todayISO() {
  return toISO(new Date());
}
const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
function formatFR(iso) {
  const d = fromISO(iso);
  return `${d.getDate()} ${MONTHS_FR[d.getMonth()].toLowerCase()} ${d.getFullYear()}`;
}
function daysBetween(a, b) {
  return Math.round((fromISO(b) - fromISO(a)) / 86400000);
}

/* Plages occupées (réservations non annulées) pour un véhicule. */
function bookedRangesFor(slug) {
  return getBookings()
    .filter((b) => b.vehicleSlug === slug && b.status !== "CANCELLED")
    .map((b) => ({ start: b.startDate, end: b.endDate }));
}
function isDateBooked(iso, ranges) {
  return ranges.some((r) => iso >= r.start && iso <= r.end);
}
function rangeOverlaps(start, end, ranges) {
  return ranges.some((r) => r.start <= end && r.end >= start);
}
