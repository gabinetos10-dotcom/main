"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { readConsent, writeConsent } from "@/lib/consent";
import { useApp } from "@/components/providers/AppContext";
import { cn } from "@/lib/utils";

function Switch({
  checked,
  onChange,
  locked,
  label,
}: {
  checked: boolean;
  onChange?: (v: boolean) => void;
  locked?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={locked}
      onClick={() => onChange?.(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300",
        checked ? "bg-sage" : "bg-navy",
        locked && "cursor-not-allowed opacity-60"
      )}
    >
      <span
        className={cn(
          "absolute top-1 h-4 w-4 rounded-full bg-mist transition-[left] duration-300 ease-(--ease-gjs)",
          checked ? "left-6" : "left-1"
        )}
      />
    </button>
  );
}

/**
 * Bandeau de consentement RGPD.
 * — AUCUN traceur ne se charge sans consentement (le site n'en embarque
 *   d'ailleurs aucun par défaut, cf. lib/consent.ts).
 * — Refuser est aussi visible et simple qu'accepter.
 * — Réouvrable à tout moment via « Gérer les cookies » (footer).
 */
export function CookieBanner() {
  const { consentDialogOpen, setConsentDialogOpen, preloaderDone } = useApp();
  const pathname = usePathname();
  const [decided, setDecided] = useState<boolean | null>(null);
  const [custom, setCustom] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [media, setMedia] = useState(false);

  useEffect(() => {
    const c = readConsent();
    setDecided(c !== null);
    if (c) {
      setAnalytics(c.analytics);
      setMedia(c.media);
    }
  }, [consentDialogOpen]);

  // Sur la home on attend la fin du preloader pour ne pas polluer l'arrivée
  const gate = pathname === "/" ? preloaderDone : true;
  const open = consentDialogOpen || (decided === false && gate);

  const decide = (a: boolean, m: boolean) => {
    writeConsent({ analytics: a, media: m });
    setDecided(true);
    setConsentDialogOpen(false);
    setCustom(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="cookies"
          role="dialog"
          aria-label="Préférences de cookies"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1, transition: { delay: 0.5, duration: 0.7, ease: [0.16, 1, 0.3, 1] } }}
          exit={{ y: 40, opacity: 0, transition: { duration: 0.3 } }}
          className="fixed bottom-4 left-4 right-4 z-[70] rounded-2xl border border-mist/10 bg-abyss/95 p-5 shadow-panel backdrop-blur-md sm:right-auto sm:w-[26rem]"
        >
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.28em] text-mindaro">
            Cookies — zéro traceur par défaut
          </p>
          <p className="text-sm leading-relaxed text-cambridge">
            Ce site n'embarque <strong className="text-mist">aucun traceur publicitaire</strong>. La mesure
            d'audience anonyme ne s'activera que si vous l'acceptez.{" "}
            <Link href="/politique-de-confidentialite" className="text-mindaro underline underline-offset-2">
              En savoir plus
            </Link>
          </p>

          {custom && (
            <div className="mt-4 space-y-3 border-t border-mist/10 pt-4">
              {[
                {
                  label: "Essentiels",
                  desc: "Mémorisation de vos choix. Toujours actifs.",
                  checked: true,
                  locked: true,
                  onChange: undefined as ((v: boolean) => void) | undefined,
                },
                {
                  label: "Mesure d'audience",
                  desc: "Statistiques anonymes de visite.",
                  checked: analytics,
                  locked: false,
                  onChange: setAnalytics,
                },
                {
                  label: "Contenus externes",
                  desc: "Médias embarqués depuis des tiers.",
                  checked: media,
                  locked: false,
                  onChange: setMedia,
                },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-mist">{row.label}</p>
                    <p className="text-xs text-cambridge">{row.desc}</p>
                  </div>
                  <Switch checked={row.checked} onChange={row.onChange} locked={row.locked} label={row.label} />
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {custom ? (
              <>
                <button
                  onClick={() => decide(analytics, media)}
                  className="rounded-full bg-mindaro px-5 py-2.5 text-xs font-semibold text-ink transition-shadow hover:shadow-glow-sm"
                >
                  Enregistrer mes choix
                </button>
                <button
                  onClick={() => decide(false, false)}
                  className="rounded-full border border-mist/20 px-5 py-2.5 text-xs font-semibold text-mist transition-colors hover:border-mindaro/60 hover:text-mindaro"
                >
                  Tout refuser
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => decide(false, false)}
                  className="rounded-full border border-mist/20 px-5 py-2.5 text-xs font-semibold text-mist transition-colors hover:border-mindaro/60 hover:text-mindaro"
                >
                  Tout refuser
                </button>
                <button
                  onClick={() => decide(true, true)}
                  className="rounded-full bg-mindaro px-5 py-2.5 text-xs font-semibold text-ink transition-shadow hover:shadow-glow-sm"
                >
                  Tout accepter
                </button>
                <button
                  onClick={() => setCustom(true)}
                  className="font-mono text-[11px] uppercase tracking-[0.18em] text-cambridge underline underline-offset-4 transition-colors hover:text-mist"
                >
                  Personnaliser
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
