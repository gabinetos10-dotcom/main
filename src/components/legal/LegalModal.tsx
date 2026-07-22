"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import { MentionsContent, ConfidentialiteContent } from "./legalContent";

export type LegalType = "mentions" | "confidentialite" | null;

const TITLES: Record<Exclude<LegalType, null>, string> = {
  mentions: "Mentions légales",
  confidentialite: "Politique de confidentialité",
};

export function LegalModal({ type, onClose }: { type: LegalType; onClose: () => void }) {
  useEffect(() => {
    if (!type) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [type, onClose]);

  return (
    <AnimatePresence>
      {type && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="glass border-gradient relative z-10 max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-t-[var(--radius-lg)] sm:rounded-[var(--radius-lg)]"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-line)] px-6 py-4">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-medium">
                {type && TITLES[type]}
              </h2>
              <button
                onClick={onClose}
                aria-label="Fermer"
                className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-line)] text-[var(--color-text-dim)] transition-colors hover:text-[var(--color-text)]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
              {type === "mentions" ? <MentionsContent /> : <ConfidentialiteContent />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
