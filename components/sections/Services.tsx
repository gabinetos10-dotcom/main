"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { SERVICES, SERVICES_META, type Service, type ServiceAccent } from "@/lib/content";
import { useApp } from "@/components/providers/AppContext";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/utils";

const ACCENT: Record<ServiceAccent, { text: string; glow: string; chip: string }> = {
  mindaro: { text: "text-mindaro", glow: "bg-mindaro/15", chip: "border-mindaro/25" },
  sage: { text: "text-sage", glow: "bg-sage/15", chip: "border-sage/30" },
  air: { text: "text-air", glow: "bg-air/20", chip: "border-air/40" },
  cambridge: { text: "text-cambridge", glow: "bg-cambridge/15", chip: "border-cambridge/30" },
};

/** Micro-identité visuelle de chaque service (SVG animé, couleurs héritées) */
function Glyph({ service, className }: { service: Service; className?: string }) {
  const c = cn("h-9 w-9", ACCENT[service.accent].text, className);
  switch (service.id) {
    case "creation":
      return (
        <svg viewBox="0 0 36 36" fill="none" className={c} aria-hidden>
          <path d="M13 10 6 18l7 8M23 10l7 8-7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 8l-4 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-60" />
        </svg>
      );
    case "automatisation":
      return (
        <svg viewBox="0 0 36 36" fill="none" className={c} aria-hidden>
          <circle cx="7" cy="18" r="3.5" stroke="currentColor" strokeWidth="2" />
          <circle cx="29" cy="8" r="3.5" stroke="currentColor" strokeWidth="2" />
          <circle cx="29" cy="28" r="3.5" stroke="currentColor" strokeWidth="2" />
          <path d="M10.5 16.5 25.5 9M10.5 19.5l15 7.5" stroke="currentColor" strokeWidth="1.8" strokeDasharray="4 4" className="animate-dash-flow" style={{ strokeDashoffset: 0 }} />
        </svg>
      );
    case "data":
      return (
        <svg viewBox="0 0 36 36" fill="none" className={c} aria-hidden>
          <path d="M10 5H7a2 2 0 0 0-2 2v22a2 2 0 0 0 2 2h3M26 5h3a2 2 0 0 1 2 2v22a2 2 0 0 1-2 2h-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="18" cy="11" r="1.8" fill="currentColor" />
          <circle cx="18" cy="18" r="1.8" fill="currentColor" className="opacity-70" />
          <circle cx="18" cy="25" r="1.8" fill="currentColor" className="opacity-40" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 36 36" fill="none" className={cn(c, "animate-spin-slow")} aria-hidden>
          <circle cx="18" cy="18" r="13" stroke="currentColor" strokeWidth="2" className="opacity-50" />
          <path d="M18 8l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7z" fill="currentColor" className="opacity-80" />
        </svg>
      );
  }
}

function GameButton({ service, onOpen, block }: { service: Service; onOpen: () => void; block?: boolean }) {
  return (
    <button
      onClick={onOpen}
      data-cursor="JOUER"
      className={cn(
        "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-mindaro/40 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-mindaro transition-all duration-300 hover:bg-mindaro hover:text-ink hover:shadow-glow-sm",
        block && "w-full"
      )}
    >
      <span aria-hidden>▶</span> {service.gameLabel}
    </button>
  );
}

/**
 * Services : 4 panneaux vivants.
 * Desktop → rangée qui respire (flex-grow animé au survol/focus).
 * Mobile → accordéon tactile. Chaque panneau embarque son mini-jeu.
 */
