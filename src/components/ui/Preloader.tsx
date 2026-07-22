"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLenis } from "@/components/providers/SmoothScroll";

const WORDS = ["INITIALISATION", "CHARGEMENT ASSETS", "COMPILATION SHADERS", "PRÊT"];

export function Preloader({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(true);
  const [wordIndex, setWordIndex] = useState(0);
  const { stop, start } = useLenis();
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    stop();
    document.body.style.overflow = "hidden";
    return () => {
      start();
      document.body.style.overflow = "";
    };
  }, [stop, start]);

  useEffect(() => {
    let raf = 0;
    const duration = 2400;
    const tick = (t: number) => {
      if (startedAt.current === null) startedAt.current = t;
      const p = Math.min((t - startedAt.current) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(eased * 100));
      setWordIndex(Math.min(WORDS.length - 1, Math.floor(p * WORDS.length)));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setTimeout(() => setVisible(false), 420);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const slats = useMemo(() => Array.from({ length: 8 }), []);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {visible && (
        <motion.div className="fixed inset-0 z-[100]" initial={{ opacity: 1 }}>
          {/* Curtain slats that lift away */}
          <div className="absolute inset-0 flex">
            {slats.map((_, i) => (
              <motion.div
                key={i}
                className="h-full flex-1 bg-[var(--color-bg)]"
                style={{ borderRight: "1px solid rgba(255,255,255,0.03)" }}
                initial={{ y: 0 }}
                exit={{
                  y: "-100%",
                  transition: { duration: 0.9, ease: [0.83, 0, 0.17, 1], delay: i * 0.045 },
                }}
              />
            ))}
          </div>

          <div className="pointer-events-none absolute inset-0 grid-lines opacity-40" />

          {/* Editorial content */}
          <motion.div
            className="relative z-10 flex h-full w-full flex-col justify-between p-6 sm:p-12"
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
          >
            {/* top row */}
            <div className="flex items-start justify-between">
              <span className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-[var(--color-highlight)]">
                GJS<span className="text-[var(--color-accent)]">©</span>
              </span>
              <span className="font-[family-name:var(--font-mono)] text-[0.65rem] uppercase tracking-[0.3em] text-[var(--color-text-mute)]">
                Studio digital · Paris
              </span>
            </div>

            {/* center statement */}
            <div className="max-w-3xl">
              <p className="font-[family-name:var(--font-display)] text-[8vw] font-medium leading-[1.02] tracking-[-0.03em] text-[var(--color-highlight)] sm:text-5xl">
                On donne vie à vos <span className="em text-[var(--color-accent)]">idées</span>.
              </p>
            </div>

            {/* bottom row: rotating word + huge counter */}
            <div>
              <div className="flex items-end justify-between">
                <div className="h-5 overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={wordIndex}
                      initial={{ y: 14, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -14, opacity: 0 }}
                      transition={{ duration: 0.35 }}
                      className="block font-[family-name:var(--font-mono)] text-[0.68rem] tracking-[0.32em] text-[var(--color-text-dim)]"
                    >
                      {WORDS[wordIndex]}
                    </motion.span>
                  </AnimatePresence>
                </div>
                <span className="font-[family-name:var(--font-display)] text-[18vw] font-semibold leading-[0.8] tracking-[-0.04em] text-[var(--color-highlight)] tabular-nums sm:text-[9rem]">
                  {String(count).padStart(3, "0")}
                </span>
              </div>
              {/* full‑width progress rule */}
              <div className="mt-5 h-px w-full bg-[var(--color-line)]">
                <motion.div
                  className="h-full bg-[var(--color-accent)]"
                  style={{ width: `${count}%` }}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
