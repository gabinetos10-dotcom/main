"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { burstFromElement } from "@/lib/confetti";
import { prestationOptions } from "@/lib/content";

type Status = "idle" | "loading" | "success" | "error";

const field =
  "w-full rounded-2xl border border-or/25 bg-ivoire/70 px-4 py-3 text-sm text-prune placeholder:text-prune/40 transition-colors focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20";

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [form, setForm] = useState({
    partner1: "",
    partner2: "",
    email: "",
    phone: "",
    date: "",
    place: "",
    prestation: prestationOptions[0],
    message: "",
    consent: false,
    company: "", // honeypot
  });
  const submitRef = useRef<HTMLButtonElement | null>(null);

  // Pré-remplissage depuis le mini-jeu moodboard (?message=…&prestation=…).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const message = params.get("message");
    const prestation = params.get("prestation");
    if (message || prestation) {
      setForm((f) => ({
        ...f,
        message: message ?? f.message,
        prestation: prestation && prestationOptions.includes(prestation) ? prestation : f.prestation,
      }));
    }
  }, []);

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const value = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.company) return; // honeypot rempli → bot
    if (!form.consent) return;
    setStatus("loading");

    // [À CONNECTER] — brancher à votre backend / service d'e-mail (API route,
    // Formspree, Brevo…). Ici, on simule une réponse pour la démo.
    try {
      await new Promise((r) => setTimeout(r, 900));
      setStatus("success");
      burstFromElement(submitRef.current, { count: 40, power: 11 });
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="invitation-card flex flex-col items-center justify-center px-6 py-16 text-center"
      >
        <p className="script-accent text-5xl text-terracotta">Merci !</p>
        <p className="mt-4 max-w-sm text-prune/75">
          Votre message s&apos;est envolé vers Mélina. Vous recevrez une réponse très bientôt —
          en attendant, on garde précieusement le fil de votre histoire.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-6 text-sm text-terracotta underline"
        >
          Envoyer un autre message
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={submit} className="invitation-card p-6 sm:p-8" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-prune/60" htmlFor="partner1">
            Votre prénom
          </label>
          <input id="partner1" required value={form.partner1} onChange={set("partner1")} className={field} placeholder="Camille" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-prune/60" htmlFor="partner2">
            Le prénom de votre moitié
          </label>
          <input id="partner2" value={form.partner2} onChange={set("partner2")} className={field} placeholder="Julien" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-prune/60" htmlFor="email">
            E-mail
          </label>
          <input id="email" type="email" required value={form.email} onChange={set("email")} className={field} placeholder="vous@exemple.fr" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-prune/60" htmlFor="phone">
            Téléphone <span className="text-prune/35">(facultatif)</span>
          </label>
          <input id="phone" type="tel" value={form.phone} onChange={set("phone")} className={field} placeholder="06 12 34 56 78" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-prune/60" htmlFor="date">
            Date envisagée
          </label>
          <input id="date" type="date" value={form.date} onChange={set("date")} className={field} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-prune/60" htmlFor="place">
            Lieu ou secteur
          </label>
          <input id="place" value={form.place} onChange={set("place")} className={field} placeholder="Domaine près de Béziers…" />
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-1.5 block text-xs uppercase tracking-wide text-prune/60" htmlFor="prestation">
          Quel accompagnement ?
        </label>
        <select id="prestation" value={form.prestation} onChange={set("prestation")} className={field}>
          {prestationOptions.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <label className="mb-1.5 block text-xs uppercase tracking-wide text-prune/60" htmlFor="message">
          Racontez-nous votre projet
        </label>
        <textarea
          id="message"
          required
          rows={5}
          value={form.message}
          onChange={set("message")}
          className={field}
          placeholder="Ce que vous imaginez, ce qui vous fait vibrer, vos questions…"
        />
      </div>

      {/* Honeypot anti-spam (masqué) */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={form.company}
        onChange={set("company")}
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
        aria-hidden
      />

      <label className="mt-5 flex items-start gap-3 text-sm text-prune/70">
        <input type="checkbox" required checked={form.consent} onChange={set("consent")} className="mt-1 accent-[var(--terracotta)]" />
        <span>
          J&apos;accepte que mes informations soient utilisées pour être recontacté(e), conformément à la{" "}
          <Link href="/politique-de-confidentialite" className="underline">
            politique de confidentialité
          </Link>
          . *
        </span>
      </label>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          ref={submitRef}
          type="submit"
          disabled={status === "loading" || !form.consent}
          className="inline-flex items-center gap-2 rounded-pill bg-terracotta px-8 py-3.5 text-sm font-semibold text-ivoire shadow-bloom transition-all duration-300 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading" ? "Envoi en cours…" : "Envoyer mon message ✿"}
        </button>
        <AnimatePresence>
          {status === "error" && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm text-terracotta"
            >
              Un souci est survenu. Réessayez ou écrivez-nous directement.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}
