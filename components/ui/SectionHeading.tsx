"use client";

import { useRef } from "react";
import { gsap, useGSAP, SplitText, EASE } from "@/lib/gsap";
import { useReducedMotionPref } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";

interface Props {
  index: string;
  eyebrow: string;
  title: string;
  note?: string;
  className?: string;
  titleClassName?: string;
}

/**
 * En-tête de section — la grammaire visuelle commune :
 * micro-label mono « instrument de mesure » + grand titre display
 * révélé ligne par ligne (SplitText masqué).
 */
export function SectionHeading({ index, eyebrow, title, note, className, titleClassName }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const reduced = useReducedMotionPref();

  useGSAP(
    (_, contextSafe) => {
      const el = titleRef.current;
      if (reduced || !el || !contextSafe) return;
      // On attend les polices : SplitText mesure les lignes rendues.
      document.fonts.ready.then(
        contextSafe(() => {
          const split = SplitText.create(el, { type: "lines", mask: "lines" });
          gsap.from(split.lines, {
            yPercent: 115,
            duration: 1.15,
            stagger: 0.09,
            ease: EASE,
            scrollTrigger: { trigger: el, start: "top 85%", once: true },
          });
        })
      );
    },
    { scope: rootRef, dependencies: [reduced], revertOnUpdate: true }
  );

  return (
    <div ref={rootRef} className={cn("max-w-4xl", className)}>
      <Reveal y={16}>
        <div className="mb-6 flex items-center gap-4">
          <span className="eyebrow text-mindaro">{index}</span>
          <span className="eyebrow">{eyebrow}</span>
          <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-mist/25 to-transparent" />
        </div>
      </Reveal>
      <h2 ref={titleRef} className={cn("font-display text-display-lg font-semibold text-mist", titleClassName)}>
        {title}
      </h2>
      {note && (
        <Reveal delay={0.15} y={14}>
          <p className="mt-4 font-mono text-xs tracking-wide text-cambridge">{note}</p>
        </Reveal>
      )}
    </div>
  );
}
