"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import type { ComponentType } from "react";
import { useApp, useLenisApi } from "@/components/providers/AppContext";
import type { GameId } from "@/lib/content";
import type { GameProps } from "./ui";

const Loading = () => (
  <div className="grid min-h-[380px] place-items-center font-mono text-xs tracking-[0.3em] text-cambridge">
    CHARGEMENT DU JEU<span className="animate-blink">▮</span>
  </div>
);

/* Chaque jeu est un chunk séparé, chargé à la première ouverture. */
const GAMES: Record<GameId, { title: string; tagline: string; Comp: ComponentType<GameProps> }> = {
  catcher: {
    title: "Data Catcher",
    tagline: "Extrayez la donnée propre, ignorez le bruit",
    Comp: dynamic(() => import("./DataCatcher"), { ssr: false, loading: Loading }),
  },
  chain: {
    title: "Chaîne de réaction",
    tagline: "Câblez le workflow dans le bon ordre",
    Comp: dynamic(() => import("./ChainReaction"), { ssr: false, loading: Loading }),
  },
  shipit: {
    title: "Ship It",
    tagline: "Empilez les blocs, livrez la page",
    Comp: dynamic(() => import("./ShipIt"), { ssr: false, loading: Loading }),
  },
};

export default function GameModal() {
  const { activeGame, closeGame } = useApp();
  const { lock, unlock } = useLenisApi();

  useEffect(() => {
    if (!activeGame) return;
    lock();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeGame();
    window.addEventListener("keydown", onKey);
    return () => {
      unlock();
      window.removeEventListener("keydown", onKey);
    };
  }, [activeGame, lock, unlock, closeGame]);

  const meta = activeGame ? GAMES[activeGame] : null;

  return (
    <AnimatePresence>
      {activeGame && meta && (
        <motion.div
          key={activeGame}
          className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="absolute inset-0 bg-ink/85 backdrop-blur-sm" onClick={closeGame} aria-hidden />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Mini-jeu : ${meta.title}`}
            initial={{ scale: 0.93, y: 28, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 10, opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex max-h-[92svh] w-[min(94vw,780px)] flex-col overflow-hidden rounded-3xl border border-mist/12 bg-abyss shadow-panel"
          >
            {/* Barre de fenêtre façon terminal */}
            <div className="flex items-center justify-between gap-3 border-b border-mist/10 px-5 py-3.5">
              <div className="flex min-w-0 items-center gap-2">
                <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-mist/15" />
                <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-sage/60" />
                <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-mindaro" />
                <span className="ml-2 truncate font-mono text-[10px] uppercase tracking-[0.18em] text-cambridge sm:text-[11px]">
                  {meta.title} — {meta.tagline}
                </span>
              </div>
              <button
                onClick={closeGame}
                aria-label="Fermer le jeu"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-mist/15 text-sm text-mist transition-colors hover:border-mindaro/60 hover:text-mindaro"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto p-4 sm:p-6">
              <meta.Comp onExit={closeGame} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
