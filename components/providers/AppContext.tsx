"use client";

import { createContext, useContext } from "react";
import type Lenis from "lenis";
import type { GameId } from "@/lib/content";

/* ─────────── État applicatif global ─────────── */
export interface AppState {
  /** le preloader de la home a terminé sa sortie */
  preloaderDone: boolean;
  finishPreloader: () => void;
  /** la scène 3D (ou son fallback) est prête à être révélée */
  sceneReady: boolean;
  markSceneReady: () => void;

  terminalOpen: boolean;
  setTerminalOpen: (v: boolean) => void;
  matrixOn: boolean;
  setMatrixOn: (v: boolean) => void;

  activeGame: GameId | null;
  openGame: (g: GameId) => void;
  closeGame: () => void;

  consentDialogOpen: boolean;
  setConsentDialogOpen: (v: boolean) => void;
}

export const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp doit être utilisé sous <Providers>");
  return ctx;
}

/* ─────────── Smooth scroll (Lenis) ─────────── */
export interface LenisApi {
  lenis: () => Lenis | null;
  /** défilement fluide vers une ancre/élément/position */
  scrollTo: (target: string | number | HTMLElement, opts?: { immediate?: boolean }) => void;
  /** verrouille le scroll (menu, modales…) — compteur interne */
  lock: () => void;
  unlock: () => void;
}

export const LenisContext = createContext<LenisApi | null>(null);

export function useLenisApi(): LenisApi {
  const ctx = useContext(LenisContext);
  if (!ctx) throw new Error("useLenisApi doit être utilisé sous <Providers>");
  return ctx;
}
