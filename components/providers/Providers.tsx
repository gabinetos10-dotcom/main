"use client";

import { MotionConfig } from "framer-motion";
import SmoothScrollProvider from "./SmoothScrollProvider";

/**
 * Fournisseurs globaux. MotionConfig avec reducedMotion="user" fait respecter
 * automatiquement prefers-reduced-motion à toutes les animations Framer Motion.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <SmoothScrollProvider>{children}</SmoothScrollProvider>
    </MotionConfig>
  );
}
