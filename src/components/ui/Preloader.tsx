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

  // Freeze scroll while the curtain is up.
  useEffect(() => {
    stop();
    document.body.style.overflow = "hidden";
    return () => {
      start();
      document.body.style.overflow = "";
    };
  }, [stop, start]);

  // Fluid, ease‑out count to 100.
  useEffect(() => {
    let raf = 0;
    const duration = 2400;
    const tick = (t: number) => {
      if (startedAt.current === null) startedAt.current = t;
      const elapsed = t - startedAt.current;
      const p = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const value = Math.round(eased * 100);
      setCount(value);
      setWordIndex(Math.min(WORDS.length - 1, Math.floor(p * WORDS.length)));
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setTimeout(() => setVisible(false), 380);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Ordered slats for the curtain reveal.
  const slats = useMemo(() => Array.from({ length: 7 }), []);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 1 }}
          exit={{ transition: { duration: 0.9 } }}
        >
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
                  transition: {
                    duration: 0.85,
                    ease: [0.83, 0, 0.17, 1],
                    delay: i * 0.05,
                  },
                }}
              />
            ))}
          </div>

          {/* Aura */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 50% at 50% 50%, rgba(123,97,255,0.18), transparent 70%)",
            }}
          />

          {/* Content */}
          <motion.div
            className="relative z-10 flex flex-col items-center gap-8 px-6"
            exit={{ opacity: 0, y: -20, transition: { duration: 0.4 } }}
          >
            <GlyphMark />

            <div className="flex flex-col items-center gap-3">
              <div className="flex items-baseline gap-1 font-[family-name:var(--font-display)] tabular-nums">
                <span className="text-[18vw] leading-none font-semibold text-gradient sm:text-[9rem]">
                  {String(count).padStart(3, "0")}
                </span>
                <span className="mb-3 text-2xl font-medium text-[var(--color-text-dim)]">%</span>
              </div>

              <div className="h-[2px] w-56 overflow-hidden rounded-full bg-[var(--color-line)] sm:w-72">
                <motion.div
                  className="h-full bg-[linear-gradient(90deg,var(--color-accent),var(--color-accent-2))]"
                  style={{ width: `${count}%` }}
                />
              </div>

              <div className="h-5 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={wordIndex}
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -12, opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="block font-[family-name:var(--font-mono)] text-[0.7rem] tracking-[0.35em] text-[var(--color-text-dim)]"
                  >
                    {WORDS[wordIndex]}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Animated GJS monogram that "draws" itself. */
function GlyphMark() {
  return (
    <motion.svg
      width="88"
      height="88"
      viewBox="0 0 100 100"
      fill="none"
      initial="hidden"
      animate="visible"
      className="drop-shadow-[0_0_24px_rgba(123,97,255,0.5)]"
    >
      <defs>
        <linearGradient id="pl-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" />
          <stop offset="100%" stopColor="var(--color-accent-2)" />
        </linearGradient>
      </defs>
      <motion.circle
        cx="50"
        cy="50"
        r="44"
        stroke="url(#pl-grad)"
        strokeWidth="1.5"
        variants={{
          hidden: { pathLength: 0, opacity: 0 },
          visible: { pathLength: 1, opacity: 1, transition: { duration: 1.6, ease: "easeInOut" } },
        }}
      />
      <motion.path
        d="M62 34 H42 a10 10 0 0 0 -10 10 v12 a10 10 0 0 0 10 10 h8 a10 10 0 0 0 10 -10 v-6 H50"
        stroke="url(#pl-grad)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={{
          hidden: { pathLength: 0 },
          visible: { pathLength: 1, transition: { duration: 1.4, delay: 0.3, ease: "easeInOut" } },
        }}
      />
    </motion.svg>
  );
}
