"use client";

import { motion } from "framer-motion";
import Reveal from "./Reveal";

const STATS = [
  { value: "6+", label: "Véhicules d'exception" },
  { value: "24/7", label: "Conciergerie" },
  { value: "75", label: "Paris & Île-de-France" },
];

// Word-by-word text reveal on scroll.
function TextReveal({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <p className="font-display text-2xl font-semibold leading-snug text-white md:text-4xl">
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0.12 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: i * 0.035 }}
          className="inline-block"
        >
          {word}&nbsp;
        </motion.span>
      ))}
    </p>
  );
}

export default function About() {
  return (
    <section id="apropos" className="relative mx-auto max-w-7xl px-5 py-24 md:px-10 md:py-36">
      <Reveal>
        <div className="mb-12 flex items-baseline gap-4">
          <span className="font-display text-6xl font-extrabold text-stroke-red md:text-8xl">01</span>
          <h2 className="text-xs uppercase tracking-widest2 text-blood md:text-sm">
            Qui sommes-nous ?
          </h2>
        </div>
      </Reveal>

      <div className="grid gap-12 md:grid-cols-2 md:gap-20">
        <div>
          <TextReveal text="Née sur l'asphalte parisien, Loc'N'Joy est le trait d'union entre la ville lumière et les machines qui la méritent." />
        </div>
        <div className="flex flex-col justify-end gap-6">
          <Reveal delay={0.15}>
            <p className="text-sm leading-relaxed text-smoke md:text-base">
              Fondée à Paris par des passionnés d&apos;automobile, notre agence
              sélectionne chaque véhicule pour son caractère. Sportives
              affûtées, SUV souverains : notre flotte est pensée pour
              transformer chaque trajet — des Champs-Élysées au périphérique
              de nuit — en expérience.
            </p>
          </Reveal>
          <Reveal delay={0.25}>
            <p className="text-sm leading-relaxed text-smoke md:text-base">
              Positionnement premium, service sur-mesure : livraison à
              l&apos;adresse de votre choix, conciergerie disponible en
              continu, et une exigence sans compromis sur l&apos;état de
              chaque voiture.
            </p>
          </Reveal>
        </div>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-noir-line bg-noir-line sm:grid-cols-3 md:mt-24">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.12} className="bg-noir-soft">
            <div className="group p-8 transition-colors duration-500 hover:bg-noir-card md:p-10">
              <div className="font-display text-4xl font-extrabold text-white transition-colors group-hover:text-blood md:text-5xl">
                {s.value}
              </div>
              <div className="mt-2 text-xs uppercase tracking-[0.2em] text-smoke">{s.label}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
