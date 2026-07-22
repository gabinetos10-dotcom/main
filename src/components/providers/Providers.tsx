"use client";

import type { ReactNode } from "react";
import { SmoothScroll } from "./SmoothScroll";
import { EasterEggProvider } from "./EasterEgg";
import { MatrixTerminal } from "@/components/easter-egg/MatrixTerminal";

/** Client‑side app shell: smooth scroll + easter‑egg CLI overlay. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <SmoothScroll>
      <EasterEggProvider>
        {children}
        <MatrixTerminal />
      </EasterEggProvider>
    </SmoothScroll>
  );
}
