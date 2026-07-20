import Link from "next/link";
import PageHero from "@/components/ui/PageHero";
import { Section } from "@/components/ui/Section";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/Reveal";
import Button from "@/components/ui/Button";
import TiltCard from "@/components/ui/TiltCard";
import ArtVisual from "@/components/ui/ArtVisual";
import RibbonDivider from "@/components/decor/RibbonDivider";
import { ArrowRight, Sparkle } from "@/components/ui/Icons";
import { services, type Service } from "@/lib/content";

export default function ServiceDetail({ service }: { service: Service }) {
  const other = services.find((s) => s.slug !== service.slug)!;

  return (
    <>
      <PageHero
        kicker={service.eyebrow}
        title={
          <>
            {service.title}
            <span className="mt-2 block font-serif text-2xl italic text-terracotta sm:text-3xl">
              {service.tagline}
            </span>
          </>
        }
        intro={service.forWho}
      >
        <Button href="/contact" confettiOnHover>
          Je me marie !
        </Button>
        <Link href={other.href} className="link-underline text-sm font-medium text-prune/80">
          Voir aussi : {other.title}
        </Link>
      </PageHero>

      {/* Pitch + visuel */}
      <Section>
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <TiltCard max={6}>
              <div className="invitation-card overflow-hidden p-2.5">
                <div className="aspect-[4/5] overflow-hidden rounded-[1.4rem]">
                  <ArtVisual hues={service.hues} motif={service.ambience === "planner" ? "sprig" : "arch"} seed={service.ambience === "planner" ? 4 : 5} />
                </div>
              </div>
            </TiltCard>
          </Reveal>
          <div>
            <Reveal>
              <p className="kicker mb-4">La promesse</p>
            </Reveal>
            <Reveal delay={0.05}>
              <p className="font-serif text-2xl font-light leading-snug text-prune text-pretty sm:text-3xl">
                {service.pitch}
              </p>
            </Reveal>
          </div>
        </div>
      </Section>

      <RibbonDivider />

      {/* Prestations */}
      <Section>
        <div className="mx-auto max-w-3xl text-center">
          <p className="kicker mb-4 flex justify-center">Ce que j&apos;apporte</p>
          <h2 className="font-serif text-display-sm font-light text-prune">Les prestations</h2>
        </div>
        <Stagger className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
          {service.prestations.map((p) => (
            <StaggerItem key={p}>
              <div className="flex items-start gap-4 rounded-card border border-or/15 bg-ivoire p-6 shadow-blush">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blush/40 text-terracotta">
                  <Sparkle />
                </span>
                <p className="text-base text-prune/80">{p}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      {/* Approche en 3 temps */}
      <Section className="pt-0">
        <div className="mx-auto max-w-3xl text-center">
          <p className="kicker mb-4 flex justify-center">Ma méthode</p>
          <h2 className="font-serif text-display-sm font-light text-prune">En trois temps</h2>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {service.approach.map((a, i) => (
            <Reveal key={a.title} delay={i * 0.08}>
              <div className="relative h-full rounded-card border border-or/15 bg-ivoire p-7 shadow-blush">
                <span className="script-accent text-5xl text-terracotta/70">0{i + 1}</span>
                <h3 className="mt-3 font-serif text-2xl text-prune">{a.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-prune/70">{a.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* CTA final */}
      <Section className="pt-0">
        <Reveal>
          <div className="relative overflow-hidden rounded-card p-10 text-center sm:p-16" style={{ background: `linear-gradient(150deg, color-mix(in oklab, ${service.hues[0]} 40%, var(--creme)), color-mix(in oklab, ${service.hues[1]} 35%, var(--ivoire)))` }}>
            <p className="script-accent text-4xl text-terracotta">On en parle ?</p>
            <h2 className="mx-auto mt-3 max-w-xl font-serif text-3xl font-light text-prune sm:text-4xl text-balance">
              Racontez-moi votre projet, je vous réponds personnellement.
            </h2>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button href="/contact" confettiOnHover>
                Je me marie !
              </Button>
              <Link href="/portfolio" className="inline-flex items-center gap-2 text-sm font-semibold text-prune">
                Voir des réalisations <ArrowRight />
              </Link>
            </div>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
