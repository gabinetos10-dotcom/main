"use client";

import { useEffect, useRef, useState } from "react";
import { SectionHeading } from "@/components/ui/Section";
import Botanical from "@/components/decor/Botanical";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { journey } from "@/lib/content";

/**
 * « Le parcours d'un oui » — timeline épinglée. Le défilement vertical fait
 * glisser horizontalement les étapes (GSAP ScrollTrigger + pin). Chaque étape
 * se révèle via containerAnimation. Repli vertical si prefers-reduced-motion.
 *
 * On ne bascule sur la version horizontale (GSAP) qu'APRÈS le montage client,
 * une fois la préférence de mouvement connue — le rendu SSR/initial reste le
 * repli vertical, sûr et sans dépendance JS.
 */
export default function JourneyTimeline() {
  const reduced = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(false);
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);
  const horizontalMode = mounted && !reduced;

  useEffect(() => {
    if (!horizontalMode) return;
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    let cleanup = () => {};
    (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      const ctx = gsap.context(() => {
        const getScrollAmount = () => track.scrollWidth - window.innerWidth;

        const horizontal = gsap.to(track, {
          x: () => -getScrollAmount(),
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => `+=${getScrollAmount()}`,
            scrub: 1,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        // Révélation de chaque panneau à mesure qu'il entre dans le cadre.
        gsap.utils.toArray<HTMLElement>(".journey-panel").forEach((panel) => {
          const items = panel.querySelectorAll<HTMLElement>("[data-reveal]");
          gsap.from(items, {
            y: 40,
            opacity: 0,
            filter: "blur(8px)",
            duration: 0.8,
            stagger: 0.08,
            ease: "power3.out",
            scrollTrigger: {
              trigger: panel,
              containerAnimation: horizontal,
              start: "left center",
              toggleActions: "play none none reverse",
            },
          });
        });
      }, section);

      ScrollTrigger.refresh();
      cleanup = () => ctx.revert();
    })();

    return () => cleanup();
  }, [horizontalMode]);

  if (!horizontalMode) {
    // Repli accessible (SSR + reduced-motion) : timeline verticale simple.
    return (
      <section id="parcours" className="relative py-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <SectionHeading
            kicker="Le parcours d'un oui"
            title="De la première idée au grand jour."
          />
          <ol className="mt-12 space-y-10 border-l-2 border-or/30 pl-8">
            {journey.map((s) => (
              <li key={s.step} className="relative">
                <span className="absolute -left-[2.6rem] flex h-8 w-8 items-center justify-center rounded-full bg-terracotta text-sm text-ivoire">
                  {s.step}
                </span>
                <h3 className="font-serif text-2xl text-prune">{s.title}</h3>
                <p className="mt-2 text-prune/70">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    );
  }

  return (
    <section
      id="parcours"
      ref={sectionRef}
      className="relative h-screen overflow-hidden"
      aria-label="Le parcours d'un oui"
    >
      <div ref={trackRef} className="flex h-full w-max flex-nowrap items-center will-change-transform">
        {/* Panneau d'intro */}
        <div className="journey-panel flex h-full w-screen shrink-0 flex-col justify-center px-6 sm:px-16 lg:w-[46vw] lg:pl-24">
          <p className="kicker mb-4" data-reveal>
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-px w-6 bg-terracotta/60" />
              Le parcours d&apos;un oui
            </span>
          </p>
          <h2 className="max-w-md font-serif text-display-sm font-light leading-[1.02] text-prune" data-reveal>
            De la première <em className="italic text-sunwash">idée</em> au grand <em className="italic text-rose-poudre">jour</em>.
          </h2>
          <p className="mt-5 max-w-sm text-prune/70" data-reveal>
            Quatre temps, une même main qui vous guide. Faites défiler pour suivre le chemin.
          </p>
          <div className="mt-8 flex items-center gap-2 text-prune/45" data-reveal>
            <span className="text-xs uppercase tracking-kicker">Défiler</span>
            <svg viewBox="0 0 40 8" className="h-2 w-10">
              <path d="M0 4h34M30 1l6 3-6 3" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Étapes */}
        {journey.map((s, i) => (
          <div
            key={s.step}
            className="journey-panel relative flex h-full w-screen shrink-0 flex-col justify-center px-6 sm:px-16 lg:w-[38vw]"
          >
            {/* Filet reliant les étapes */}
            <div className="absolute left-0 top-1/2 hidden h-px w-full bg-gradient-to-r from-or/10 via-or/30 to-or/10 lg:block" />
            <div className="relative">
              <Botanical
                variant={i % 2 ? "branch" : "sprig"}
                flip={i % 2 === 0}
                className="absolute -top-40 left-2 h-40 w-24 opacity-50"
                color={i % 2 ? "var(--rose-poudre)" : "var(--sauge)"}
              />
              <div className="flex items-center gap-4" data-reveal>
                <span className="script-accent text-6xl text-terracotta">{s.step}</span>
                <span className="h-px w-16 bg-or/40" />
              </div>
              <h3 className="mt-4 font-serif text-4xl font-light text-prune" data-reveal>
                {s.title}
              </h3>
              <p className="mt-4 max-w-sm text-prune/70 text-pretty" data-reveal>
                {s.text}
              </p>
            </div>
          </div>
        ))}

        {/* Panneau final — appel à l'action */}
        <div className="journey-panel flex h-full w-screen shrink-0 flex-col justify-center px-6 sm:px-16 lg:w-[34vw] lg:pr-24">
          <p className="script-accent text-4xl text-terracotta" data-reveal>
            Et vous ?
          </p>
          <h3 className="mt-3 max-w-xs font-serif text-3xl font-light text-prune" data-reveal>
            Écrivons ensemble votre histoire.
          </h3>
          <a
            href="/contact"
            data-reveal
            className="mt-6 inline-flex w-fit items-center gap-2 rounded-pill bg-terracotta px-7 py-3.5 text-sm font-semibold text-ivoire shadow-bloom"
          >
            Je me marie !
          </a>
        </div>
      </div>
    </section>
  );
}
