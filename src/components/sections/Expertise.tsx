"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
} from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { PILLARS, type Pillar } from "@/lib/data";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Em } from "@/components/ui/Em";
import { useIsMobile } from "@/hooks/useMediaQuery";

export function Expertise() {
  return (
    <section id="expertise" className="relative py-28 sm:py-36">
      <div className="container-x">
        <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeading
            kicker="Nos expertises"
            index="01"
            title={
              <>
                Un studio, <Em accent>quatre</Em> superpouvoirs.
              </>
            }
            intro="De la première ligne de design au dernier octet de donnée, on couvre toute la chaîne de valeur digitale."
          />
          <span className="hidden font-[family-name:var(--font-mono)] text-sm text-[var(--color-text-mute)] lg:block">
            [ 01 — 04 ]
          </span>
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2">
          {PILLARS.map((pillar, i) => (
            <TiltCard key={pillar.id} pillar={pillar} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TiltCard({ pillar, index }: { pillar: Pillar; index: number }) {
  const isMobile = useIsMobile();
  const Icon = pillar.icon;

  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const mx = useMotionValue(50);
  const my = useMotionValue(50);
  const srx = useSpring(rx, { stiffness: 150, damping: 18 });
  const sry = useSpring(ry, { stiffness: 150, damping: 18 });

  const spotlight = useMotionTemplate`radial-gradient(340px circle at ${mx}% ${my}%, ${pillar.accent}22, transparent 70%)`;

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMobile) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    ry.set((px - 0.5) * 10);
    rx.set((0.5 - py) * 10);
    mx.set(px * 100);
    my.set(py * 100);
  };
  const reset = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      style={{ perspective: 1000 }}
    >
      <motion.article
        onPointerMove={onMove}
        onPointerLeave={reset}
        style={{ rotateX: srx, rotateY: sry, transformStyle: "preserve-3d" }}
        className="border-gradient glass group relative h-full overflow-hidden rounded-[var(--radius-lg)] p-7 sm:p-9"
      >
        {/* cursor spotlight */}
        <motion.div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: spotlight }}
        />

        <div className="relative flex items-start justify-between" style={{ transform: "translateZ(40px)" }}>
          <div
            className="grid h-14 w-14 place-items-center rounded-2xl border border-[var(--color-line)]"
            style={{ background: `${pillar.accent}14` }}
          >
            <Icon size={24} style={{ color: pillar.accent }} />
          </div>
          <span className="font-[family-name:var(--font-mono)] text-sm text-[var(--color-text-mute)]">
            {pillar.index}
          </span>
        </div>

        <div style={{ transform: "translateZ(30px)" }}>
          <h3 className="mt-8 font-[family-name:var(--font-display)] text-2xl font-medium">
            {pillar.title}
          </h3>
          <p className="mt-1.5 text-sm font-medium" style={{ color: pillar.accent }}>
            {pillar.tagline}
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--color-text-dim)]">
            {pillar.description}
          </p>

          <ul className="mt-6 flex flex-wrap gap-2">
            {pillar.features.map((f) => (
              <li
                key={f}
                className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-text-dim)]"
              >
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div
          className="mt-8 flex items-center gap-1.5 text-sm font-medium text-[var(--color-text-dim)] transition-colors duration-300 group-hover:text-[var(--color-text)]"
          style={{ transform: "translateZ(20px)" }}
        >
          En savoir plus
          <ArrowUpRight
            size={15}
            className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </div>
      </motion.article>
    </motion.div>
  );
}