export function Services() {
  const { openGame } = useApp();
  const [openDesktop, setOpenDesktop] = useState(SERVICES[0].id);
  const [openMobile, setOpenMobile] = useState<string>("");

  return (
    <section id="services" data-section className="scroll-mt-24 py-28 lg:py-40">
      <div className="container-gjs">
        <SectionHeading
          index="02"
          eyebrow={SERVICES_META.eyebrow}
          title={SERVICES_META.title}
          note={SERVICES_META.note}
        />

        {/* ───── Desktop : panneaux extensibles ───── */}
        <Reveal className="mt-16 hidden lg:block" y={48}>
          <div className="flex h-[560px] gap-4" onMouseLeave={() => {}}>
            {SERVICES.map((s) => {
              const open = openDesktop === s.id;
              const a = ACCENT[s.accent];
              return (
                <article
                  key={s.id}
                  onMouseEnter={() => setOpenDesktop(s.id)}
                  onFocusCapture={() => setOpenDesktop(s.id)}
                  className={cn(
                    "relative flex flex-col justify-between overflow-hidden rounded-3xl border p-8 transition-all duration-700 ease-(--ease-gjs)",
                    open
                      ? "border-mist/15 bg-deep/60"
                      : "border-mist/8 bg-abyss/40 hover:border-mist/20"
                  )}
                  style={{ flexGrow: open ? 3 : 1, flexBasis: 0 }}
                >
                  {/* halo accent */}
                  <div
                    aria-hidden
                    className={cn(
                      "absolute -right-16 -top-16 h-64 w-64 rounded-full blur-[100px] transition-opacity duration-700",
                      a.glow,
                      open ? "opacity-100" : "opacity-0"
                    )}
                  />

                  <div className="relative flex items-start justify-between">
                    <span className={cn("font-mono text-sm", a.text)}>{s.num}</span>
                    <Glyph service={s} />
                  </div>

                  {/* Titre vertical (fermé) */}
                  <h3
                    className={cn(
                      "absolute bottom-8 left-5 font-display text-2xl font-semibold text-mist transition-opacity duration-300 [writing-mode:vertical-rl] rotate-180",
                      open ? "opacity-0" : "opacity-100 delay-200"
                    )}
                    aria-hidden={open}
                  >
                    {s.title}
                  </h3>

                  {/* Contenu (ouvert) */}
                  <div
                    className={cn(
                      "relative flex flex-col gap-4 transition-all duration-500",
                      open ? "translate-y-0 opacity-100 delay-200" : "pointer-events-none translate-y-5 opacity-0"
                    )}
                  >
                    <h3 className="font-display text-3xl font-semibold text-mist">{s.title}</h3>
                    <p className={cn("font-medium", a.text)}>{s.hook}</p>
                    <p className="max-w-md text-sm leading-relaxed text-cambridge">{s.description}</p>
                    <ul className="flex max-w-md flex-wrap gap-2" aria-label="Livrables">
                      {s.deliverables.map((d) => (
                        <li
                          key={d}
                          className={cn(
                            "rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-cambridge",
                            a.chip
                          )}
                        >
                          {d}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 flex flex-wrap items-center gap-4">
                      <GameButton service={s} onOpen={() => openGame(s.game)} />
                      <a
                        href="/#contact"
                        className="link-sweep font-mono text-[11px] uppercase tracking-[0.2em] text-mist hover:text-mindaro"
                      >
                        En parler →
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </Reveal>

        {/* ───── Mobile / tablette : accordéon ───── */}
        <div className="mt-12 flex flex-col gap-3 lg:hidden">
          {SERVICES.map((s) => {
            const open = openMobile === s.id;
            const a = ACCENT[s.accent];
            return (
              <Reveal key={s.id}>
                <div
                  className={cn(
                    "overflow-hidden rounded-2xl border transition-colors duration-500",
                    open ? "border-mist/15 bg-deep/50" : "border-mist/8 bg-abyss/40"
                  )}
                >
                  <button
                    onClick={() => setOpenMobile(open ? "" : s.id)}
                    aria-expanded={open}
                    className="flex min-h-[64px] w-full items-center justify-between gap-4 p-5 text-left"
                  >
                    <span className="flex items-center gap-4">
                      <span className={cn("font-mono text-xs", a.text)}>{s.num}</span>
                      <span className="font-display text-xl font-semibold text-mist">{s.title}</span>
                    </span>
                    <span
                      aria-hidden
                      className={cn(
                        "text-xl text-mindaro transition-transform duration-500 ease-(--ease-gjs)",
                        open && "rotate-45"
                      )}
                    >
                      +
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-4 px-5 pb-6">
                          <div className="flex items-center gap-3">
                            <Glyph service={s} className="h-7 w-7" />
                            <p className={cn("text-sm font-medium", a.text)}>{s.hook}</p>
                          </div>
                          <p className="text-sm leading-relaxed text-cambridge">{s.description}</p>
                          <ul className="flex flex-wrap gap-2" aria-label="Livrables">
                            {s.deliverables.map((d) => (
                              <li
                                key={d}
                                className={cn(
                                  "rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-cambridge",
                                  a.chip
                                )}
                              >
                                {d}
                              </li>
                            ))}
                          </ul>
                          <GameButton service={s} onOpen={() => openGame(s.game)} block />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
