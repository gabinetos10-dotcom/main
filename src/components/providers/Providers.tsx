"use client";

import type { ReactNode } from "react";
import { SmoothScroll } from "./SmoothScroll";
import { EasterEggProvider } from "./EasterEgg";
import { MatrixTerminal } from "@/components/easter-egg/MatrixTerminal";
import { CustomCursor } from "@/components/ui/CustomCursor";

/** Client‑side app shell: smooth scroll + bespoke cursor + easter‑egg overlay. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <SmoothScroll>
      <EasterEggProvider>
        {children}
        <MatrixTerminal />
        <CustomCursor />
      </EasterEggProvider>
    </SmoothScroll>
  );
}
