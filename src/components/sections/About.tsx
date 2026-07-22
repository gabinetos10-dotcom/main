"use client";

import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { STATS, VALUES, type Stat } from "@/lib/data";
import { Reveal } from "@/components/ui/Reveal";

export function About() {
  return (
    <section id="adn" className="relative py-28 sm:py-36">
      <div className="container-x">
        <div className="grid gap-14 lg:grid-cols-12">
          {/* Left — manifesto */}
          <div className="lg:col-span-7">
            <span className="kicker mb-6">L'ADN GJS · Qui sommes‑nous</span>
            <Reveal>
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[2.9rem]">
                On est une petite équipe française
                <span className="text-[var(--color-text-mute)]"> qui déteste </span>
                le tiède.
                <br />
                <span className="text-gradient">Le sur‑mesure, ou rien.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-7 max-w-xl text-lg leading-relaxed text-[var(--color-text-dim)]">
                GJS est né d'une conviction simple : la technologie doit être
                belle, utile et invisible. On code des expériences qui marquent,
                on automatise l'ennuyeux et on transforme la donnée brute en
                décisions. Sans jargon, sans usine à gaz.
              </p>
            </Reveal>

            {/* Values */}
            <div className="mt-12 grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] sm:grid-cols-3">
              {VALUES.map((v, i) => (
                <motion.div
                  key={v.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                  className="bg-[var(--color-surface)] p-6"
                >
                  <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-accent-2)]">
                    0{i + 1}
                  </span>
                  <h3 className="mt-3 font-[family-name:var(--font-display)] text-lg font-medium">
                    {v.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-dim)]">
                    {v.body}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right — stats */}
          <div className="lg:col-span-5">
            <div className="border-gradient glass sticky top-28 rounded-[var(--radius-lg)] p-8">
              <span className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.2em] text-[var(--color-text-mute)]">
                En chiffres
              </span>
              <div className="mt-6 grid grid-cols-2 gap-8">
                {STATS.map((stat) => (
                  <StatBlock key={stat.label} stat={stat} />
                ))}
              </div>
              <div className="mt-8 flex items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
                <span className="pulse-dot" />
                <p className="text-sm text-[var(--color-text-dim)]">
                  Disponible pour de nouveaux projets ce trimestre.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatBlock({ stat }: { stat: Stat }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    let start: number | null = null;
    const tick = (t: number) => {
      if (start === null) start = t;
      const p = Math.min((t - start) / 1400, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(eased * stat.value));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, stat.value]);

  return (
    <div ref={ref}>
      <div className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
        {value}
        <span className="text-accent-gradient">{stat.suffix}</span>
      </div>
      <p className="mt-1 text-sm text-[var(--color-text-dim)]">{stat.label}</p>
    </div>
  );
}
