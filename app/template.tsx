"use client";

import { motion } from "framer-motion";
import Monogram from "@/components/brand/Monogram";
import { usePrefersReducedMotion } from "@/lib/hooks";

const VEIL_EASE = [0.76, 0, 0.24, 1] as const;

/**
 * Transition de page : un voile coloré (blush→soleil) balaie l'écran à chaque
 * navigation, monogramme au centre, puis se soulève en révélant la page.
 * (template.tsx est re-monté à chaque changement de route.)
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduced = usePrefersReducedMotion();

  return (
    <>
      <motion.div
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {children}
      </motion.div>

      {!reduced && (
        <div className="pointer-events-none fixed inset-0 z-[95]" aria-hidden>
          {/* Pan supérieur */}
          <motion.div
            className="absolute inset-x-0 top-0 h-1/2 origin-top"
            style={{ background: "linear-gradient(180deg, var(--blush), var(--soleil))" }}
            initial={{ scaleY: 1 }}
            animate={{ scaleY: 0 }}
            transition={{ duration: 0.7, ease: VEIL_EASE }}
          />
          {/* Pan inférieur */}
          <motion.div
            className="absolute inset-x-0 bottom-0 h-1/2 origin-bottom"
            style={{ background: "linear-gradient(0deg, var(--soleil), var(--blush))" }}
            initial={{ scaleY: 1 }}
            animate={{ scaleY: 0 }}
            transition={{ duration: 0.7, ease: VEIL_EASE }}
          />
          {/* Monogramme central pendant la bascule */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <Monogram className="w-16" color="var(--prune)" strokeWidth={3} withFrame={false} />
          </motion.div>
        </div>
      )}
    </>
  );
}
