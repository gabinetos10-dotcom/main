"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { petalRain, burst } from "@/lib/confetti";

/**
 * Easter egg on-brand : taper « OUI » (ou déclencher l'événement mj:oui)
 * fait pleuvoir pétales & confettis + un bandeau calligraphié, dismissible.
 */
export default function EasterEgg() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Clin d'œil discret pour les curieux qui ouvrent la console.
    console.log(
      "%cFélicitations, vous venez de dire oui !%c\n♡ Maison Jolie Wedding — tapez « OUI » pour la surprise.",
      "font-family: cursive; font-size: 20px; color: #E38B6D;",
      "font-family: serif; font-size: 12px; color: #46343B;"
    );

    let buffer = "";
    const trigger = () => {
      setShow(true);
      petalRain(3400);
      burst(window.innerWidth / 2, window.innerHeight / 2, { count: 40, power: 12 });
      window.setTimeout(() => setShow(false), 6000);
    };

    const onKey = (e: KeyboardEvent) => {
      // On ignore la saisie dans les champs.
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key.length === 1) {
        buffer = (buffer + e.key).toUpperCase().slice(-3);
        if (buffer === "OUI") {
          buffer = "";
          trigger();
        }
      }
    };
    const onEvent = () => trigger();

    window.addEventListener("keydown", onKey);
    window.addEventListener("mj:oui", onEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mj:oui", onEvent);
    };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-x-0 top-24 z-[85] flex justify-center px-4"
          initial={{ opacity: 0, y: -24, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -24, scale: 0.9 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="invitation-card flex items-center gap-4 px-7 py-4 shadow-lift">
            <span className="script-accent text-3xl text-terracotta">
              Félicitations, vous venez de dire oui !
            </span>
            <button
              onClick={() => setShow(false)}
              aria-label="Fermer"
              className="text-prune/40 transition-colors hover:text-terracotta"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
