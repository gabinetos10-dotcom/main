"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { differenceInCalendarDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import Calendar from "./Calendar";
import Reveal from "./Reveal";
import type { BookedRange, Vehicle } from "./types";

const inputClass =
  "w-full rounded-xl border border-noir-line bg-noir-soft px-4 py-3 text-sm text-white placeholder-smoke/50 outline-none transition-colors focus:border-blood";

export default function BookingSection({
  vehicles,
  selectedCar,
  onSelectCar,
}: {
  vehicles: Vehicle[];
  selectedCar: Vehicle | null;
  onSelectCar: (car: Vehicle) => void;
}) {
  const [booked, setBooked] = useState<BookedRange[]>([]);
  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("10:00");
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [error, setError] = useState("");

  // Refresh unavailable dates whenever the chosen vehicle changes.
  useEffect(() => {
    if (!selectedCar) return;
    setStart(null);
    setEnd(null);
    setStatus("idle");
    fetch(`/api/bookings?vehicleId=${selectedCar.id}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setBooked)
      .catch(() => setBooked([]));
  }, [selectedCar]);

  const nights = useMemo(() => {
    if (!start || !end) return 0;
    return Math.max(1, differenceInCalendarDays(end, start));
  }, [start, end]);

  const total = selectedCar ? nights * selectedCar.pricePerDay : 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCar || !start || !end) return;
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: selectedCar.id,
          ...form,
          startDate: format(start, "yyyy-MM-dd"),
          endDate: format(end, "yyyy-MM-dd"),
          startTime,
          endTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Une erreur est survenue.");
        setStatus("error");
        return;
      }
      setStatus("ok");
      // refresh availability so the new booking grays out instantly
      fetch(`/api/bookings?vehicleId=${selectedCar.id}`)
        .then((r) => (r.ok ? r.json() : []))
        .then(setBooked)
        .catch(() => {});
      setStart(null);
      setEnd(null);
    } catch {
      setError("Connexion impossible. Réessayez.");
      setStatus("error");
    }
  };

  return (
    <section id="reservation" className="relative py-24 md:py-36">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,#1a060a_0%,transparent_55%)]" />
      <div className="relative mx-auto max-w-7xl px-5 md:px-10">
        <Reveal>
          <div className="mb-4 flex items-baseline gap-4">
            <span className="font-display text-6xl font-extrabold text-stroke-red md:text-8xl">03</span>
            <h2 className="text-xs uppercase tracking-widest2 text-blood md:text-sm">Réservation</h2>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mb-12 max-w-lg font-display text-2xl font-semibold text-white md:text-4xl">
            Choisissez vos dates. Prenez les clés.
          </p>
        </Reveal>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          {/* Left: vehicle + calendar */}
          <Reveal delay={0.15}>
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-[11px] uppercase tracking-[0.2em] text-smoke">
                  Véhicule
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {vehicles.map((car) => (
                    <button
                      key={car.id}
                      type="button"
                      onClick={() => onSelectCar(car)}
                      className={`rounded-xl border px-3 py-3 text-left transition-all duration-300 ${
                        selectedCar?.id === car.id
                          ? "border-blood bg-blood/10 shadow-[0_0_20px_rgba(225,29,46,0.2)]"
                          : "border-noir-line bg-noir-soft hover:border-smoke/40"
                      }`}
                    >
                      <span className="block text-[10px] uppercase tracking-widest text-smoke">
                        {car.brand}
                      </span>
                      <span className="block truncate text-sm font-semibold text-white">
                        {car.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {selectedCar ? (
                <Calendar
                  booked={booked}
                  start={start}
                  end={end}
                  onChange={(s, e) => {
                    setStart(s);
                    setEnd(e);
                  }}
                />
              ) : (
                <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-noir-line text-sm text-smoke">
                  Sélectionnez un véhicule pour voir ses disponibilités
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-[11px] uppercase tracking-[0.2em] text-smoke">
                    Heure de départ
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[11px] uppercase tracking-[0.2em] text-smoke">
                    Heure de retour
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
              </div>
            </div>
          </Reveal>

          {/* Right: summary + contact details */}
          <Reveal delay={0.25}>
            <form
              onSubmit={submit}
              className="flex h-full flex-col rounded-2xl border border-noir-line bg-noir-card p-6 md:p-8"
            >
              <h3 className="font-display text-lg font-bold uppercase tracking-wider text-white">
                Votre réservation
              </h3>

              <div className="mt-5 space-y-3 border-b border-noir-line pb-5 text-sm">
                <div className="flex justify-between">
                  <span className="text-smoke">Véhicule</span>
                  <span className="font-semibold text-white">
                    {selectedCar ? `${selectedCar.brand} ${selectedCar.name}` : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-smoke">Départ</span>
                  <span className="font-semibold text-white">
                    {start ? `${format(start, "d MMM yyyy", { locale: fr })} · ${startTime}` : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-smoke">Retour</span>
                  <span className="font-semibold text-white">
                    {end ? `${format(end, "d MMM yyyy", { locale: fr })} · ${endTime}` : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-smoke">Durée</span>
                  <span className="font-semibold text-white">
                    {nights > 0 ? `${nights} jour${nights > 1 ? "s" : ""}` : "—"}
                  </span>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-smoke">Total estimé</span>
                  <span className="font-display text-2xl font-bold text-blood">
                    {total > 0 ? `${total}€` : "—"}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <input
                  placeholder="Prénom"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className={inputClass}
                  required
                />
                <input
                  placeholder="Nom"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className={inputClass}
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={`${inputClass} sm:col-span-2`}
                  required
                />
                <input
                  type="tel"
                  placeholder="Téléphone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={`${inputClass} sm:col-span-2`}
                  required
                />
              </div>

              <AnimatePresence mode="wait">
                {status === "ok" && (
                  <motion.p
                    key="ok"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-4 rounded-xl border border-green-800 bg-green-950/50 px-4 py-3 text-sm text-green-400"
                  >
                    Demande envoyée ! Nous vous confirmons la réservation très vite.
                  </motion.p>
                )}
                {status === "error" && (
                  <motion.p
                    key="err"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-4 rounded-xl border border-blood/40 bg-blood/10 px-4 py-3 text-sm text-blood-bright"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={!selectedCar || !start || !end || status === "sending"}
                className="mt-auto w-full rounded-full bg-blood py-4 text-sm font-semibold uppercase tracking-[0.2em] text-white transition-all duration-300 hover:bg-blood-bright hover:shadow-[0_0_40px_rgba(225,29,46,0.4)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-blood disabled:hover:shadow-none"
                style={{ marginTop: "1.5rem" }}
              >
                {status === "sending" ? "Envoi en cours…" : "Confirmer la demande"}
              </button>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
