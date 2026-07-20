"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const KEY = "mj_cookie_consent";
const EASE = [0.22, 1, 0.36, 1] as const;

type Consent = { necessary: true; analytics: boolean; marketing: boolean };

/**
 * Bannière cookies conforme RGPD : accepter / refuser / personnaliser.
 * Aucun dépôt de cookie tiers avant consentement (le site n'en pose aucun ici).
 * Le choix est mémorisé pour ne pas re-solliciter l'utilisateur.
 */
export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [custom, setCustom] = useState(false);
  const [prefs, setPrefs] = useState<Consent>({ necessary: true, analytics: false, marketing: false });

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(KEY);
    } catch {
      stored = null;
    }
    if (!stored) {
      const t = window.setTimeout(() => setVisible(true), 1400);
      return () => window.clearTimeout(t);
    }
  }, []);

  const save = (c: Consent) => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...c, date: new Date().toISOString() }));
    } catch {
      /* mode privé */
    }
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="dialog"
          aria-label="Gestion des cookies"
          aria-live="polite"
          className="fixed inset-x-3 bottom-3 z-30 sm:inset-x-auto sm:left-6 sm:max-w-md"
          initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 30, filter: "blur(8px)" }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <div className="invitation-card p-5 shadow-lift">
            <p className="font-serif text-lg text-prune">Un soupçon de douceur numérique</p>
            <p className="mt-2 text-sm leading-relaxed text-prune/70">
              Nous utilisons des cookies pour améliorer votre visite. Vous choisissez ce que vous
              acceptez — rien n&apos;est déposé sans votre accord.{" "}
              <Link href="/politique-de-confidentialite" className="underline">
                En savoir plus
              </Link>
              .
            </p>

            <AnimatePresence>
              {custom && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="mt-4 space-y-2 overflow-hidden"
                >
                  <Toggle label="Nécessaires" hint="Toujours actifs" checked disabled />
                  <Toggle
                    label="Mesure d'audience"
                    hint="Statistiques anonymes"
                    checked={prefs.analytics}
                    onChange={(v) => setPrefs((p) => ({ ...p, analytics: v }))}
                  />
                  <Toggle
                    label="Marketing"
                    hint="Contenus personnalisés"
                    checked={prefs.marketing}
                    onChange={(v) => setPrefs((p) => ({ ...p, marketing: v }))}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => save({ necessary: true, analytics: true, marketing: true })}
                className="rounded-pill bg-terracotta px-5 py-2.5 text-sm font-semibold text-ivoire shadow-bloom transition-transform hover:scale-[1.02]"
              >
                Tout accepter
              </button>
              <button
                onClick={() => save({ necessary: true, analytics: false, marketing: false })}
                className="rounded-pill border border-or/40 px-5 py-2.5 text-sm font-medium text-prune transition-colors hover:bg-blush/30"
              >
                Refuser
              </button>
              {custom ? (
                <button
                  onClick={() => save(prefs)}
                  className="rounded-pill px-4 py-2.5 text-sm font-medium text-prune/70 underline"
                >
                  Enregistrer mes choix
                </button>
              ) : (
                <button
                  onClick={() => setCustom(true)}
                  className="rounded-pill px-4 py-2.5 text-sm font-medium text-prune/70 underline"
                >
                  Personnaliser
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl bg-creme/60 px-3 py-2">
      <span className="text-sm text-prune">
        {label} <span className="text-prune/45">· {hint}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-terracotta" : "bg-prune/20"
        } ${disabled ? "opacity-60" : ""}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-ivoire transition-all ${
            checked ? "left-[1.4rem]" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}
