"use client";

import { useRef } from "react";
import { usePrefersReducedMotion, useHasPointer } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/**
 * Carte en tilt 3D doux qui suit le curseur. Désactivée au tactile / reduced-motion.
 * Un halo lumineux discret suit également le pointeur.
 */
export default function TiltCard({
  children,
  className,
  max = 8,
  glow = true,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
  glow?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = usePrefersReducedMotion();
  const hasPointer = useHasPointer();
  const enabled = !reduced && hasPointer;

  const onMove = (e: React.MouseEvent) => {
    if (!enabled || !ref.current) return;
    const el = ref.current;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rx = (0.5 - py) * max * 2;
    const ry = (px - 0.5) * max * 2;
    el.style.setProperty("--rx", `${rx}deg`);
    el.style.setProperty("--ry", `${ry}deg`);
    el.style.setProperty("--mx", `${px * 100}%`);
    el.style.setProperty("--my", `${py * 100}%`);
  };

  const onLeave = () => {
    if (!ref.current) return;
    ref.current.style.setProperty("--rx", "0deg");
    ref.current.style.setProperty("--ry", "0deg");
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={cn("group relative [transform-style:preserve-3d]", className)}
      style={{
        transform: enabled
          ? "perspective(900px) rotateX(var(--rx,0)) rotateY(var(--ry,0))"
          : undefined,
        transition: "transform 0.4s cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      {children}
      {glow && enabled && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(240px circle at var(--mx,50%) var(--my,50%), rgba(255,255,255,0.35), transparent 60%)",
          }}
        />
      )}
    </div>
  );
}
