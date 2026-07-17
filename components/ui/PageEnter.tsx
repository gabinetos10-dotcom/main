"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Entrée de page (pages secondaires) : fondu + translation avec
 * l'easing signature — aucun flash blanc, le fond sombre est porté
 * par le layout.
 */
export function PageEnter({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
