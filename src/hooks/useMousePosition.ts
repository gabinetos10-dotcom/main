"use client";

import { useEffect, useRef, useState } from "react";

export type Vec2 = { x: number; y: number };

/**
 * Tracks the pointer. Returns state (re‑renders) and a ref (rAF‑friendly, no
 * re‑render) so heavy canvases can read position without React churn.
 */
export function useMousePosition() {
  const [position, setPosition] = useState<Vec2>({ x: 0, y: 0 });
  const ref = useRef<Vec2>({ x: 0, y: 0 });
  // Normalised to [-1, 1] with origin at viewport centre.
  const normalized = useRef<Vec2>({ x: 0, y: 0 });

  useEffect(() => {
    let frame = 0;
    const handle = (e: PointerEvent) => {
      ref.current = { x: e.clientX, y: e.clientY };
      normalized.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -((e.clientY / window.innerHeight) * 2 - 1),
      };
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        setPosition({ x: e.clientX, y: e.clientY })
      );
    };
    window.addEventListener("pointermove", handle, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handle);
      cancelAnimationFrame(frame);
    };
  }, []);

  return { position, ref, normalized };
}
