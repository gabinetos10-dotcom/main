"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Séparateur « ruban » qui ondule/se dénoue entre les sections.
 * Le tracé se dessine au scroll ; une seconde passe ajoute la matière.
 */
export default function RibbonDivider({
  className,
  color = "var(--or)",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <div className={cn("relative flex justify-center py-10", className)} aria-hidden>
      <motion.svg
        viewBox="0 0 640 60"
        className="h-12 w-full max-w-3xl overflow-visible"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-20%" }}
      >
        <motion.path
          d="M10 30 C 120 -10, 200 70, 320 30 S 520 -10, 630 30"
          fill="none"
          stroke={color}
          strokeWidth={1.4}
          strokeLinecap="round"
          variants={{ hidden: { pathLength: 0, opacity: 0 }, show: { pathLength: 1, opacity: 1 } }}
          transition={{ pathLength: { duration: 1.6, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.3 } }}
        />
        {/* Nœud central */}
        <motion.circle
          cx="320"
          cy="30"
          r="3.2"
          fill={color}
          variants={{ hidden: { scale: 0, opacity: 0 }, show: { scale: 1, opacity: 1 } }}
          transition={{ duration: 0.5, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: "320px 30px" }}
        />
      </motion.svg>
    </div>
  );
}
