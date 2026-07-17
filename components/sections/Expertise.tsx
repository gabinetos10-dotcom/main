"use client";

import { useRef } from "react";
import { gsap, useGSAP, SplitText } from "@/lib/gsap";
import { EXPERTISE } from "@/lib/content";
import { useReducedMotionPref } from "@/hooks/useMediaQuery";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Counter } from "@/components/ui/Counter";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Expertise : manifeste dont les mots « s'allument » au scroll (scrub),
 * compteurs animés, méthode en 4 temps.
 */
export function Expertise() {
  const rootRef = useRef<HTMLElement>(null);
  const manifestoRef = useRef<HTMLParagraphElement>(null);
  const reduced = useReducedMotionPref();

  useGSAP(
    (_, contextSafe) => {
      const el = manifestoRef.current;
      if (reduced || !el || !contextSafe) return;
      document.fonts.ready.then(
        contextSafe(() => {
          const split = SplitText.create(el, { type: "words" });
          gsap.fromTo(
            split.words,
            { opacity: 0.13 },
            {
              opacity: 1,
              stagger: 0.05,
              ease: "none",
              scrollTrigger: { trigger: el, start: "top 78%", end: "bottom 42%", scrub: 0.5 },
            }
          );
        })
      );
    },
    { scope: rootRef, dependencies: [reduced], revertOnUpdate: true }
  );

  return (
    <section ref={rootRef} id="expertise" data-section className="relative scroll-mt-24 py-28 lg:py-40">
      <div className="container-gjs">
        <SectionHeading index="01" eyebrow={EXPERTISE.eyebrow} title={EXPERTISE.title} />

        <p
          ref={manifestoRef}
          className="mt-14 max-w-4xl font-display text-display-md font-medium leading-[1.35] text-mist"
        >
          {EXPERTISE.manifesto}
        </p>

        {/* Compteurs — chiffres qui prouvent */}
        <div className="mt-20 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-mist/10 bg-mist/10 lg:grid-cols-4">
          {EXPERTISE.counters.map((c, i) => (
            <Reveal key={c.label} delay={i * 0.08} className="bg-abyss/85 p-6 backdrop-blur-sm lg:p-9">
              <Counter
                value={c.value}
                suffix={c.suffix}
                className="font-display text-[clamp(2.1rem,4.5vw,3.4rem)] font-semibold text-mindaro"
              />
              <p className="mt-2 text-sm leading-snug text-cambridge">{c.label}</p>
            </Reveal>
          ))}
        </div>

        {/* Méthode en 4 temps */}
        <div className="mt-24">
          <Reveal y={16}>
            <p className="eyebrow mb-8">Notre méthode — quatre temps, zéro tunnel</p>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {EXPERTISE.steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.09}>
                <div className="group relative h-full rounded-2xl border border-mist/8 bg-abyss/40 p-6 transition-colors duration-500 hover:border-sage/40">
                  <span className="font-mono text-lg text-mindaro">{s.num}</span>
                  <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.25em] text-cambridge/60">
                    étape 0{i + 1}
                  </span>
                  <h3 className="mt-4 font-display text-xl font-semibold text-mist">{s.title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-cambridge">{s.text}</p>
                  {i < EXPERTISE.steps.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute -right-5 top-1/2 hidden h-px w-5 bg-gradient-to-r from-sage/50 to-transparent lg:block"
                    />
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
