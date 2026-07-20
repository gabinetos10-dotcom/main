"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Botanique en trait fin (eucalyptus / olivier), tracée au scroll via pathLength.
 * Filigrane dans les marges — purement décoratif.
 */

type BotanicalProps = {
  variant?: "sprig" | "branch";
  className?: string;
  flip?: boolean;
  color?: string;
  duration?: number;
};

const traceTransition = (duration: number, delay = 0) => ({
  pathLength: { duration, ease: [0.22, 1, 0.36, 1] as const, delay },
  opacity: { duration: 0.3, delay },
});

export default function Botanical({
  variant = "sprig",
  className,
  flip = false,
  color = "var(--sauge)",
  duration = 2,
}: BotanicalProps) {
  const common = {
    fill: "none",
    stroke: color,
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    vectorEffect: "non-scaling-stroke" as const,
  };

  return (
    <motion.svg
      aria-hidden
      viewBox="0 0 120 260"
      className={cn("overflow-visible", className)}
      style={{ transform: flip ? "scaleX(-1)" : undefined }}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-10%" }}
    >
      {/* Tige principale */}
      <motion.path
        d="M60 254 C58 200 66 150 58 104 C52 66 60 34 62 8"
        {...common}
        variants={{ hidden: { pathLength: 0, opacity: 0 }, show: { pathLength: 1, opacity: 1 } }}
        transition={traceTransition(duration)}
      />
      {variant === "sprig"
        ? // Feuilles arrondies d'eucalyptus, alternées
          leafPositions.map((p, i) => (
            <motion.path
              key={i}
              d={eucalyptusLeaf(p.x, p.y, p.side)}
              {...common}
              variants={{ hidden: { pathLength: 0, opacity: 0 }, show: { pathLength: 1, opacity: 0.85 } }}
              transition={traceTransition(duration * 0.5, 0.25 + i * 0.09)}
            />
          ))
        : // Feuilles pointues d'olivier
          leafPositions.map((p, i) => (
            <motion.path
              key={i}
              d={oliveLeaf(p.x, p.y, p.side)}
              {...common}
              variants={{ hidden: { pathLength: 0, opacity: 0 }, show: { pathLength: 1, opacity: 0.85 } }}
              transition={traceTransition(duration * 0.5, 0.25 + i * 0.09)}
            />
          ))}
    </motion.svg>
  );
}

const leafPositions = [
  { x: 60, y: 214, side: 1 },
  { x: 61, y: 184, side: -1 },
  { x: 62, y: 156, side: 1 },
  { x: 58, y: 128, side: -1 },
  { x: 59, y: 100, side: 1 },
  { x: 61, y: 74, side: -1 },
  { x: 62, y: 50, side: 1 },
];

function eucalyptusLeaf(x: number, y: number, side: number) {
  const w = 26 * side;
  const h = 20;
  return `M${x} ${y} C${x + w * 0.4} ${y - h * 0.9}, ${x + w} ${y - h * 0.5}, ${x + w} ${y} C${x + w} ${y + h * 0.5}, ${x + w * 0.4} ${y + h * 0.9}, ${x} ${y} Z`;
}

function oliveLeaf(x: number, y: number, side: number) {
  const w = 30 * side;
  const h = 9;
  return `M${x} ${y} C${x + w * 0.5} ${y - h}, ${x + w} ${y - h * 0.4}, ${x + w} ${y} C${x + w} ${y + h * 0.4}, ${x + w * 0.5} ${y + h}, ${x} ${y} Z`;
}
