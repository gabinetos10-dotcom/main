import { MARQUEE_WORDS, TECHS } from "@/lib/content";
import { Marquee } from "@/components/fx/Marquee";
import { cn } from "@/lib/utils";

/**
 * Bandeau double marquee : technos (mono) + grands mots alternés
 * plein / au trait. Sens opposés, pur CSS.
 */
export function TechMarquee() {
  return (
    <section aria-label="Technologies maîtrisées" className="relative border-y border-mist/5 bg-abyss/30 py-10 lg:py-12">
      <Marquee speed={44}>
        {TECHS.map((t) => (
          <span key={t} className="flex items-center">
            <span className="px-5 font-mono text-xs uppercase tracking-[0.25em] text-cambridge lg:text-sm">{t}</span>
            <span aria-hidden className="text-[8px] text-mindaro/60">
              ✦
            </span>
          </span>
        ))}
      </Marquee>
      <Marquee speed={70} reverse className="mt-7">
        {MARQUEE_WORDS.map((w, i) => (
          <span key={w} className="flex items-center">
            <span
              className={cn(
                "px-7 font-display text-4xl font-semibold leading-none lg:text-6xl",
                i % 2 === 0 ? "text-mist/90" : "text-outline"
              )}
            >
              {w}
            </span>
            <span aria-hidden className="text-xl text-mindaro/70">
              ✳
            </span>
          </span>
        ))}
      </Marquee>
    </section>
  );
}
