"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Monogramme « MJ » interlacé — filet d'or fin. Le M se prolonge en J (crochet).
 * Traçable (stroke via pathLength) pour le preloader ; instantané ailleurs.
 */
export default function Monogram({
  className,
  color = "var(--or)",
  animated = false,
  play = true,
  strokeWidth = 2,
  withFrame = true,
}: {
  className?: string;
  color?: string;
  animated?: boolean;
  play?: boolean;
  strokeWidth?: number;
  withFrame?: boolean;
}) {
  const state = animated ? (play ? "show" : "hidden") : "show";

  const stroke = {
    fill: "none",
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const trace = (duration: number, delay: number) => ({
    pathLength: { duration, ease: [0.22, 1, 0.36, 1] as const, delay },
    opacity: { duration: 0.25, delay },
  });

  const traceVariants = {
    hidden: { pathLength: animated ? 0 : 1, opacity: animated ? 0 : 1 },
    show: { pathLength: 1, opacity: 1 },
  };

  return (
    <motion.svg
      viewBox="0 0 200 200"
      className={cn("overflow-visible", className)}
      initial={animated ? "hidden" : false}
      animate={state}
      aria-hidden
    >
      {withFrame && (
        <motion.ellipse
          cx="100"
          cy="100"
          rx="80"
          ry="90"
          {...stroke}
          strokeWidth={strokeWidth * 0.6}
          variants={traceVariants}
          transition={trace(1.6, 0)}
        />
      )}
      {/* MJ interlacé : M dont le dernier montant descend en crochet de J */}
      <motion.path
        d="M58 132 L58 72 L100 118 L142 72 L142 140 C142 156 126 160 116 150"
        {...stroke}
        variants={traceVariants}
        transition={trace(1.5, withFrame ? 0.5 : 0)}
      />
      {/* Petit point du J */}
      <motion.circle
        cx="112"
        cy="70"
        r={strokeWidth * 0.9}
        fill={color}
        variants={{ hidden: { scale: animated ? 0 : 1, opacity: animated ? 0 : 1 }, show: { scale: 1, opacity: 1 } }}
        transition={{ duration: 0.4, delay: withFrame ? 1.7 : 1.2, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: "112px 70px" }}
      />
    </motion.svg>
  );
}
