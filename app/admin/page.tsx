"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isWithinInterval,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";

type AdminBooking = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  vehicle: { name: string; brand: string; image: string };
};

type AdminMessage = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  snapchat: string | null;
  message: string;
  createdAt: string;
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: "border-yellow-700 bg-yellow-950/40 text-yellow-400",
  CONFIRMED: "border-green-800 bg-green-950/40 text-green-400",
  CANCELLED: "border-noir-line bg-noir-soft text-smoke/60",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmée",
  CANCELLED: "Annulée",
};

const VEHICLE_COLORS = [
  "#e11d2e", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#f97316",
];

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [view, setView] = useState<"list" | "calendar" | "messages">("list");
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/bookings");
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    const data = await res.json();
    setBookings(data.bookings);
    setMessages(data.messages);
    setAuthed(true);
  }, []);

  useEffect(() => {
    load().catch(() => setAuthed(false));
  }, [load]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setLoginError("Mot de passe incorrect.");
      return;
    }
    await load();
  };

  const logout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    setAuthed(false);
    setPassword("");
  };

  const setStatus = async (id: string, status: string) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setBookings((bs) =>
          bs.map((b) => (b.id === id ? { ...b, status: status as AdminBooking["status"] } : b))
        );
      }
    } finally {
      setBusy(null);
    }
  };

  const vehicleColor = useMemo(() => {
    const names = Array.from(new Set(bookings.map((b) => b.vehicle.name)));
    return (name: string) =>
      VEHICLE_COLORS[names.indexOf(name) % VEHICLE_COLORS.length];
  }, [bookings]);

  const calendarDays = useMemo(() => {
    const first = startOfMonth(month);
    const lead = (first.getDay() + 6) % 7;
    const cells: (Date | null)[] = Array(lead).fill(null);
    eachDayOfInterval({ start: first, end: endOfMonth(month) }).forEach((d) =>
      cells.push(d)
    );
    return cells;
  }, [month]);

  const bookingsOn = (day: Date) =>
    bookings.filter(
      (b) =>
        b.status !== "CANCELLED" &&
        isWithinInterval(day, { start: parseISO(b.startDate), end: parseISO(b.endDate) })
    );

  // ---- Login screen ----
  if (authed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-noir text-smoke">
        Chargement…
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-noir px-5">
        <motion.form
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={login}
          className="w-full max-w-sm rounded-2xl border border-noir-line bg-noir-card p-8"
        >
          <p className="font-display text-lg font-bold uppercase tracking-widest text-white">
            Loc<span className="text-blood">&apos;N&apos;</span>Joy
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.25em] text-smoke">Espace admin</p>
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-6 w-full rounded-xl border border-noir-line bg-noir-soft px-4 py-3 text-sm text-white outline-none focus:border-blood"
            autoFocus
          />
          {loginError && <p className="mt-3 text-sm text-blood-bright">{loginError}</p>}
          <button
            type="submit"
            className="mt-5 w-full rounded-full bg-blood py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:bg-blood-bright"
          >
            Entrer
          </button>
        </motion.form>
      </div>
    );
  }

  // ---- Dashboard ----
  const pending = bookings.filter((b) => b.status === "PENDING").length;
  const confirmed = bookings.filter((b) => b.status === "CONFIRMED").length;

  return (
    <div className="min-h-screen bg-noir px-4 py-8 md:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-display text-xl font-bold uppercase tracking-widest text-white">
              Loc<span className="text-blood">&apos;N&apos;</span>Joy — Planning
            </p>
            <p className="mt-1 text-xs text-smoke">
              {pending} en attente · {confirmed} confirmée{confirmed > 1 ? "s" : ""} ·{" "}
              {messages.length} message{messages.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(["list", "calendar", "messages"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-colors ${
                  view === v
                    ? "bg-blood text-white"
                    : "border border-noir-line text-smoke hover:text-white"
                }`}
              >
                {v === "list" ? "Liste" : v === "calendar" ? "Calendrier" : "Messages"}
              </button>
            ))}
            <button
              onClick={logout}
              className="rounded-full border border-noir-line px-4 py-2 text-xs uppercase tracking-widest text-smoke transition-colors hover:border-blood hover:text-blood"
            >
              Déconnexion
            </button>
          </div>
        </header>

        {view === "list" && (
          <div className="space-y-3">
            {bookings.length === 0 && (
              <p className="rounded-2xl border border-dashed border-noir-line p-10 text-center text-sm text-smoke">
                Aucune réservation pour le moment.
              </p>
            )}
            {bookings.map((b) => (
              <div
                key={b.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-noir-line bg-noir-card p-4 md:p-5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.vehicle.image} alt="" className="w-24 shrink-0" />
                <div className="min-w-[140px]">
                  <p className="text-sm font-semibold text-white">
                    {b.vehicle.brand} {b.vehicle.name}
                  </p>
                  <p className="text-xs text-smoke">
                    {b.firstName} {b.lastName}
                  </p>
                  <p className="text-xs text-smoke/70">
                    {b.email} · {b.phone}
                  </p>
                </div>
                <div className="min-w-[170px] text-xs text-smoke-light">
                  <p>
                    Du {format(parseISO(b.startDate), "d MMM yyyy", { locale: fr })} à {b.startTime}
                  </p>
                  <p>
                    Au {format(parseISO(b.endDate), "d MMM yyyy", { locale: fr })} à {b.endTime}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${STATUS_STYLE[b.status]}`}
                >
                  {STATUS_LABEL[b.status]}
                </span>
                <div className="ml-auto flex gap-2">
                  {b.status !== "CONFIRMED" && (
                    <button
                      disabled={busy === b.id}
                      onClick={() => setStatus(b.id, "CONFIRMED")}
                      className="rounded-full border border-green-800 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-green-400 transition-colors hover:bg-green-950/50 disabled:opacity-40"
                    >
                      Approuver
                    </button>
                  )}
                  {b.status !== "CANCELLED" && (
                    <button
                      disabled={busy === b.id}
                      onClick={() => setStatus(b.id, "CANCELLED")}
                      className="rounded-full border border-blood/50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-blood-bright transition-colors hover:bg-blood/10 disabled:opacity-40"
                    >
                      Annuler
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {view === "calendar" && (
          <div className="rounded-2xl border border-noir-line bg-noir-card p-4 md:p-6">
            <div className="mb-5 flex items-center justify-between">
              <button
                onClick={() => setMonth(subMonths(month, 1))}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-noir-line text-white hover:border-blood"
              >
                ←
              </button>
              <span className="font-display text-sm font-bold uppercase tracking-[0.2em] text-white">
                {format(month, "MMMM yyyy", { locale: fr })}
              </span>
              <button
                onClick={() => setMonth(addMonths(month, 1))}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-noir-line text-white hover:border-blood"
              >
                →
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
                <span key={d} className="pb-2 text-center text-[10px] uppercase tracking-widest text-smoke">
                  {d}
                </span>
              ))}
              {calendarDays.map((day, i) => {
                if (!day) return <span key={`pad-${i}`} />;
                const dayBookings = bookingsOn(day);
                return (
                  <div
                    key={day.toISOString()}
                    className="min-h-[72px] rounded-lg border border-noir-line/60 bg-noir-soft p-1.5"
                  >
                    <span className="text-[11px] text-smoke">{format(day, "d")}</span>
                    <div className="mt-1 space-y-1">
                      {dayBookings.slice(0, 3).map((b) => (
                        <div
                          key={b.id}
                          title={`${b.vehicle.name} — ${b.firstName} ${b.lastName} (${STATUS_LABEL[b.status]})`}
                          className="truncate rounded px-1.5 py-0.5 text-[9px] font-semibold text-white"
                          style={{
                            backgroundColor: `${vehicleColor(b.vehicle.name)}${b.status === "PENDING" ? "55" : "cc"}`,
                          }}
                        >
                          {b.vehicle.name}
                        </div>
                      ))}
                      {dayBookings.length > 3 && (
                        <span className="text-[9px] text-smoke">+{dayBookings.length - 3}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-[11px] text-smoke">
              Couleur pleine : confirmée · Couleur atténuée : en attente
            </p>
          </div>
        )}

        {view === "messages" && (
          <div className="space-y-3">
            {messages.length === 0 && (
              <p className="rounded-2xl border border-dashed border-noir-line p-10 text-center text-sm text-smoke">
                Aucun message reçu.
              </p>
            )}
            {messages.map((m) => (
              <div key={m.id} className="rounded-2xl border border-noir-line bg-noir-card p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-white">
                    {m.firstName} {m.lastName}
                    <span className="ml-2 font-normal text-smoke">{m.email}</span>
                    {m.snapchat && (
                      <span className="ml-2 font-normal text-yellow-500/80">👻 {m.snapchat}</span>
                    )}
                  </p>
                  <span className="text-xs text-smoke/60">
                    {format(parseISO(m.createdAt), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-smoke-light">
                  {m.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
