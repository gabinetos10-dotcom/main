"use client";

import { useEffect, useRef } from "react";
import { PALETTE } from "@/lib/palette";
import { prefersReducedMotion } from "@/lib/utils";

const CHARS = "GJS<>{}[]=+*#01アカサタナハマヤラワ0123456789$€%";

/**
 * Pluie de données façon Matrix — aux couleurs GJS (lime/sage).
 * Activée par le code Konami ou la commande `matrix` du terminal.
 * Canvas 2D throttlé à ~30 fps, inerte en motion réduite.
 */
export default function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const fontSize = 16;
    let columns = 0;
    let drops: number[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      columns = Math.ceil(canvas.width / fontSize);
      drops = Array.from({ length: columns }, () => Math.floor(Math.random() * -40));
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let acc = 0;
    let last = performance.now();

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      acc += now - last;
      last = now;
      if (acc < 33) return; // ~30 fps suffisent largement
      acc = 0;

      ctx.fillStyle = "rgba(4, 7, 14, 0.14)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < columns; i++) {
        const ch = CHARS[Math.floor(Math.random() * CHARS.length)]!;
        const y = drops[i]! * fontSize;
        if (y > 0) {
          ctx.fillStyle = Math.random() > 0.92 ? PALETTE.lumen : Math.random() > 0.5 ? PALETTE.mindaro : PALETTE.sage;
          ctx.globalAlpha = Math.random() * 0.5 + 0.5;
          ctx.fillText(ch, i * fontSize, y);
          ctx.globalAlpha = 1;
        }
        if (y > canvas.height && Math.random() > 0.975) drops[i] = 0;
        else drops[i] = drops[i]! + 1;
      }
    };
    raf = requestAnimationFrame((t) => {
      last = t;
      draw(t);
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[85] opacity-70 transition-opacity duration-500"
    />
  );
}
