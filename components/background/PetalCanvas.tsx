"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion, useHasPointer } from "@/lib/hooks";

type Petal = {
  x: number;
  y: number;
  size: number;
  rot: number;
  vr: number;
  vx: number;
  vy: number;
  sway: number;
  swaySpeed: number;
  hue: string;
  alpha: number;
  depth: number; // 0..1 pour parallaxe
};

// Teintes douces, toujours on-brand quel que soit le moodboard.
const PETAL_HUES = ["#F6D2CE", "#E39AA1", "#FBE3A1", "#F4C871", "#E38B6D"];

/**
 * Système de pétales en canvas 2D — dérive diagonale, densité faible, réaction
 * douce au curseur et au scroll. Plafonné pour tenir 60fps même sur mobile.
 */
export default function PetalCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduced = usePrefersReducedMotion();
  const hasPointer = useHasPointer();

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let petals: Petal[] = [];
    const mouse = { x: -9999, y: -9999, active: false };
    let scrollVel = 0;
    let lastScroll = window.scrollY;

    const count = () => {
      const area = window.innerWidth * window.innerHeight;
      // densité faible ; plafonnée
      const base = Math.round(area / 62000);
      const cap = window.innerWidth < 768 ? 14 : 26;
      return Math.min(base, cap);
    };

    const makePetal = (initial = false): Petal => {
      const depth = 0.4 + Math.random() * 0.6;
      return {
        x: Math.random() * width,
        y: initial ? Math.random() * height : -20 - Math.random() * height * 0.3,
        size: (7 + Math.random() * 11) * depth,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.02,
        vx: (0.25 + Math.random() * 0.5) * depth,
        vy: (0.35 + Math.random() * 0.6) * depth,
        sway: Math.random() * Math.PI * 2,
        swaySpeed: 0.008 + Math.random() * 0.014,
        hue: PETAL_HUES[Math.floor(Math.random() * PETAL_HUES.length)],
        alpha: 0.18 + Math.random() * 0.3,
        depth,
      };
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      petals = Array.from({ length: count() }, () => makePetal(true));
    };

    const drawPetal = (p: Petal) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot + Math.sin(p.sway) * 0.4);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.hue;
      // Forme de pétale : deux arcs qui se rejoignent en pointe.
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.quadraticCurveTo(p.size * 0.7, -p.size * 0.2, 0, p.size);
      ctx.quadraticCurveTo(-p.size * 0.7, -p.size * 0.2, 0, -p.size);
      ctx.fill();
      ctx.restore();
    };

    let raf = 0;
    let running = true;

    const tick = () => {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);
      scrollVel *= 0.9;

      for (const p of petals) {
        // Dérive diagonale + oscillation
        p.sway += p.swaySpeed;
        p.x += p.vx + Math.sin(p.sway) * 0.4;
        p.y += p.vy + scrollVel * 0.02 * p.depth;
        p.rot += p.vr;

        // Réaction douce au curseur (répulsion légère)
        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 120) {
            const force = (1 - dist / 120) * 0.6;
            p.x += (dx / (dist || 1)) * force;
            p.y += (dy / (dist || 1)) * force;
          }
        }

        // Recyclage
        if (p.y > height + 30 || p.x > width + 40) {
          Object.assign(p, makePetal(false));
        }
        drawPetal(p);
      }
      raf = requestAnimationFrame(tick);
    };

    const onMouse = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };
    const onLeave = () => (mouse.active = false);
    const onScroll = () => {
      const y = window.scrollY;
      scrollVel = y - lastScroll;
      lastScroll = y;
    };
    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };

    resize();
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    if (hasPointer) window.addEventListener("mousemove", onMouse, { passive: true });
    window.addEventListener("mouseout", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("mouseout", onLeave);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduced, hasPointer]);

  if (reduced) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[2]"
    />
  );
}
