"use client";

import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Révélation au scroll : léger translateY + flou→net + fondu.
 * (Le respect de prefers-reduced-motion est assuré par <MotionConfig> global.)
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 26,
  as = "div",
  once = true,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: "div" | "span" | "li" | "section" | "figure";
  once?: boolean;
}) {
  const MotionTag = motion[as] as typeof motion.div;
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once, margin: "-12%" }}
      transition={{ duration: 0.9, ease: EASE, delay }}
    >
      {children}
    </MotionTag>
  );
}

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: EASE } },
};

/** Conteneur à stagger — enfants révélés en cascade. */
export function Stagger({
  children,
  className,
  once = true,
}: {
  children: React.ReactNode;
  className?: string;
  once?: boolean;
}) {
  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-10%" }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}

/**
 * Révélation par masque (voile qu'on soulève) — pour les visuels.
 * Un pan coloré balaie l'image en découvrant le contenu.
 */
export function MaskReveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <motion.div
        initial={{ scale: 1.12 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 1.2, ease: EASE, delay }}
        className="h-full w-full"
      >
        {children}
      </motion.div>
      {/* Voile qui se soulève */}
      <motion.div
        aria-hidden
        className="absolute inset-0 origin-bottom"
        style={{ background: "linear-gradient(180deg, var(--blush), var(--soleil))" }}
        initial={{ scaleY: 1 }}
        whileInView={{ scaleY: 0 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 1, ease: [0.76, 0, 0.24, 1], delay }}
      />
    </div>
  );
}
