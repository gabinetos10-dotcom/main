"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Monogram from "@/components/brand/Monogram";
import { usePrefersReducedMotion } from "@/lib/hooks";

const PUNCHLINES = [
  "On prépare votre plus belle histoire…",
  "On dresse la table…",
  "On accorde les couleurs…",
  "On noue les rubans…",
];

const SESSION_KEY = "mj_preloaded";
const EASE = [0.22, 1, 0.36, 1] as const;
const VEIL_EASE = [0.76, 0, 0.24, 1] as const;

export default function Preloader() {
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [line, setLine] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* mode privé : on ignore */
    }
    setExiting(true);
    // Laisse le voile se soulever avant de démonter et de libérer le scroll.
    window.setTimeout(() => {
      setActive(false);
      document.body.classList.remove("no-scroll");
      (window as unknown as { __mjReady?: boolean }).__mjReady = true;
      window.dispatchEvent(new Event("mj:preloaded"));
    }, 1150);
  };

  useEffect(() => {
    // Déjà vu cette session → pas de preloader.
    let seen = false;
    try {
      seen = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      seen = false;
    }
    if (seen || reduced) {
      setActive(false);
      doneRef.current = true;
      document.body.classList.remove("no-scroll");
      // Signale tout de suite pour que le hero s'anime.
      (window as unknown as { __mjReady?: boolean }).__mjReady = true;
      window.dispatchEvent(new Event("mj:preloaded"));
      return;
    }

    document.body.classList.add("no-scroll");
    const skipTimer = window.setTimeout(() => setCanSkip(true), 1000);

    // Progression ~2.6s, easing doux.
    const start = performance.now();
    const total = 2600;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / total, 1);
      const eased = 1 - Math.pow(1 - t, 2.2);
      setProgress(Math.round(eased * 100));
      if (t < 1) raf = requestAnimationFrame(tick);
      else finish();
    };
    raf = requestAnimationFrame(tick);

    const lineTimer = window.setInterval(
      () => setLine((l) => (l + 1) % PUNCHLINES.length),
      850
    );

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(skipTimer);
      window.clearInterval(lineTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="preloader"
          className="fixed inset-0 z-[100] overflow-hidden"
          onClick={() => canSkip && finish()}
          role="status"
          aria-live="polite"
          aria-label="Chargement du site Maison Jolie"
        >
          {/* Deux pans du voile qui s'écartent à la sortie */}
          <motion.div
            className="absolute inset-y-0 left-0 w-1/2"
            style={{ background: "linear-gradient(120deg, var(--creme), var(--ivoire))" }}
            animate={exiting ? { x: "-101%" } : { x: 0 }}
            transition={{ duration: 1.1, ease: VEIL_EASE }}
          />
          <motion.div
            className="absolute inset-y-0 right-0 w-1/2"
            style={{ background: "linear-gradient(240deg, var(--creme), var(--blush))" }}
            animate={exiting ? { x: "101%" } : { x: 0 }}
            transition={{ duration: 1.1, ease: VEIL_EASE }}
          />

          {/* Halo solaire qui monte en intensité */}
          <motion.div
            aria-hidden
            className="absolute left-1/2 top-[-20%] h-[70vh] w-[120vw] -translate-x-1/2"
            style={{
              background:
                "radial-gradient(ellipse at 50% 40%, color-mix(in oklab, var(--soleil) 75%, transparent), transparent 60%)",
            }}
            initial={{ opacity: 0.2 }}
            animate={{ opacity: exiting ? 0 : 0.9 }}
            transition={{ duration: 1.6, ease: EASE }}
          />

          {/* Contenu central */}
          <motion.div
            className="relative z-10 flex h-full flex-col items-center justify-center px-6"
            animate={exiting ? { opacity: 0, y: -18, scale: 0.96 } : { opacity: 1 }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <Monogram className="w-28 sm:w-32" animated play strokeWidth={2.4} />

            {/* « Maison Jolie » écrit à la main (révélation left→right) */}
            <div className="relative mt-4 overflow-hidden">
              <motion.p
                className="script-accent text-4xl text-prune sm:text-5xl"
                initial={{ clipPath: "inset(0 100% 0 0)" }}
                animate={{ clipPath: "inset(0 0% 0 0)" }}
                transition={{ duration: 1.6, ease: EASE, delay: 0.9 }}
              >
                Maison Jolie
              </motion.p>
            </div>

            {/* Ligne de progression blush → soleil */}
            <div className="mt-8 h-[2px] w-56 overflow-hidden rounded-full bg-prune/10">
              <div
                className="h-full rounded-full transition-[width] duration-150 ease-out"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, var(--blush), var(--miel), var(--soleil))",
                }}
              />
            </div>

            {/* Punchline tournante */}
            <div className="mt-5 h-5 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={line}
                  className="text-xs tracking-wide text-prune/60"
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -12, opacity: 0 }}
                  transition={{ duration: 0.4, ease: EASE }}
                >
                  {PUNCHLINES[line]}
                </motion.p>
              </AnimatePresence>
            </div>

            {canSkip && !exiting && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={finish}
                className="mt-10 text-[0.7rem] uppercase tracking-kicker text-prune/45 transition-colors hover:text-terracotta"
              >
                Entrer
              </motion.button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
