"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function SectionHeading({
  kicker,
  index,
  title,
  intro,
  align = "left",
}: {
  kicker: string;
  index?: string;
  title: ReactNode;
  intro?: string;
  align?: "left" | "center";
}) {
  return (
    <div
      className={
        align === "center"
          ? "mx-auto flex max-w-3xl flex-col items-center text-center"
          : "flex max-w-3xl flex-col"
      }
    >
      <div className="mb-6 flex items-center gap-4">
        <motion.span
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="kicker"
        >
          {kicker}
        </motion.span>
        {index && (
          <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-text-mute)]">
            ({index})
          </span>
        )}
      </div>

      {/* Observe the untransformed container, animate the child — otherwise the
          108% offset pushes the h2 out of the IntersectionObserver's view. */}
      <motion.div
        className="overflow-hidden pb-[0.12em]"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
      >
        <motion.h2
          variants={{
            hidden: { y: "110%" },
            show: { y: "0%", transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } },
          }}
          className="font-[family-name:var(--font-display)] text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.03em] text-[var(--color-highlight)] sm:text-5xl lg:text-[3.6rem]"
        >
          {title}
        </motion.h2>
      </motion.div>

      {intro && (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="mt-6 max-w-xl text-[var(--color-text-dim)] sm:text-lg"
        >
          {intro}
        </motion.p>
      )}
    </div>
  );
}
