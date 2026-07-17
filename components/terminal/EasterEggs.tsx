"use client";

import { useEffect, useRef } from "react";
import { useApp } from "@/components/providers/AppContext";

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

/**
 * Déclencheurs d'easter eggs, actifs partout :
 *  — taper « g j s » (hors champs de saisie) → terminal secret
 *  — code Konami ↑↑↓↓←→←→BA → mode matrice (12 s) + terminal
 *  — (le 3ᵉ déclencheur, 5 clics sur le logo, vit dans le Header)
 */
export function EasterEggs() {
  const { setTerminalOpen, setMatrixOn } = useApp();
  const buffer = useRef<string[]>([]);
  const konamiIdx = useRef(0);
  const matrixTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const isTyping = (t: EventTarget | null) =>
      t instanceof HTMLElement &&
      (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);

    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

      /* Konami */
      if (key === KONAMI[konamiIdx.current]) {
        konamiIdx.current += 1;
        if (konamiIdx.current === KONAMI.length) {
          konamiIdx.current = 0;
          setMatrixOn(true);
          setTerminalOpen(true);
          if (matrixTimer.current) clearTimeout(matrixTimer.current);
          matrixTimer.current = setTimeout(() => setMatrixOn(false), 12000);
        }
      } else {
        konamiIdx.current = key === KONAMI[0] ? 1 : 0;
      }

      /* Buffer « gjs » */
      if (/^[a-z]$/.test(key)) {
        buffer.current = [...buffer.current.slice(-2), key];
        if (buffer.current.join("") === "gjs") {
          buffer.current = [];
          setTerminalOpen(true);
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (matrixTimer.current) clearTimeout(matrixTimer.current);
    };
  }, [setTerminalOpen, setMatrixOn]);

  return null;
}
