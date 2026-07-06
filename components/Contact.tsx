"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Reveal from "./Reveal";
import MagneticButton from "./MagneticButton";

const inputClass =
  "w-full rounded-xl border border-noir-line bg-noir-soft px-4 py-3 text-sm text-white placeholder-smoke/50 outline-none transition-colors focus:border-blood";

const CHANNELS = [
  {
    label: "Instagram",
    value: "@locnjoy.paris",
    href: "https://instagram.com/locnjoy.paris",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: "Email",
    value: "contact@locnjoy.fr",
    href: "mailto:contact@locnjoy.fr",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M3 8l9 6 9-6" />
      </svg>
    ),
  },
  {
    label: "Téléphone",
    value: "+33 6 00 00 00 00",
    href: "tel:+33600000000",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
      </svg>
    ),
  },
  {
    label: "Snapchat",
    value: "locnjoy",
    href: "https://snapchat.com/add/locnjoy",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 3c3 0 5 2.2 5 5.2 0 .9 0 1.8.1 2.5.6.2 1.4-.6 1.9-.1.5.6-.7 1.3-1.5 1.8.3 1.5 2 2.7 3.5 3-.4 1-1.9 1.2-2.9 1.4-.2.5-.3 1.1-.7 1.1-.6 0-1.2-.3-2.2-.3-1.4 0-1.8 1.4-3.2 1.4s-1.8-1.4-3.2-1.4c-1 0-1.6.3-2.2.3-.4 0-.5-.6-.7-1.1-1-.2-2.5-.4-2.9-1.4 1.5-.3 3.2-1.5 3.5-3-.8-.5-2-1.2-1.5-1.8.5-.5 1.3.3 1.9.1.1-.7.1-1.6.1-2.5C7 5.2 9 3 12 3z" />
      </svg>
    ),
  },
];

export default function Contact() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    snapchat: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Une erreur est survenue.");
        setStatus("error");
        return;
      }
      setStatus("ok");
      setForm({ firstName: "", lastName: "", email: "", snapchat: "", message: "" });
    } catch {
      setError("Connexion impossible. Réessayez.");
      setStatus("error");
    }
  };

  return (
    <section id="contact" className="relative mx-auto max-w-7xl px-5 py-24 md:px-10 md:py-36">
      <Reveal>
        <div className="mb-4 flex items-baseline gap-4">
          <span className="font-display text-6xl font-extrabold text-stroke-red md:text-8xl">04</span>
          <h2 className="text-xs uppercase tracking-widest2 text-blood md:text-sm">Contact</h2>
        </div>
      </Reveal>
      <Reveal delay={0.1}>
        <p className="mb-12 max-w-lg font-display text-2xl font-semibold text-white md:text-4xl">
          Parlons de votre prochaine virée.
        </p>
      </Reveal>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        {/* Channel grid */}
        <div className="grid grid-cols-2 gap-3">
          {CHANNELS.map((c, i) => (
            <Reveal key={c.label} delay={i * 0.08}>
              <a
                href={c.href}
                target={c.href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="group flex h-full flex-col justify-between gap-6 rounded-2xl border border-noir-line bg-noir-soft p-5 transition-all duration-300 hover:border-blood/50 hover:bg-noir-card"
              >
                <span className="text-smoke transition-colors group-hover:text-blood">{c.icon}</span>
                <span>
                  <span className="block text-[10px] uppercase tracking-[0.2em] text-smoke">
                    {c.label}
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-white">{c.value}</span>
                </span>
              </a>
            </Reveal>
          ))}
        </div>

        {/* Form */}
        <Reveal delay={0.2}>
          <form
            onSubmit={submit}
            className="rounded-2xl border border-noir-line bg-noir-card p-6 md:p-8"
          >
            <div className="grid gap-4 sm:grid-cols-2">
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
                placeholder="Adresse email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass}
                required
              />
              <input
                placeholder="Snapchat (optionnel)"
                value={form.snapchat}
                onChange={(e) => setForm({ ...form, snapchat: e.target.value })}
                className={inputClass}
              />
              <textarea
                placeholder="Votre message"
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className={`${inputClass} resize-none sm:col-span-2`}
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
                  Message envoyé. Nous revenons vers vous rapidement !
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

            <div className="mt-6">
              <MagneticButton
                type="submit"
                disabled={status === "sending"}
                className="rounded-full bg-blood px-10 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-white transition-all duration-300 hover:bg-blood-bright hover:shadow-[0_0_40px_rgba(225,29,46,0.4)] disabled:opacity-50"
              >
                {status === "sending" ? "Envoi…" : "Envoyer"}
              </MagneticButton>
            </div>
          </form>
        </Reveal>
      </div>
    </section>
  );
}
