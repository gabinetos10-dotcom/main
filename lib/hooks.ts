"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** True lorsque l'utilisateur préfère un mouvement réduit. */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** Media-query générique (SSR-safe). */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}

/** True si l'appareil expose un curseur fin (souris) — désactive les effets curseur au tactile. */
export function useHasPointer() {
  return useMediaQuery("(hover: hover) and (pointer: fine)");
}

/**
 * Effet magnétique : renvoie une ref + un style transform réactif.
 * Le bouton suit doucement le curseur puis revient à sa place.
 */
export function useMagnetic<T extends HTMLElement>(strength = 0.35) {
  const ref = useRef<T | null>(null);
  const reduced = usePrefersReducedMotion();
  const hasPointer = useHasPointer();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || !hasPointer) return;

    let raf = 0;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - (rect.left + rect.width / 2);
      const y = e.clientY - (rect.top + rect.height / 2);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = `translate3d(${x * strength}px, ${y * strength}px, 0)`;
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(raf);
      el.style.transform = "translate3d(0,0,0)";
    };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [strength, reduced, hasPointer]);

  return ref;
}

/** Observe l'apparition d'un élément dans le viewport (une seule fois). */
export function useInView<T extends HTMLElement>(rootMargin = "-12% 0px") {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  return { ref, inView };
}

/** Petit hook de compteur animé (pour les stats). */
export function useCountUp(target: number, active: boolean, duration = 1600) {
  const [value, setValue] = useState(0);
  const reduced = usePrefersReducedMotion();
  const started = useRef(false);

  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;
    if (reduced) {
      setValue(target);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      // easing out-expo adouci
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration, reduced]);

  return value;
}

/** Retourne une callback stable pour scroller en douceur vers une ancre via Lenis. */
export function useAnchorScroll() {
  return useCallback((hash: string) => {
    if (typeof window === "undefined") return;
    const target = document.querySelector(hash);
    if (!target) return;
    const lenis = (window as unknown as { __lenis?: { scrollTo: (t: Element, o?: object) => void } })
      .__lenis;
    if (lenis) lenis.scrollTo(target, { offset: -80, duration: 1.4 });
    else target.scrollIntoView({ behavior: "smooth" });
  }, []);
}
