"use client";

import dynamic from "next/dynamic";
import Lenis from "lenis";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { scrollStore } from "@/lib/store";
import { clamp } from "@/lib/utils";
import type { GameId } from "@/lib/content";
import { useReducedMotionPref } from "@/hooks/useMediaQuery";
import { AppContext, LenisContext, type AppState, type LenisApi } from "./AppContext";
import { CustomCursor } from "@/components/layout/CustomCursor";
import { CookieBanner } from "@/components/layout/CookieBanner";
import { EasterEggs } from "@/components/terminal/EasterEggs";

/* Chargés uniquement à l'ouverture (code-splitting) */
const Terminal = dynamic(() => import("@/components/terminal/Terminal"), { ssr: false });
const MatrixRain = dynamic(() => import("@/components/fx/MatrixRain"), { ssr: false });
const GameModal = dynamic(() => import("@/components/games/GameModal"), { ssr: false });

export function Providers({ children }: { children: ReactNode }) {
  const reduced = useReducedMotionPref();

  /* ─────────── État global ─────────── */
  const [preloaderDone, setPreloaderDone] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [matrixOn, setMatrixOn] = useState(false);
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);

  const appState = useMemo<AppState>(
    () => ({
      preloaderDone,
      finishPreloader: () => setPreloaderDone(true),
      sceneReady,
      markSceneReady: () => setSceneReady(true),
      terminalOpen,
      setTerminalOpen,
      matrixOn,
      setMatrixOn,
      activeGame,
      openGame: (g: GameId) => setActiveGame(g),
      closeGame: () => setActiveGame(null),
      consentDialogOpen,
      setConsentDialogOpen,
    }),
    [preloaderDone, sceneReady, terminalOpen, matrixOn, activeGame, consentDialogOpen]
  );

  /* ─────────── Lenis + synchronisation ScrollTrigger ───────────
     Recette officielle : Lenis pilote ScrollTrigger.update, GSAP
     ticker pilote Lenis. Une seule boucle rAF pour tout le site. */
  const lenisRef = useRef<Lenis | null>(null);
  const locksRef = useRef(0);

  useEffect(() => {
    if (reduced) {
      // Motion réduite : scroll natif, mais on alimente quand même le store
      const onScroll = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        scrollStore.y = window.scrollY;
        scrollStore.progress = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
        scrollStore.velocity = 0;
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      return () => window.removeEventListener("scroll", onScroll);
    }

    const lenis = new Lenis({
      autoRaf: false,
      lerp: 0.11,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
    });
    lenisRef.current = lenis;

    lenis.on("scroll", (l: Lenis) => {
      scrollStore.y = l.scroll;
      scrollStore.progress = l.limit > 0 ? clamp(l.scroll / l.limit, 0, 1) : 0;
      scrollStore.velocity = l.velocity;
      ScrollTrigger.update();
    });

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reduced]);

  const scrollTo = useCallback(
    (target: string | number | HTMLElement, opts?: { immediate?: boolean }) => {
      const lenis = lenisRef.current;
      if (lenis) {
        lenis.scrollTo(target, { duration: opts?.immediate ? 0 : 1.6 });
        return;
      }
      // Fallback natif (motion réduite / lenis absent)
      if (typeof target === "number") {
        window.scrollTo({ top: target });
      } else {
        const el = typeof target === "string" ? document.querySelector(target) : target;
        el?.scrollIntoView({ behavior: "auto", block: "start" });
      }
    },
    []
  );

  const lock = useCallback(() => {
    locksRef.current += 1;
    lenisRef.current?.stop();
    document.documentElement.style.overflow = "hidden";
  }, []);

  const unlock = useCallback(() => {
    locksRef.current = Math.max(0, locksRef.current - 1);
    if (locksRef.current === 0) {
      lenisRef.current?.start();
      document.documentElement.style.overflow = "";
    }
  }, []);

  const lenisApi = useMemo<LenisApi>(
    () => ({ lenis: () => lenisRef.current, scrollTo, lock, unlock }),
    [scrollTo, lock, unlock]
  );

  /* Ancre présente dans l'URL au chargement (ex. /#services) */
  useEffect(() => {
    if (!preloaderDone) return;
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      const t = setTimeout(() => scrollTo(hash), 350);
      return () => clearTimeout(t);
    }
  }, [preloaderDone, scrollTo]);

  return (
    <AppContext.Provider value={appState}>
      <LenisContext.Provider value={lenisApi}>
        {children}

        {/* Couches globales */}
        <CustomCursor />
        <EasterEggs />
        {matrixOn && <MatrixRain />}
        {terminalOpen && <Terminal />}
        <GameModal />
        <CookieBanner />
      </LenisContext.Provider>
    </AppContext.Provider>
  );
}
