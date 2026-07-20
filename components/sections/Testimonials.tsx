"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Section, SectionHeading } from "@/components/ui/Section";
import Botanical from "@/components/decor/Botanical";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { testimonials } from "@/lib/content";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function Testimonials() {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const reduced = usePrefersReducedMotion();
  const paused = useRef(false);

  const go = useCallback((next: number) => {
    setDir(next > index ? 1 : -1);
    setIndex((next + testimonials.length) % testimonials.length);
  }, [index]);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      if (!paused.current) {
        setDir(1);
        setIndex((i) => (i + 1) % testimonials.length);
      }
    }, 6000);
    return () => window.clearInterval(id);
  }, [reduced]);

  const t = testimonials[index];

  return (
    <Section id="temoignages" className="overflow-hidden">
      <SectionHeading
        align="center"
        kicker="Elles & ils l'ont vécu"
        title={
          <>
            Des mots qui <em className="italic text-sunwash">réchauffent</em>.
          </>
        }
      />

      <div
        className="relative mx-auto mt-12 max-w-3xl"
        onMouseEnter={() => (paused.current = true)}
        onMouseLeave={() => (paused.current = false)}
      >
        <Botanical variant="sprig" className="absolute -left-8 -top-6 hidden w-20 opacity-50 sm:block" color="var(--sauge)" />
        <Botanical variant="sprig" flip className="absolute -right-8 -bottom-6 hidden w-20 opacity-50 sm:block" color="var(--rose-poudre)" />

        <div className="invitation-card relative min-h-[280px] overflow-hidden px-7 py-12 text-center sm:px-16">
          <span className="script-accent pointer-events-none absolute left-6 top-2 text-7xl text-blush">“</span>
          <AnimatePresence mode="wait" custom={dir}>
            <motion.blockquote
              key={index}
              custom={dir}
              initial={{ opacity: 0, x: dir * 40, filter: "blur(6px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: dir * -40, filter: "blur(6px)" }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <p className="font-serif text-2xl font-light leading-snug text-prune sm:text-3xl text-balance">
                {t.quote}
              </p>
              <footer className="mt-6">
                <p className="script-accent text-3xl text-terracotta">{t.author}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-prune/50">{t.place}</p>
              </footer>
            </motion.blockquote>
          </AnimatePresence>
        </div>

        {/* Contrôles */}
        <div className="mt-6 flex items-center justify-center gap-4">
          <NavArrow label="Précédent" dir="left" onClick={() => go(index - 1)} />
          <div className="flex gap-2" role="tablist" aria-label="Choisir un témoignage">
            {testimonials.map((_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === index}
                aria-label={`Témoignage ${i + 1}`}
                onClick={() => go(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === index ? "w-6 bg-terracotta" : "w-2 bg-prune/20 hover:bg-prune/40"
                }`}
              />
            ))}
          </div>
          <NavArrow label="Suivant" dir="right" onClick={() => go(index + 1)} />
        </div>
      </div>
    </Section>
  );
}

function NavArrow({ label, dir, onClick }: { label: string; dir: "left" | "right"; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-or/30 text-prune/70 transition-colors hover:border-terracotta hover:text-terracotta"
    >
      <svg viewBox="0 0 24 24" className={`h-4 w-4 ${dir === "left" ? "rotate-180" : ""}`} fill="none">
        <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
