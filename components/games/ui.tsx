"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

export interface GameProps {
  onExit: () => void;
}

/** Écran d'intro commun aux mini-jeux. */
export function GameIntro({
  title,
  rules,
  cta,
  onStart,
}: {
  title: string;
  rules: string[];
  cta: string;
  onStart: () => void;
}) {
  return (
    <div className="flex min-h-[380px] flex-col items-center justify-center gap-6 text-center">
      <h3 className="font-display text-3xl font-semibold text-mist sm:text-4xl">{title}</h3>
      <ul className="space-y-2 font-mono text-xs leading-relaxed text-cambridge sm:text-sm">
        {rules.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <button
        onClick={onStart}
        data-cursor="GO"
        className="mt-2 inline-flex min-h-[48px] items-center gap-2 rounded-full bg-mindaro px-8 py-3.5 font-mono text-sm font-semibold uppercase tracking-[0.14em] text-ink transition-shadow hover:shadow-glow-sm"
      >
        {cta} <span aria-hidden>▶</span>
      </button>
    </div>
  );
}

/** Écran de fin commun : score, grade, message d'expertise GJS. */
export function GameEnd({
  score,
  scoreLabel = "Score",
  rank,
  pitch,
  onReplay,
  onExit,
  extra,
}: {
  score: string;
  scoreLabel?: string;
  rank: string;
  pitch: string;
  onReplay: () => void;
  onExit: () => void;
  extra?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex min-h-[380px] flex-col items-center justify-center gap-4 text-center"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cambridge">{scoreLabel}</p>
      <p className="font-display text-6xl font-semibold text-mindaro drop-shadow-[0_0_24px_rgba(203,223,144,0.45)]">
        {score}
      </p>
      <p className="font-display text-xl font-medium text-mist">{rank}</p>
      {extra}
      <p className="max-w-md text-sm leading-relaxed text-cambridge">{pitch}</p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={onReplay}
          className="min-h-[44px] rounded-full bg-mindaro px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink transition-shadow hover:shadow-glow-sm"
        >
          Rejouer
        </button>
        <button
          onClick={onExit}
          className="min-h-[44px] rounded-full border border-mist/20 px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-mist transition-colors hover:border-mindaro/60 hover:text-mindaro"
        >
          Fermer
        </button>
      </div>
    </motion.div>
  );
}
