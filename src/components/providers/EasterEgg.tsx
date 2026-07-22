"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useKonamiCode } from "@/hooks/useKonamiCode";

type EasterEggContextValue = {
  matrixOpen: boolean;
  openMatrix: () => void;
  closeMatrix: () => void;
  /** Header calls this on every logo click; 5 rapid clicks unlock the CLI. */
  registerLogoClick: () => void;
};

const EasterEggContext = createContext<EasterEggContextValue>({
  matrixOpen: false,
  openMatrix: () => {},
  closeMatrix: () => {},
  registerLogoClick: () => {},
});

export const useEasterEgg = () => useContext(EasterEggContext);

export function EasterEggProvider({ children }: { children: ReactNode }) {
  const [matrixOpen, setMatrixOpen] = useState(false);
  const clicks = useRef(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMatrix = useCallback(() => setMatrixOpen(true), []);
  const closeMatrix = useCallback(() => setMatrixOpen(false), []);

  const registerLogoClick = useCallback(() => {
    clicks.current += 1;
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => (clicks.current = 0), 1200);
    if (clicks.current >= 5) {
      clicks.current = 0;
      setMatrixOpen(true);
    }
  }, []);

  useKonamiCode(openMatrix);

  return (
    <EasterEggContext.Provider
      value={{ matrixOpen, openMatrix, closeMatrix, registerLogoClick }}
    >
      {children}
    </EasterEggContext.Provider>
  );
}
