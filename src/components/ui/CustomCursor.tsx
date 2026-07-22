"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Bespoke cursor: an exact‑tracking dot plus a lagging ring that grows over
 * interactive targets. Uses mix-blend-difference so it inverts against both the
 * dark site and the light footer. Desktop / fine‑pointer only.
 */
export function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [down, setDown] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 320, damping: 28, mass: 0.5 });
  const ringY = useSpring(y, { stiffness: 320, damping: 28, mass: 0.5 });

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!mq.matches) return;
    setEnabled(true);

    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const t = e.target as HTMLElement | null;
      if (!t?.closest) return;
      setHovering(!!t.closest("a, button, [role='button'], [data-cursor='hover']"));
      setHidden(!!t.closest("input, textarea, select"));
    };
    const enter = () => setHidden(false);
    const leave = () => setHidden(true);
    const dn = () => setDown(true);
    const up = () => setDown(false);

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", dn);
    window.addEventListener("pointerup", up);
    document.addEventListener("pointerenter", enter);
    document.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", dn);
      window.removeEventListener("pointerup", up);
      document.removeEventListener("pointerenter", enter);
      document.removeEventListener("pointerleave", leave);
    };
  }, [x, y]);

  if (!enabled) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[200] hidden md:block"
      style={{ mixBlendMode: "difference" }}
      aria-hidden
    >
      {/* dot */}
      <motion.div style={{ x, y }} className="absolute left-0 top-0">
        <motion.div
          className="-translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
          animate={{ width: hidden ? 0 : down ? 10 : 6, height: hidden ? 0 : down ? 10 : 6 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </motion.div>
      {/* ring */}
      <motion.div style={{ x: ringX, y: ringY }} className="absolute left-0 top-0">
        <motion.div
          className="-translate-x-1/2 -translate-y-1/2 rounded-full border border-white"
          animate={{
            width: hidden ? 0 : hovering ? 56 : 26,
            height: hidden ? 0 : hovering ? 56 : 26,
            opacity: hidden ? 0 : hovering ? 1 : 0.65,
          }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
        />
      </motion.div>
    </div>
  );
}
