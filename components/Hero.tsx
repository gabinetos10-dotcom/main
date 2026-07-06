"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import MagneticButton from "./MagneticButton";

export default function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const yCar = useTransform(scrollYProgress, [0, 1], ["0%", "35%"]);
  const yTitle = useTransform(scrollYProgress, [0, 1], ["0%", "60%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden pt-24 md:pt-28"
    >
      {/* Paris night backdrop: gradient skyline + light streaks */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_120%,#2a0a10_0%,#0a0a0b_60%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(to_top,rgba(225,29,46,0.08),transparent)]" />
      {/* City light dots */}
      <div className="absolute inset-0 opacity-40">
        {[...Array(24)].map((_, i) => (
          <span
            key={i}
            className="absolute h-[2px] w-[2px] rounded-full bg-white animate-pulse-soft"
            style={{
              left: `${(i * 41) % 100}%`,
              top: `${18 + ((i * 23) % 55)}%`,
              animationDelay: `${(i % 6) * 0.5}s`,
            }}
          />
        ))}
      </div>

      <motion.div style={{ y: yTitle, opacity }} className="relative z-10 px-5 text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.8, duration: 0.8 }}
          className="mb-4 text-xs uppercase tracking-widest2 text-blood md:text-sm"
        >
          Paris — Location Premium
        </motion.p>
        <h1 className="font-display font-extrabold uppercase leading-[0.95]">
          <motion.span
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.9, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="block text-[9.5vw] text-white md:text-7xl lg:text-8xl"
          >
            La nuit
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3.05, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="block text-[9.5vw] text-stroke md:text-7xl lg:text-8xl"
          >
            vous
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3.2, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="block text-[9.5vw] text-blood md:text-7xl lg:text-8xl"
          >
            appartient
          </motion.span>
        </h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3.5, duration: 0.8 }}
          className="mx-auto mt-6 max-w-[85vw] text-sm text-smoke sm:max-w-md md:text-base"
        >
          Véhicules sportifs et premium, livrés au cœur de Paris.
          L&apos;asphalte parisien n&apos;attend que vous.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3.65, duration: 0.8 }}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <MagneticButton
            href="#reservation"
            className="inline-block rounded-full bg-blood px-10 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-white transition-all hover:bg-blood-bright hover:shadow-[0_0_40px_rgba(225,29,46,0.4)]"
          >
            Réserver maintenant
          </MagneticButton>
          <MagneticButton
            href="#flotte"
            className="inline-block rounded-full border border-white/20 px-10 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:border-blood hover:text-blood"
          >
            Voir la flotte
          </MagneticButton>
        </motion.div>
      </motion.div>

      {/* Parallax car */}
      <motion.div
        style={{ y: yCar }}
        initial={{ opacity: 0, x: 120 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 3.3, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none relative z-0 -mt-8 w-[92vw] max-w-2xl md:-mt-16"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/cars/911.svg" alt="Sportive de nuit à Paris" className="w-full" />
      </motion.div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 4.2 }}
        className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2"
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest2 text-smoke">Scroll</span>
          <motion.span
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.8 }}
            className="block h-8 w-px bg-gradient-to-b from-blood to-transparent"
          />
        </div>
      </motion.div>
    </section>
  );
}
