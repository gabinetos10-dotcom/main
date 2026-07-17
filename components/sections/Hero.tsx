"use client";

import { useRef } from "react";
import { gsap, useGSAP, EASE } from "@/lib/gsap";
import { HERO } from "@/lib/content";
import { useApp } from "@/components/providers/AppContext";
import { useReducedMotionPref } from "@/hooks/useMediaQuery";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Hero : trois verbes, trois traitements typographiques (plein / trait /
 * dégradé lumineux). L'intro attend la fin du preloader pour enchaîner
 * sans coupure — le loader « devient » le hero.
 */
export function Hero() {
  const { preloaderDone } = useApp();
  const reduced = useReducedMotionPref();
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reduced || !rootRef.current) return;
      const q = gsap.utils.selector(rootRef);

      if (!preloaderDone) {
        // état d'attente pendant le preloader (jamais visible sans JS)
        gsap.set(q("[data-hero-line]"), { yPercent: 115 });
        gsap.set(q("[data-hero-fade]"), { autoAlpha: 0, y: 26 });
        return;
      }

      const tl = gsap.timeline();
      tl.fromTo(
        q("[data-hero-line]"),
        { yPercent: 115 },
        { yPercent: 0, duration: 1.25, stagger: 0.11, ease: EASE }
      ).fromTo(
        q("[data-hero-fade]"),
        { autoAlpha: 0, y: 26 },
        { autoAlpha: 1, y: 0, duration: 1, stagger: 0.09, ease: EASE },
        "-=0.75"
      );

      // Parallaxe de sortie : le contenu remonte doucement, le watermark dérive
      gsap.to(q("[data-hero-content]"), {
        yPercent: -9,
        ease: "none",
        scrollTrigger: { trigger: rootRef.current, start: "top top", end: "bottom top", scrub: true },
      });
      gsap.to(q("[data-hero-mark]"), {
        yPercent: 26,
        ease: "none",
        scrollTrigger: { trigger: rootRef.current, start: "top top", end: "bottom top", scrub: true },
      });
    },
    { dependencies: [preloaderDone, reduced], revertOnUpdate: true, scope: rootRef }
  );

  return (
    <section
      ref={rootRef}
      id="top"
      className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden pb-10 pt-36 sm:pb-14"
    >
      {/* Watermark GJS au trait, en parallaxe */}
      <div
        aria-hidden
        data-hero-mark
        className="text-outline-faint pointer-events-none absolute -right-[4%] top-[10%] select-none font-display text-[36vw] font-bold leading-none"
      >
        GJS
      </div>

      <div data-hero-content className="container-gjs relative">
        <p data-hero-fade className="eyebrow mb-7 flex items-center gap-3">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-mindaro" />
          {HERO.eyebrow}
          <span aria-hidden className="animate-blink text-mindaro">
            ▮
          </span>
        </p>

        <h1 className="font-display text-display-2xl font-semibold text-mist">
          {HERO.lines.map((line, i) => (
            <span key={line} className="block overflow-hidden pb-[0.06em]">
              <span
                data-hero-line
                className={cn(
                  "inline-block will-change-transform",
                  i === 1 && "text-outline",
                  i === 2 && "text-glow-gradient"
                )}
              >
                {line}
              </span>
            </span>
          ))}
        </h1>

        <div className="mt-9 grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-16">
          <p data-hero-fade className="max-w-xl text-lead text-cambridge">
            {HERO.sub}
          </p>
          <div data-hero-fade className="flex flex-wrap items-center gap-4">
            <Button href="/#contact" cursorLabel="GO">
              {HERO.ctaPrimary} <span aria-hidden>↗</span>
            </Button>
            <Button href="/#services" variant="ghost">
              {HERO.ctaSecondary}
            </Button>
          </div>
        </div>

        {/* Rail bas : indice de scroll + micro-specs */}
        <div
          data-hero-fade
          className="mt-14 flex items-center justify-between gap-6 border-t border-mist/10 pt-6 lg:mt-20"
        >
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em] text-cambridge">
            <span aria-hidden className="relative h-8 w-5 rounded-full border border-mist/25">
              <span className="animate-scroll-dot absolute left-1/2 top-1.5 h-1.5 w-px bg-mindaro" />
            </span>
            {HERO.scrollHint}
          </div>
          <p aria-hidden className="hidden font-mono text-[10px] uppercase tracking-[0.25em] text-cambridge/60 sm:block">
            LCP &lt; 2,5 s · A11Y AA · RGPD OK
          </p>
        </div>
      </div>
    </section>
  );
}
