"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Cookie, X } from "lucide-react";
import { useEffect, useState } from "react";

const KEY = "gjs-consent";

export function CookieConsent({ onOpenPrivacy }: { onOpenPrivacy: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    if (!stored) {
      const id = setTimeout(() => setVisible(true), 2600);
      return () => clearTimeout(id);
    }
  }, []);

  const decide = (choice: "all" | "essential") => {
    localStorage.setItem(KEY, JSON.stringify({ choice, at: Date.now() }));
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-x-4 bottom-4 z-[80] mx-auto max-w-xl sm:inset-x-auto sm:right-6 sm:bottom-6 sm:mx-0"
        >
          <div className="glass border-gradient relative overflow-hidden rounded-[var(--radius)] p-5">
            <button
              onClick={() => decide("essential")}
              aria-label="Fermer"
              className="absolute right-3 top-3 text-[var(--color-text-mute)] transition-colors hover:text-[var(--color-text)]"
            >
              <X size={16} />
            </button>
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--color-surface-strong)]">
                <Cookie size={17} className="text-[var(--color-accent-2)]" />
              </div>
              <div className="pr-4">
                <p className="text-sm font-medium text-[var(--color-text)]">
                  On respecte votre vie privée 🍪
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-dim)]">
                  Quelques cookies pour la mesure d'audience, jamais de revente.
                  Réglez ça comme vous voulez —{" "}
                  <button
                    onClick={onOpenPrivacy}
                    className="underline decoration-[var(--color-line-strong)] underline-offset-2 hover:text-[var(--color-text)]"
                  >
                    en savoir plus
                  </button>
                  .
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => decide("all")}
                className="flex-1 rounded-full bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-4 py-2.5 text-sm font-medium text-white"
              >
                Tout accepter
              </button>
              <button
                onClick={() => decide("essential")}
                className="flex-1 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-text-dim)] transition-colors hover:text-[var(--color-text)]"
              >
                Essentiels
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
