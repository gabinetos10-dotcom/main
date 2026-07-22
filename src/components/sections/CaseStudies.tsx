"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PROJECTS, type Project } from "@/lib/data";
import { Em } from "@/components/ui/Em";
import { useIsMobile } from "@/hooks/useMediaQuery";

export function CaseStudies() {
  const isMobile = useIsMobile();
  return (
    <section id="projets" className="relative overflow-hidden py-20 sm:py-28">
      <div className="container-x">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-5 flex items-center gap-4">
              <span className="kicker">Projets — Case studies</span>
              <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-text-mute)]">
                (04)
              </span>
            </div>
            <h2 className="max-w-xl font-[family-name:var(--font-display)] text-4xl font-semibold leading-[1.04] tracking-[-0.03em] text-[var(--color-highlight)] sm:text-5xl">
              Des idées devenues <Em accent>réalités</Em> vivantes.
            </h2>
          </div>
          <p className="max-w-xs text-sm text-[var(--color-text-dim)] md:text-right">
            {isMobile ? "Faites défiler →" : "Scrollez pour parcourir la galerie horizontale."}
          </p>
        </div>
      </div>

      {isMobile ? <MobileRail /> : <PinnedGallery />}
    </section>
  );
}

function PinnedGallery() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const distanceRef = useRef(0);
  const [height, setHeight] = useState("300vh");

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const x = useTransform(scrollYProgress, (v) => -v * distanceRef.current);

  useEffect(() => {
    const measure = () => {
      const track = trackRef.current;
      if (!track) return;
      const d = Math.max(0, track.scrollWidth - window.innerWidth + 96);
      distanceRef.current = d;
      setHeight(`${window.innerHeight + d}px`);
    };
    measure();
    window.addEventListener("resize", measure);
    const id = setTimeout(measure, 300); // after fonts settle
    return () => {
      window.removeEventListener("resize", measure);
      clearTimeout(id);
    };
  }, []);

  return (
    <div ref={sectionRef} style={{ height }} className="relative mt-14">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <motion.div
          ref={trackRef}
          style={{ x }}
          className="flex gap-6 pl-[clamp(1.25rem,4vw,3rem)] pr-24 will-change-transform"
        >
          {PROJECTS.map((p, i) => (
            <ProjectCard key={p.id} project={p} index={i} />
          ))}
          <EndCard />
        </motion.div>
      </div>
    </div>
  );
}

function MobileRail() {
  return (
    <div className="no-scrollbar mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4">
      {PROJECTS.map((p, i) => (
        <div key={p.id} className="w-[80vw] shrink-0 snap-center">
          <ProjectCard project={p} index={i} />
        </div>
      ))}
    </div>
  );
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  return (
    <article className="group relative h-[62vh] w-[min(78vw,520px)] shrink-0 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)]">
      {/* gradient scene */}
      <div
        className="absolute inset-0 transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-105"
        style={{
          background: `radial-gradient(120% 80% at 20% 10%, ${project.hue}44, transparent 55%), linear-gradient(160deg, var(--color-bg-2), var(--color-bg))`,
        }}
      />
      <div className="grid-lines absolute inset-0 opacity-30" />
      {/* big number */}
      <span className="absolute right-6 top-4 font-[family-name:var(--font-display)] text-[7rem] font-semibold leading-none text-white/5">
        0{index + 1}
      </span>

      <div className="relative flex h-full flex-col justify-between p-7">
        <div className="flex items-center justify-between">
          <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1 font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-text-dim)]">
            {project.category}
          </span>
          <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-text-mute)]">
            {project.year}
          </span>
        </div>

        <div>
          <div
            className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
            style={{ background: `${project.hue}1f`, color: project.hue }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: project.hue }} />
            {project.metric}
          </div>
          <h3 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight">
            {project.name}
          </h3>
          <p className="mt-2 max-w-sm text-[15px] text-[var(--color-text-dim)]">{project.blurb}</p>
          <button className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-text)] opacity-80 transition-opacity group-hover:opacity-100">
            Voir le projet
            <ArrowUpRight
              size={15}
              className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </button>
        </div>
      </div>
    </article>
  );
}

function EndCard() {
  return (
    <article className="grid h-[62vh] w-[min(70vw,420px)] shrink-0 place-items-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line-strong)] p-8 text-center">
      <div>
        <p className="font-[family-name:var(--font-display)] text-3xl font-medium">
          Le prochain, <br /> c'est le vôtre ?
        </p>
        <a
          href="#contact"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-6 py-3 text-sm font-medium text-white"
        >
          Parlons‑en <ArrowUpRight size={16} />
        </a>
      </div>
    </article>
  );
}
