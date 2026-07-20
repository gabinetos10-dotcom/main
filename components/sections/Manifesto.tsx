"use client";

import { Section } from "@/components/ui/Section";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/Reveal";
import TiltCard from "@/components/ui/TiltCard";
import ArtVisual from "@/components/ui/ArtVisual";
import Botanical from "@/components/decor/Botanical";
import { useCountUp, useInView } from "@/lib/hooks";
import { manifesto, stats } from "@/lib/content";

export default function Manifesto() {
  return (
    <Section id="manifeste" className="pt-28">
      <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2 lg:gap-20">
        {/* Visuels façon faire-part, superposés */}
        <div className="relative order-2 lg:order-1">
          <Botanical
            variant="branch"
            className="absolute -right-6 -top-12 z-10 hidden w-28 lg:block"
            color="var(--sauge)"
            flip
          />
          <div className="relative mx-auto max-w-md">
            <Reveal>
              <TiltCard max={7}>
                <div className="invitation-card overflow-hidden p-2.5">
                  <div className="aspect-[4/5] overflow-hidden rounded-[1.4rem]">
                    <ArtVisual hues={["var(--blush)", "var(--sauge)"]} motif="sprig" seed={2} />
                  </div>
                </div>
              </TiltCard>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="absolute -bottom-10 -left-4 w-40 sm:-left-10 sm:w-52">
                <TiltCard max={9}>
                  <div className="invitation-card overflow-hidden p-2">
                    <div className="aspect-square overflow-hidden rounded-2xl">
                      <ArtVisual hues={["var(--soleil)", "var(--terracotta)"]} motif="sun" seed={3} />
                    </div>
                  </div>
                </TiltCard>
              </div>
            </Reveal>
            {/* Petite étiquette calligraphiée */}
            <div className="absolute -right-3 top-6 rotate-6 rounded-full border border-or/40 bg-ivoire/80 px-4 py-1.5 backdrop-blur">
              <span className="script-accent text-xl text-terracotta">l&apos;humain d&apos;abord</span>
            </div>
          </div>
        </div>

        {/* Texte */}
        <div className="order-1 lg:order-2">
          <p className="script-accent mb-2 text-3xl text-terracotta">{manifesto.kicker}</p>
          <Reveal>
            <h2 className="font-serif text-display-sm font-light leading-[1.05] text-prune text-balance">
              Une sensibilité <em className="italic text-sunwash">esthétique</em>, guidée par les{" "}
              <em className="italic text-rose-poudre">liens humains</em>.
            </h2>
          </Reveal>

          <Stagger className="mt-7 space-y-4">
            {manifesto.paragraphs.map((p, i) => (
              <StaggerItem key={i}>
                <p className="text-base leading-relaxed text-prune/75 text-pretty">{p}</p>
              </StaggerItem>
            ))}
          </Stagger>

          <Reveal delay={0.1}>
            <figure className="mt-9 border-l-2 border-or/40 pl-6">
              <blockquote className="font-serif text-2xl font-light italic leading-snug text-prune sm:text-3xl">
                « {manifesto.quote} »
              </blockquote>
              <figcaption className="script-accent mt-3 text-3xl text-terracotta">
                {manifesto.signature}
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </div>

      {/* Compteurs animés */}
      <StatsRow />
    </Section>
  );
}

function StatsRow() {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className="mt-24 grid grid-cols-2 gap-6 border-t border-or/15 pt-12 lg:grid-cols-4"
    >
      {stats.map((s) => (
        <StatItem key={s.label} value={s.value} suffix={s.suffix} label={s.label} active={inView} />
      ))}
    </div>
  );
}

function StatItem({
  value,
  suffix,
  label,
  active,
}: {
  value: number;
  suffix: string;
  label: string;
  active: boolean;
}) {
  const n = useCountUp(value, active);
  return (
    <div className="text-center lg:text-left">
      <p className="font-serif text-4xl font-light text-terracotta sm:text-5xl">
        {n}
        <span className="text-miel">{suffix}</span>
      </p>
      <p className="mt-2 text-xs uppercase tracking-wide text-prune/55">{label}</p>
    </div>
  );
}
