"use client";

import {
  AnimatePresence,
  motion,
  useScroll,
  useTransform,
  type Variants,
} from "framer-motion";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { HeroBackground } from "@/components/canvas/HeroBackground";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { useLenis } from "@/components/providers/SmoothScroll";

const CYCLE = ["créer", "automatiser", "scraper", "conseiller"];

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const lineUp: Variants = {
  hidden: { y: "110%" },
  show: { y: "0%", transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } },
};

export function Hero({ active }: { active: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollTo } = useLenis();
  const [word, setWord] = useState(0);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setWord((w) => (w + 1) % CYCLE.length), 2400);
    return () => clearInterval(id);
  }, [active]);

  return (
    <section
      ref={ref}
      id="hero"
      className="relative flex min-h-[100svh] items-center overflow-hidden pt-28"
    >
      <HeroBackground />

      <motion.div style={{ y, opacity }} className="container-x relative z-10">
        <motion.div
          variants={container}
          initial="hidden"
          animate={active ? "show" : "hidden"}
          className="max-w-4xl"
        >
          {/* Kicker */}
          <div className="overflow-hidden">
            <motion.div variants={lineUp} className="kicker mb-7">
              <Sparkles size={13} className="text-[var(--color-accent-2)]" />
              Studio digital · Paris, FR
            </motion.div>
          </div>

          {/* Kinetic headline */}
          <h1 className="font-[family-name:var(--font-display)] text-[14vw] font-semibold leading-[0.92] tracking-[-0.045em] text-[var(--color-highlight)] sm:text-[9vw] lg:text-[7.1rem]">
            <span className="block overflow-hidden">
              <motion.span variants={lineUp} className="block">
                On sait
              </motion.span>
            </span>
            <span className="block overflow-hidden py-[0.06em]">
              <motion.span variants={lineUp} className="block">
                <span className="relative inline-flex min-w-[6ch] align-top">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={word}
                      initial={{ y: "55%", opacity: 0, filter: "blur(10px)" }}
                      animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
                      exit={{ y: "-55%", opacity: 0, filter: "blur(10px)" }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      className="em inline-block pr-[0.08em] text-[var(--color-accent)]"
                    >
                      {CYCLE[word]}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </motion.span>
            </span>
            <span className="block overflow-hidden">
              <motion.span variants={lineUp} className="block">
                vos idées digitales.
              </motion.span>
            </span>
          </h1>

          {/* Sub */}
          <motion.p
            variants={lineUp}
            className="mt-8 max-w-xl text-base leading-relaxed text-[var(--color-text-dim)] sm:text-lg"
          >
            Sites web sur‑mesure, automatisations intelligentes, extraction de
            données et conseil tech. GJS transforme vos idées en produits
            digitaux vivants — rapides, élégants, mémorables.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={lineUp} className="mt-10 flex flex-wrap items-center gap-4">
            <MagneticButton onClick={() => scrollTo("#contact")}>
              Démarrer un projet <ArrowUpRight size={16} />
            </MagneticButton>
            <MagneticButton variant="outline" onClick={() => scrollTo("#expertise")}>
              Explorer nos expertises
            </MagneticButton>
          </motion.div>

          {/* Verb ticker */}
          <motion.div
            variants={lineUp}
            className="mt-14 flex flex-wrap items-center gap-x-6 gap-y-2 font-[family-name:var(--font-mono)] text-[0.7rem] tracking-[0.25em] text-[var(--color-text-mute)]"
          >
            {["CREATE", "AUTOMATE", "SCRAPE", "CONSULT"].map((v) => (
              <span key={v} className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-[var(--color-accent)]" />
                {v}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: active ? 1 : 0 }}
        transition={{ delay: 1.4 }}
        className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 sm:flex"
      >
        <span className="font-[family-name:var(--font-mono)] text-[0.6rem] tracking-[0.3em] text-[var(--color-text-mute)]">
          SCROLL
        </span>
        <span className="relative flex h-10 w-6 justify-center rounded-full border border-[var(--color-line-strong)]">
          <motion.span
            animate={{ y: [4, 16, 4], opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--color-accent-2)]"
          />
        </span>
      </motion.div>
    </section>
  );
}
