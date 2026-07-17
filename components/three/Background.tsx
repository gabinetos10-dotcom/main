"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useApp } from "@/components/providers/AppContext";
import { isTouchDevice, prefersReducedMotion, supportsWebGL } from "@/lib/utils";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

/**
 * Chef d'orchestre de l'ambiance 3D.
 * Décide UNE fois du mode :
 *  — « gl »  : scène three.js (qualité haute desktop / allégée tactile)
 *  — « css » : rien à monter, l'aurore CSS du layout suffit
 *    (motion réduite, WebGL indisponible, appareil très modeste)
 * Dans tous les cas le preloader est prévenu via markSceneReady.
 */
export function Background() {
  const { markSceneReady } = useApp();
  const [mode, setMode] = useState<"pending" | "gl" | "css">("pending");
  const [quality, setQuality] = useState<"high" | "low">("high");

  useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const lowMem = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 2;
    if (prefersReducedMotion() || lowMem || !supportsWebGL()) {
      setMode("css");
      return;
    }
    setQuality(isTouchDevice() ? "low" : "high");
    setMode("gl");
  }, []);

  useEffect(() => {
    if (mode === "css") markSceneReady();
  }, [mode, markSceneReady]);

  if (mode !== "gl") return null;
  return <Scene quality={quality} onReady={markSceneReady} />;
}
