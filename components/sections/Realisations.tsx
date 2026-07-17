"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { CASES, CASES_META, type CaseStudy } from "@/lib/content";
import { useReducedMotionPref } from "@/hooks/useMediaQuery";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useAnchor } from "@/hooks/useAnchor";

/** « Screenshot » abstrait 100 % CSS — aucun asset externe. */
function FakeScreen({ c }: { c: CaseStudy }) {
  const [a, b] = c.tint;
  return (
    <div
      data-cursor="VOIR"
      className="group relative min-h-[240px] overflow-hidden rounded-2xl border border-mist/10 lg:min-h-[340px]"
      style={{ background: `linear-gradient(135deg, ${a}d9 0%, ${b}59 100%)` }}
      aria-hidden
    >
      {/* chrome navigateur */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-1.5 border-b border-mist/10 bg-ink/50 px-4 py-2.5 backdrop-blur-sm">
        <span className="h-2 w-2 rounded-full bg-mist/20" />
        <span className="h-2 w-2 rounded-full bg-mist/20" />
        <span className="h-2 w-2 rounded-full bg-mindaro/50" />
        <span className="ml-3 rounded bg-ink/50 px-2 py-0.5 font-mono text-[9px] tracking-wider text-cambridge/80">
          www.{c.id}.fr
        </span>
      </div>
      {/* UI abstraite */}
      <div className="space-y-3 p-5 pt-12 transition-transform duration-700 ease-(--ease-gjs) group-hover:-translate-y-2">
        <div className="rounded-xl bg-ink/30 p-4 backdrop-blur-[2px]">
          <div className="h-3 w-1/2 rounded bg-mist/35" />
          <div className="mt-2 h-2 w-1/3 rounded bg-mist/15" />
          <div className="mt-3 h-6 w-20 rounded-full bg-mindaro/80" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="h-16 rounded-lg bg-ink/25" />
          <div className="h-16 rounded-lg bg-ink/25" />
          <div className="h-16 rounded-lg bg-ink/25" />
        </div>
        <div className="h-2 w-3/4 rounded bg-mist/12" />
        <div className="h-2 w-1/2 rounded bg-mist/12" />
      </div>
      {/* reflet balayé au survol */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-mist/10 to-transparent transition-transform duration-1000 ease-(--ease-gjs) group-hover:translate-x-full" />
    </div>
  );
}

/**
 * Réalisations : pile de cartes sticky — chaque étude de cas se range
 * sous la suivante en s'éloignant légèrement (scrub GSAP).
 */
export function Realisations() {
  const listRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotionPref();
  const onAnchor = useAnchor();

  useGSAP(
    () => {
      if (reduced || !listRef.current) return;
      const cards = Array.from(listRef.current.querySelectorAll<HTMLElement>("[data-case-card]"));
      cards.forEach((el, i) => {
        const next = cards[i + 1];
        if (!next) return;
        gsap.to(el, {
          scale: 0.93,
          autoAlpha: 0.5,
          transformOrigin: "center top",
          ease: "none",
          scrollTrigger: { trigger: next, start: "top 95%", end: "top 25%", scrub: true },
        });
      });
    },
    { dependencies: [reduced], revertOnUpdate: true, scope: listRef }
  );

  return (
    <section id="realisations" data-section className="scroll-mt-24 py-28 lg:py-40">
      <div className="container-gjs">
        <SectionHeading
          index="03"
          eyebrow={CASES_META.eyebrow}
          title={CASES_META.title}
          note={CASES_META.note}
        />

        <div ref={listRef} className="mt-16 flex flex-col gap-8 lg:gap-12">
          {CASES.map((c, i) => (
            <div
              key={c.id}
              data-case-card
              className="sticky will-change-transform"
              style={{ top: `calc(13vh + ${i * 1.4}rem)` }}
            >
              <article className="grid gap-7 rounded-3xl border border-mist/10 bg-deep/80 p-6 shadow-panel backdrop-blur-lg sm:p-8 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:p-10">
                <div className="flex flex-col justify-between gap-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-cambridge">
                      <span className="text-mindaro">0{i + 1}</span>
                      <span>{c.meta}</span>
                      <span className="rounded-full border border-mist/15 px-2.5 py-0.5">{c.year}</span>
                    </div>
                    <h3 className="mt-4 font-display text-display-md font-semibold text-mist">{c.name}</h3>
                    <p className="mt-3 max-w-lg text-sm leading-relaxed text-cambridge lg:text-base">
                      {c.description}
                    </p>
                  </div>
                  <div>
                    <p className="font-display text-[clamp(2rem,4vw,3rem)] font-semibold leading-none text-mindaro">
                      {c.stat.value}
                    </p>
                    <p className="mt-1 text-sm text-cambridge">{c.stat.label}</p>
                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      {c.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-mist/12 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-cambridge"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <a
                      href="/#contact"
                      onClick={onAnchor("/#contact")}
                      className="link-sweep mt-6 inline-block font-mono text-[11px] uppercase tracking-[0.2em] text-mist hover:text-mindaro"
                    >
                      Un projet similaire ? Parlons-en →
                    </a>
                  </div>
                </div>
                <FakeScreen c={c} />
              </article>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
