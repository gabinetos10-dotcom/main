"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion, useHasPointer } from "@/lib/hooks";

const TRAIL_SIZE = 10;

/**
 * Curseur personnalisé discret (point + halo) qui grossit sur les zones
 * cliquables, avec une fine traînée de pétales. Desktop uniquement.
 */
export default function CustomCursor() {
  const reduced = usePrefersReducedMotion();
  const hasPointer = useHasPointer();
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const trailRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (reduced || !hasPointer || !mounted) return;
    document.documentElement.style.cursor = "none";

    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ring = { x: pos.x, y: pos.y };
    let grow = false;
    let trailIndex = 0;
    let lastTrail = 0;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%,-50%)`;
      }
      // Traînée de pétales, throttlée
      const now = performance.now();
      if (now - lastTrail > 70) {
        lastTrail = now;
        const petal = trailRefs.current[trailIndex % TRAIL_SIZE];
        if (petal) {
          petal.style.transition = "none";
          petal.style.opacity = "0.55";
          petal.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%,-50%) scale(1) rotate(${Math.random() * 360}deg)`;
          // reflow puis fade
          void petal.offsetWidth;
          petal.style.transition = "transform 0.9s ease-out, opacity 0.9s ease-out";
          petal.style.opacity = "0";
          petal.style.transform = `translate3d(${pos.x + (Math.random() - 0.5) * 40}px, ${pos.y + 30 + Math.random() * 30}px, 0) translate(-50%,-50%) scale(0.4) rotate(${Math.random() * 360}deg)`;
        }
        trailIndex++;
      }
    };

    const onOver = (e: MouseEvent) => {
      const t = (e.target as HTMLElement)?.closest?.(
        'a, button, [role="button"], input, textarea, select, [data-cursor="grow"]'
      );
      grow = !!t;
    };

    const loop = () => {
      ring.x += (pos.x - ring.x) * 0.16;
      ring.y += (pos.y - ring.y) * 0.16;
      if (ringRef.current) {
        const scale = grow ? 1.8 : 1;
        ringRef.current.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0) translate(-50%,-50%) scale(${scale})`;
        ringRef.current.style.opacity = grow ? "1" : "0.6";
      }
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver, { passive: true });
    raf = requestAnimationFrame(loop);

    return () => {
      document.documentElement.style.cursor = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      cancelAnimationFrame(raf);
    };
  }, [reduced, hasPointer, mounted]);

  if (reduced || !hasPointer || !mounted) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]" aria-hidden>
      <div
        ref={ringRef}
        className="fixed left-0 top-0 h-9 w-9 rounded-full border transition-[opacity] duration-200"
        style={{ borderColor: "color-mix(in oklab, var(--terracotta) 60%, transparent)" }}
      />
      <div
        ref={dotRef}
        className="fixed left-0 top-0 h-1.5 w-1.5 rounded-full"
        style={{ background: "var(--terracotta)" }}
      />
      {Array.from({ length: TRAIL_SIZE }).map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            trailRefs.current[i] = el;
          }}
          className="fixed left-0 top-0 block h-2.5 w-2.5 opacity-0"
          style={{
            background: ["#F6D2CE", "#FBE3A1", "#E38B6D"][i % 3],
            borderRadius: "60% 0 60% 0",
          }}
        />
      ))}
    </div>
  );
}
