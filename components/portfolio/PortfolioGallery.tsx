"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import TiltCard from "@/components/ui/TiltCard";
import ArtVisual from "@/components/ui/ArtVisual";
import { projects, portfolioFilters, type Project } from "@/lib/content";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

const spanClasses: Record<Project["span"], string> = {
  tall: "sm:row-span-2",
  wide: "sm:col-span-2",
  regular: "",
};

export default function PortfolioGallery() {
  const [filter, setFilter] = useState("tous");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const list = filter === "tous" ? projects : projects.filter((p) => p.style === filter);

  // Navigation clavier de la lightbox.
  useEffect(() => {
    if (openIndex === null) return;
    document.body.classList.add("no-scroll");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenIndex(null);
      if (e.key === "ArrowRight") setOpenIndex((i) => (i === null ? i : (i + 1) % list.length));
      if (e.key === "ArrowLeft") setOpenIndex((i) => (i === null ? i : (i - 1 + list.length) % list.length));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("no-scroll");
    };
  }, [openIndex, list.length]);

  const active = openIndex !== null ? list[openIndex] : null;

  return (
    <div>
      {/* Filtres */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrer par univers">
        {portfolioFilters.map((f) => (
          <button
            key={f.key}
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-pill border px-4 py-2 text-sm transition-all duration-300",
              filter === f.key
                ? "border-terracotta bg-terracotta text-ivoire shadow-bloom"
                : "border-or/25 bg-ivoire/60 text-prune/70 hover:border-or/50 hover:text-prune"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grille asymétrique éditoriale */}
      <motion.div layout className="mt-8 grid auto-rows-[minmax(180px,auto)] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {list.map((project, i) => (
            <motion.figure
              layout
              key={project.slug}
              initial={{ opacity: 0, scale: 0.94, filter: "blur(6px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.5, ease: EASE }}
              className={cn("group relative", spanClasses[project.span])}
            >
              <TiltCard max={6} glow={false} className="h-full">
                <button
                  onClick={() => setOpenIndex(i)}
                  className="relative block h-full w-full overflow-hidden rounded-card"
                  aria-label={`Voir ${project.title}, ${project.location}`}
                >
                  <div className="h-full min-h-[180px] overflow-hidden">
                    <div className="h-full w-full transition-transform duration-700 ease-signature group-hover:scale-105">
                      <ArtVisual hues={project.hues} seed={i} motif={i % 2 ? "arch" : "sun"} />
                    </div>
                  </div>
                  {/* Légende au survol */}
                  <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-prune/50 via-transparent to-transparent p-5 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                    <figcaption className="text-left">
                      <span className="block text-[0.62rem] uppercase tracking-kicker text-ivoire/80">
                        {project.styleLabel}
                      </span>
                      <span className="font-serif text-xl text-ivoire">{project.title}</span>
                      <span className="block text-sm text-ivoire/80">{project.location}</span>
                    </figcaption>
                  </div>
                </button>
              </TiltCard>
            </motion.figure>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Lightbox */}
      <AnimatePresence>
        {active && openIndex !== null && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            role="dialog"
            aria-modal="true"
            aria-label={active.title}
            onClick={() => setOpenIndex(null)}
          >
            <div className="absolute inset-0 bg-prune/70 backdrop-blur-md" />
            <motion.figure
              className="relative z-10 w-full max-w-4xl"
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="invitation-card overflow-hidden p-2.5">
                <div className="relative aspect-[16/10] overflow-hidden rounded-[1.4rem]">
                  <ArtVisual hues={active.hues} seed={openIndex} motif="arch" />
                </div>
              </div>
              <figcaption className="mt-4 flex items-center justify-between text-ivoire">
                <div>
                  <p className="font-serif text-2xl">{active.title}</p>
                  <p className="text-sm text-ivoire/70">
                    {active.styleLabel} · {active.location} · {active.credit}
                  </p>
                </div>
                <div className="flex gap-2">
                  <LightboxNav
                    label="Précédent"
                    onClick={() => setOpenIndex((i) => (i === null ? i : (i - 1 + list.length) % list.length))}
                    dir="left"
                  />
                  <LightboxNav
                    label="Suivant"
                    onClick={() => setOpenIndex((i) => (i === null ? i : (i + 1) % list.length))}
                    dir="right"
                  />
                </div>
              </figcaption>
            </motion.figure>

            <button
              onClick={() => setOpenIndex(null)}
              aria-label="Fermer"
              className="absolute right-5 top-5 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-ivoire/20 text-ivoire backdrop-blur transition-colors hover:bg-ivoire/40"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LightboxNav({ label, onClick, dir }: { label: string; onClick: () => void; dir: "left" | "right" }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-ivoire/30 text-ivoire transition-colors hover:bg-ivoire/20"
    >
      <svg viewBox="0 0 24 24" className={cn("h-5 w-5", dir === "left" && "rotate-180")} fill="none">
        <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
