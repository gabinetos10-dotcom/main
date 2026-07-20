"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import TiltCard from "@/components/ui/TiltCard";
import ArtVisual from "@/components/ui/ArtVisual";
import { ArrowRight } from "@/components/ui/Icons";
import { services, type Service } from "@/lib/content";

const ambience = {
  planner: {
    hues: ["var(--sauge)", "var(--soleil)"] as [string, string],
    wash: "linear-gradient(160deg, color-mix(in oklab, var(--sauge) 30%, transparent), color-mix(in oklab, var(--soleil) 40%, transparent))",
    motif: "sprig" as const,
  },
  designer: {
    hues: ["var(--blush)", "var(--terracotta)"] as [string, string],
    wash: "linear-gradient(160deg, color-mix(in oklab, var(--blush) 35%, transparent), color-mix(in oklab, var(--terracotta) 32%, transparent))",
    motif: "arch" as const,
  },
};

export default function Services() {
  return (
    <Section id="services">
      <SectionHeading
        kicker="Mes services"
        title={
          <>
            Deux savoir-faire, <em className="italic text-sunwash">une même</em> exigence.
          </>
        }
        intro="Organiser et sublimer : deux métiers complémentaires que je porte avec la même attention. Choisissez l'un, l'autre, ou les deux réunis."
      />

      <div className="mt-14 grid grid-cols-1 gap-7 md:grid-cols-2">
        {services.map((service, i) => (
          <Reveal key={service.slug} delay={i * 0.08}>
            <ServiceCard service={service} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function ServiceCard({ service }: { service: Service }) {
  const amb = ambience[service.ambience];
  return (
    <TiltCard max={5} glow={false}>
      <Link
        href={service.href}
        className="group relative block h-full overflow-hidden rounded-card border border-or/20 bg-ivoire p-2.5 shadow-blush transition-shadow duration-500 hover:shadow-bloom"
        aria-label={`${service.title} — en savoir plus`}
      >
        {/* Visuel d'en-tête */}
        <div className="relative aspect-[16/10] overflow-hidden rounded-[1.3rem]">
          <ArtVisual hues={amb.hues} motif={amb.motif} seed={service.ambience === "planner" ? 4 : 5} />
          <div
            className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            style={{ background: amb.wash }}
          />
          <span className="absolute left-4 top-4 rounded-full bg-ivoire/80 px-3 py-1 text-[0.62rem] uppercase tracking-kicker text-terracotta backdrop-blur">
            {service.eyebrow}
          </span>
        </div>

        {/* Contenu */}
        <div className="p-5 sm:p-7">
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="font-serif text-3xl font-light text-prune">{service.title}</h3>
            <span className="script-accent text-2xl text-terracotta/70">0{services.indexOf(service) + 1}</span>
          </div>
          <p className="mt-2 text-base italic text-prune/70">{service.tagline}</p>
          <p className="mt-4 text-sm leading-relaxed text-prune/65">{service.intro}</p>

          {/* Prestations — « fleurissent » au survol / focus, visibles au tactile */}
          <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-500 ease-signature group-hover:grid-rows-[1fr] group-focus-visible:grid-rows-[1fr] [@media(hover:none)]:grid-rows-[1fr]">
            <ul className="mt-0 min-h-0 space-y-2 overflow-hidden opacity-0 transition-opacity duration-500 group-hover:mt-5 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:mt-5 [@media(hover:none)]:opacity-100">
              {service.prestations.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-sm text-prune/75">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-terracotta/70" />
                  {p}
                </li>
              ))}
            </ul>
          </div>

          <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-terracotta">
            En savoir plus
            <motion.span className="transition-transform duration-300 group-hover:translate-x-1">
              <ArrowRight />
            </motion.span>
          </span>
        </div>
      </Link>
    </TiltCard>
  );
}
