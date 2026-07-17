"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useState } from "react";
import { pointerStore } from "@/lib/store";
import { useIsTouch, useReducedMotionPref } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

/**
 * Curseur signature GJS (desktop uniquement) :
 * point lime + anneau élastique qui grossit sur les éléments interactifs,
 * affiche des labels contextuels ([data-cursor="VOIR"]) et s'inverse
 * sur les surfaces claires ([data-cursor-invert]).
 */
export function CustomCursor() {
  const isTouch = useIsTouch();
  const reduced = useReducedMotionPref();
  const [mounted, setMounted] = useState(false);
  const [hover, setHover] = useState(false);
  const [down, setDown] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [label, setLabel] = useState<string | null>(null);
  const [invert, setInvert] = useState(false);

  const mx = useMotionValue(-100);
  const my = useMotionValue(-100);
  const ringX = useSpring(mx, { stiffness: 420, damping: 38, mass: 0.7 });
  const ringY = useSpring(my, { stiffness: 420, damping: 38, mass: 0.7 });

  const active = mounted && !isTouch && !reduced;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!active) {
      document.documentElement.classList.remove("gjs-cursor");
      return;
    }
    document.documentElement.classList.add("gjs-cursor");

    const onMove = (e: PointerEvent) => {
      mx.set(e.clientX);
      my.set(e.clientY);
      pointerStore.x = e.clientX;
      pointerStore.y = e.clientY;
      pointerStore.nx = (e.clientX / window.innerWidth) * 2 - 1;
      pointerStore.ny = -((e.clientY / window.innerHeight) * 2 - 1);
      pointerStore.lastMove = performance.now();
      setHidden(false);
    };

    const onOver = (e: PointerEvent) => {
      const el = e.target as Element | null;
      if (!el || !(el instanceof Element)) return;
      const interactive = el.closest(
        'a, button, [role="button"], input, textarea, select, label, [data-magnetic]'
      );
      setHover(Boolean(interactive));
      const labelled = el.closest("[data-cursor]");
      setLabel(labelled?.getAttribute("data-cursor") || null);
      setInvert(Boolean(el.closest("[data-cursor-invert]")));
    };

    const onDown = () => setDown(true);
    const onUp = () => setDown(false);
    const onLeave = () => setHidden(true);
    const onEnter = () => setHidden(false);

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    document.documentElement.addEventListener("pointerleave", onLeave);
    document.documentElement.addEventListener("pointerenter", onEnter);

    return () => {
      document.documentElement.classList.remove("gjs-cursor");
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.documentElement.removeEventListener("pointerenter", onEnter);
    };
  }, [active, mx, my]);

  if (!active) return null;

  const ringScale = down ? 0.8 : label ? 2.4 : hover ? 1.7 : 1;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[300]">
      {/* Anneau élastique */}
      <motion.div
        style={{ x: ringX, y: ringY }}
        className="absolute left-0 top-0"
        animate={{ opacity: hidden ? 0 : 1 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          animate={{ scale: ringScale }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className={cn(
            "-ml-[18px] -mt-[18px] flex h-9 w-9 items-center justify-center rounded-full border transition-colors duration-300",
            invert ? "border-yale/80" : "border-mist/40",
            label && (invert ? "bg-ink/90 border-ink" : "bg-mindaro border-mindaro")
          )}
        >
          {label && (
            <span
              className={cn(
                "font-mono text-[8px] font-semibold uppercase tracking-[0.18em]",
                invert ? "text-mindaro" : "text-ink"
              )}
            >
              {label}
            </span>
          )}
        </motion.div>
      </motion.div>

      {/* Point central */}
      <motion.div
        style={{ x: mx, y: my }}
        animate={{ opacity: hidden || Boolean(label) ? 0 : 1, scale: down ? 0.6 : 1 }}
        transition={{ duration: 0.15 }}
        className="absolute left-0 top-0"
      >
        <div
          className={cn(
            "-ml-[3px] -mt-[3px] h-1.5 w-1.5 rounded-full transition-colors duration-300",
            invert ? "bg-yale" : "bg-mindaro"
          )}
        />
      </motion.div>
    </div>
  );
}
