"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { CONTACT } from "@/lib/content";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type Status = "idle" | "sending" | "success" | "error";

const FIELD_CLS =
  "w-full min-h-[44px] rounded-xl border border-mist/10 bg-ink/60 px-4 py-3.5 text-sm text-mist placeholder:text-cambridge/40 transition-colors duration-300 focus:border-mindaro/60 focus:outline-none";
const LABEL_CLS = "mb-2 block font-mono text-[10px] uppercase tracking-[0.24em] text-cambridge";

/**
 * Formulaire de contact — consentement RGPD explicite (case NON pré-cochée),
 * honeypot anti-spam, états animés, succès façon terminal.
 * L'API (app/api/contact/route.ts) est mockée : log serveur + réponse 200,
 * prête à brancher sur un service e-mail.
 */
export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [name, setName] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    if (!consent) return;
    setStatus("sending");
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, consent }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Une erreur est survenue.");
      setName(String(data.name ?? ""));
      setStatus("success");
      form.reset();
      setConsent(false);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Une erreur est survenue. Réessayez ou écrivez-nous par e-mail.");
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-mist/10 bg-deep/40 p-6 shadow-panel backdrop-blur-md sm:p-9">
      <p aria-hidden className="mb-7 font-mono text-[10px] uppercase tracking-[0.24em] text-cambridge/50">
        // formulaire — chiffré en transit — RGPD
      </p>

      <AnimatePresence mode="wait">
        {status === "success" ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="py-6"
            role="status"
          >
            <p className="font-mono text-xs text-mindaro">&gt; POST /api/contact — 200 OK</p>
            <div className="mt-5 flex items-center gap-4">
              <svg viewBox="0 0 48 48" className="h-12 w-12 shrink-0" aria-hidden>
                <motion.circle
                  cx="24"
                  cy="24"
                  r="21"
                  fill="none"
                  stroke="var(--color-mindaro)"
                  strokeWidth="2"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                />
                <motion.path
                  d="M15 24.5l6.5 6.5L33 18"
                  fill="none"
                  stroke="var(--color-mindaro)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.5, duration: 0.4, ease: "easeOut" }}
                />
              </svg>
              <h3 className="font-display text-2xl font-semibold text-mist">
                {CONTACT.success.title}
              </h3>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-cambridge">
              {name ? `Merci ${name} ! ` : "Merci ! "}
              {CONTACT.success.text}
            </p>
            <button
              onClick={() => setStatus("idle")}
              className="link-sweep mt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-mist hover:text-mindaro"
            >
              Envoyer un autre message →
            </button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={onSubmit}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="space-y-5"
            noValidate={false}
          >
            {/* Honeypot anti-spam : invisible pour les humains */}
            <div className="absolute -left-[9999px] top-0" aria-hidden>
              <label htmlFor="website">Ne pas remplir</label>
              <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className={LABEL_CLS}>
                  Nom *
                </label>
                <input id="name" name="name" required maxLength={120} placeholder="Ada Lovelace" className={FIELD_CLS} />
              </div>
              <div>
                <label htmlFor="email" className={LABEL_CLS}>
                  E-mail *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  maxLength={160}
                  placeholder="ada@entreprise.fr"
                  className={FIELD_CLS}
                />
              </div>
            </div>

            <div>
              <label htmlFor="subject" className={LABEL_CLS}>
                Sujet *
              </label>
              <select id="subject" name="subject" required defaultValue={CONTACT.subjects[0]} className={cn(FIELD_CLS, "appearance-none")}>
                {CONTACT.subjects.map((s) => (
                  <option key={s} value={s} className="bg-abyss text-mist">
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="message" className={LABEL_CLS}>
                Message *
              </label>
              <textarea
                id="message"
                name="message"
                required
                minLength={10}
                maxLength={4000}
                rows={5}
                placeholder="Votre projet, vos contraintes, vos échéances… tout nous intéresse."
                className={cn(FIELD_CLS, "resize-y")}
              />
            </div>

            {/* Consentement RGPD — jamais pré-coché */}
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                name="consent"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                required
                className="peer sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border font-mono text-[10px] transition-colors duration-300 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-mindaro",
                  consent ? "border-mindaro bg-mindaro text-ink" : "border-mist/25 text-transparent"
                )}
              >
                ✓
              </span>
              <span className="text-xs leading-relaxed text-cambridge">
                {CONTACT.consentLabel}{" "}
                <Link href="/politique-de-confidentialite" className="text-mindaro underline underline-offset-2">
                  Lire la politique de confidentialité
                </Link>
              </span>
            </label>

            {status === "error" && (
              <p role="alert" className="rounded-lg border border-alert/30 bg-alert/10 px-4 py-3 text-sm text-alert">
                {error}
              </p>
            )}

            <Button type="submit" disabled={status === "sending" || !consent} className="w-full sm:w-auto" magnetic={false}>
              {status === "sending" ? (
                <span className="font-mono text-xs tracking-widest">
                  TRANSMISSION<span className="animate-blink">▮</span>
                </span>
              ) : (
                <>
                  Envoyer le message <span aria-hidden>↗</span>
                </>
              )}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
