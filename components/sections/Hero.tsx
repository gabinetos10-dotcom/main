"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import TiltCard from "@/components/ui/TiltCard";
import ArtVisual from "@/components/ui/ArtVisual";
import Botanical from "@/components/decor/Botanical";
import { ArrowDown } from "@/components/ui/Icons";
import { useAnchorScroll } from "@/lib/hooks";
import { brand } from "@/lib/content";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function Hero() {
  const [revealed, setRevealed] = useState(false);
  const scrollTo = useAnchorScroll();

  useEffect(() => {
    // On révèle le hero une fois le preloader soulevé (ou tout de suite s'il est absent).
    if ((window as unknown as { __mjReady?: boolean }).__mjReady) {
      setRevealed(true);
      return;
    }
    const onReady = () => setRevealed(true);
    window.addEventListener("mj:preloaded", onReady);
    // Filet de sécurité si l'événement n'arrive jamais.
    const t = window.setTimeout(() => setRevealed(true), 3600);
    return () => {
      window.removeEventListener("mj:preloaded", onReady);
      window.clearTimeout(t);
    };
  }, []);

  const show = revealed ? "show" : "hidden";

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
  };
  const item = {
    hidden: { opacity: 0, y: 30, filter: "blur(8px)" },
    show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 1, ease: EASE } },
  };

  return (
    <section className="relative flex min-h-[100svh] items-center overflow-hidden pt-[var(--header-h)]">
      <div className="mx-auto grid w-full max-w-[86rem] grid-cols-1 items-center gap-12 px-5 pb-24 pt-10 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
        {/* Colonne texte */}
        <motion.div variants={container} initial="hidden" animate={show}>
          <motion.p variants={item} className="script-accent text-4xl text-terracotta sm:text-5xl">
            Mélina
          </motion.p>

          <motion.h1
            variants={item}
            className="mt-2 max-w-2xl font-serif text-display-sm font-light text-prune text-balance"
          >
            Wedding planner &amp; designer, experte du{" "}
            <em className="text-sunwash not-italic italic">design</em> et de l&apos;
            <em className="italic text-rose-poudre">émotion</em>.
          </motion.h1>

          <motion.p variants={item} className="mt-6 max-w-md text-base leading-relaxed text-prune/70">
            {brand.baseline} Des mariages élégants, pensés avec le cœur, en{" "}
            {brand.area.region}.
          </motion.p>

          <motion.p
            variants={item}
            className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs uppercase tracking-wide text-prune/50"
          >
            {brand.area.cities.map((c, i) => (
              <span key={c} className="flex items-center gap-3">
                {i > 0 && <span className="text-or">·</span>}
                {c}
              </span>
            ))}
          </motion.p>

          <motion.div variants={item} className="mt-9 flex flex-wrap items-center gap-4">
            <Button href="/contact" confettiOnHover>
              Je me marie !
            </Button>
            <button
              onClick={() => scrollTo("#univers")}
              className="link-underline text-sm font-medium text-prune/80"
            >
              Découvrir mon univers
            </button>
          </motion.div>
        </motion.div>

        {/* Colonne visuelle */}
        <motion.div
          className="relative mx-auto w-full max-w-md lg:max-w-none"
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={revealed ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 1.2, ease: EASE, delay: 0.3 }}
        >
          <Botanical
            variant="sprig"
            className="absolute -left-10 -top-8 z-10 hidden w-24 sm:block"
            color="var(--sauge)"
          />
          <TiltCard max={6} className="relative">
            <div className="invitation-card overflow-hidden rounded-[2rem] p-2.5">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.6rem]">
                <ArtVisual hues={["var(--blush)", "var(--soleil)"]} motif="arch" seed={1} />
                {/* Filet + libellé façon faire-part */}
                <div className="absolute inset-x-4 bottom-4 flex items-center justify-between rounded-2xl bg-ivoire/70 px-4 py-3 backdrop-blur-sm">
                  <span className="script-accent text-2xl text-prune">L&apos;art du oui</span>
                  <span className="text-[0.6rem] uppercase tracking-kicker text-terracotta">
                    Est. Occitanie
                  </span>
                </div>
              </div>
            </div>
          </TiltCard>
          {/* Sceau rotatif décoratif */}
          <div className="absolute -right-5 -top-5 hidden h-24 w-24 sm:block">
            <SealBadge />
          </div>
        </motion.div>
      </div>

      {/* Indice de scroll */}
      <motion.button
        onClick={() => scrollTo("#manifeste")}
        initial={{ opacity: 0 }}
        animate={revealed ? { opacity: 1 } : {}}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-prune/50"
        aria-label="Défiler vers le bas"
      >
        <span className="text-[0.62rem] uppercase tracking-kicker">Défiler</span>
        <motion.span
          animate={{ y: [0, 7, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <ArrowDown />
        </motion.span>
      </motion.button>
    </section>
  );
}

/** Petit sceau rotatif — texte circulaire + monogramme, détail précieux. */
function SealBadge() {
  return (
    <div className="relative h-full w-full [animation:spin_18s_linear_infinite] motion-reduce:[animation:none]">
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <defs>
          <path id="seal-path" d="M50,50 m-34,0 a34,34 0 1,1 68,0 a34,34 0 1,1 -68,0" />
        </defs>
        <circle cx="50" cy="50" r="46" fill="var(--ivoire)" opacity="0.85" />
        <circle cx="50" cy="50" r="46" fill="none" stroke="var(--or)" strokeWidth="0.6" />
        <text fill="var(--terracotta)" fontSize="7.4" letterSpacing="2.4">
          <textPath href="#seal-path" startOffset="0%">
            MAISON JOLIE · WEDDING · SUD DE LA FRANCE ·
          </textPath>
        </text>
        <text x="50" y="58" textAnchor="middle" fontSize="22" fontFamily="var(--font-fraunces)" fill="var(--prune)">
          ♡
        </text>
      </svg>
    </div>
  );
}
