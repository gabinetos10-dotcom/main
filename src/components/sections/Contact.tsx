"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Mail, Send, Loader2 } from "lucide-react";
import { useState } from "react";
import {
  PROJECT_TYPES,
  BUDGET_RANGES,
  TIMELINES,
} from "@/lib/data";
import { Em } from "@/components/ui/Em";
import { cn } from "@/lib/utils";

type Form = {
  type: string;
  budget: string;
  timeline: string;
  name: string;
  email: string;
  message: string;
};

const EMPTY: Form = { type: "", budget: "", timeline: "", name: "", email: "", message: "" };

const STEPS = ["Projet", "Budget", "Délai", "Vous"];

export function Contact() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(EMPTY);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const canNext =
    (step === 0 && form.type) ||
    (step === 1 && form.budget) ||
    (step === 2 && form.timeline) ||
    (step === 3 && form.name.trim().length > 1 && emailValid);

  const submit = () => {
    setStatus("sending");
    // Front‑only demo — swap for a real endpoint / server action.
    setTimeout(() => setStatus("sent"), 1400);
  };

  return (
    <section id="contact" className="relative py-28 sm:py-36">
      <div className="container-x">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Left */}
          <div className="lg:col-span-5">
            <div className="mb-6 flex items-center gap-4">
              <span className="kicker">Contact</span>
              <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-text-mute)]">
                (05)
              </span>
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-4xl font-semibold leading-[1.04] tracking-[-0.03em] text-[var(--color-highlight)] sm:text-5xl">
              Estimons votre projet <Em accent>en 4 étapes</Em>.
            </h2>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-[var(--color-text-dim)]">
              Pas de formulaire interminable. Quelques clics et on revient vers
              vous sous 24h avec une première piste — et un vrai humain au bout.
            </p>
            <a
              href="mailto:hello@gjs.agency"
              className="mt-8 inline-flex items-center gap-2 text-sm text-[var(--color-text-dim)] transition-colors hover:text-[var(--color-text)]"
            >
              <Mail size={16} /> hello@gjs.agency
            </a>
          </div>

          {/* Right — wizard */}
          <div className="lg:col-span-7">
            <div className="border-gradient glass relative overflow-hidden rounded-[var(--radius-lg)] p-6 sm:p-9">
              {/* progress */}
              {status !== "sent" && (
                <div className="mb-8 flex items-center gap-2">
                  {STEPS.map((label, i) => (
                    <div key={label} className="flex flex-1 items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "grid h-7 w-7 place-items-center rounded-full border text-xs font-medium transition-colors",
                            i < step
                              ? "border-transparent bg-[var(--color-accent)] text-white"
                              : i === step
                                ? "border-[var(--color-accent-2)] text-[var(--color-accent-2)]"
                                : "border-[var(--color-line)] text-[var(--color-text-mute)]"
                          )}
                        >
                          {i < step ? <Check size={13} /> : i + 1}
                        </span>
                        <span
                          className={cn(
                            "hidden text-xs sm:block",
                            i === step ? "text-[var(--color-text)]" : "text-[var(--color-text-mute)]"
                          )}
                        >
                          {label}
                        </span>
                      </div>
                      {i < STEPS.length - 1 && (
                        <span className="h-px flex-1 bg-[var(--color-line)]" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <AnimatePresence mode="wait">
                {status === "sent" ? (
                  <SuccessScreen key="sent" name={form.name} />
                ) : (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {step === 0 && (
                      <Choices
                        title="Quel type de projet ?"
                        options={PROJECT_TYPES}
                        value={form.type}
                        onSelect={(v) => set({ type: v })}
                      />
                    )}
                    {step === 1 && (
                      <Choices
                        title="Votre budget approximatif ?"
                        options={BUDGET_RANGES}
                        value={form.budget}
                        onSelect={(v) => set({ budget: v })}
                      />
                    )}
                    {step === 2 && (
                      <Choices
                        title="Pour quand ?"
                        options={TIMELINES}
                        value={form.timeline}
                        onSelect={(v) => set({ timeline: v })}
                      />
                    )}
                    {step === 3 && (
                      <div>
                        <h3 className="mb-5 font-[family-name:var(--font-display)] text-xl font-medium">
                          Dernière étape — on fait connaissance.
                        </h3>
                        <div className="space-y-3">
                          <Field
                            label="Nom"
                            value={form.name}
                            onChange={(v) => set({ name: v })}
                            placeholder="Camille Dupont"
                          />
                          <Field
                            label="Email"
                            value={form.email}
                            onChange={(v) => set({ email: v })}
                            placeholder="camille@entreprise.fr"
                            type="email"
                            invalid={form.email.length > 3 && !emailValid}
                          />
                          <div>
                            <label className="mb-1.5 block text-xs text-[var(--color-text-mute)]">
                              Votre projet en une phrase (optionnel)
                            </label>
                            <textarea
                              value={form.message}
                              onChange={(e) => set({ message: e.target.value })}
                              rows={3}
                              placeholder="On aimerait…"
                              className="w-full resize-none rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-accent)]"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* controls */}
              {status !== "sent" && (
                <div className="mt-8 flex items-center justify-between">
                  <button
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                    disabled={step === 0}
                    className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm text-[var(--color-text-dim)] transition-colors hover:text-[var(--color-text)] disabled:pointer-events-none disabled:opacity-0"
                  >
                    <ArrowLeft size={15} /> Retour
                  </button>

                  {step < 3 ? (
                    <button
                      onClick={() => canNext && setStep((s) => s + 1)}
                      disabled={!canNext}
                      className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-6 py-3 text-sm font-medium text-white transition-opacity disabled:opacity-40"
                    >
                      Continuer <ArrowRight size={15} />
                    </button>
                  ) : (
                    <button
                      onClick={() => canNext && submit()}
                      disabled={!canNext || status === "sending"}
                      className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-6 py-3 text-sm font-medium text-white transition-opacity disabled:opacity-40"
                    >
                      {status === "sending" ? (
                        <>
                          <Loader2 size={15} className="animate-spin" /> Envoi…
                        </>
                      ) : (
                        <>
                          Envoyer <Send size={15} />
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Choices({
  title,
  options,
  value,
  onSelect,
}: {
  title: string;
  options: readonly string[];
  value: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div>
      <h3 className="mb-5 font-[family-name:var(--font-display)] text-xl font-medium">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((opt) => {
          const on = value === opt;
          return (
            <button
              key={opt}
              onClick={() => onSelect(opt)}
              className={cn(
                "group relative flex items-center justify-between rounded-2xl border px-5 py-4 text-left text-sm transition-all duration-300",
                on
                  ? "border-[var(--color-accent-2)] bg-[var(--color-surface-strong)] text-[var(--color-text)]"
                  : "border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-text-dim)] hover:border-[var(--color-line-strong)] hover:text-[var(--color-text)]"
              )}
            >
              {opt}
              <span
                className={cn(
                  "grid h-5 w-5 place-items-center rounded-full border transition-all",
                  on ? "border-[var(--color-accent-2)] bg-[var(--color-accent-2)]" : "border-[var(--color-line-strong)]"
                )}
              >
                {on && <Check size={12} className="text-[var(--color-bg)]" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  invalid,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  invalid?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs text-[var(--color-text-mute)]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-xl border bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-text)] outline-none transition-colors",
          invalid ? "border-[#ff5f57]" : "border-[var(--color-line)] focus:border-[var(--color-accent)]"
        )}
      />
    </div>
  );
}

function SuccessScreen({ name }: { name: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center py-8 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 14 }}
        className="grid h-16 w-16 place-items-center rounded-full bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))]"
      >
        <Check size={30} className="text-white" />
      </motion.div>
      <h3 className="mt-6 font-[family-name:var(--font-display)] text-2xl font-semibold">
        Merci{name ? `, ${name.split(" ")[0]}` : ""} !
      </h3>
      <p className="mt-3 max-w-sm text-[var(--color-text-dim)]">
        Votre demande est bien partie. On revient vers vous sous 24h avec une
        première réflexion. En attendant, allez donc taper le Konami code 👾
      </p>
    </motion.div>
  );
}
