"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import Reveal from "./Reveal";
import type { Vehicle } from "./types";

function CarCard({ car, index, onBook }: { car: Vehicle; index: number; onBook: (car: Vehicle) => void }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay: (index % 3) * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="group relative w-[82vw] max-w-sm shrink-0 snap-center overflow-hidden rounded-2xl border border-noir-line bg-noir-soft transition-all duration-500 hover:border-blood/40 hover:shadow-[0_20px_60px_-20px_rgba(225,29,46,0.25)] md:w-full md:max-w-none"
    >
      <div className="relative overflow-hidden bg-[radial-gradient(ellipse_at_50%_100%,#1c0508_0%,#111113_65%)] p-6 pt-10">
        <span className="absolute left-5 top-4 font-display text-5xl font-extrabold text-stroke opacity-60">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="absolute right-5 top-5 rounded-full border border-blood/40 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-blood">
          {car.category}
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={car.image}
          alt={`${car.brand} ${car.name}`}
          className="mx-auto w-full max-w-[320px] transition-transform duration-700 ease-out group-hover:scale-105 group-hover:-translate-x-1"
        />
      </div>

      <div className="p-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-smoke">{car.brand}</p>
        <h3 className="mt-1 font-display text-2xl font-bold text-white">{car.name}</h3>
        <p className="mt-2 text-sm text-smoke">{car.tagline}</p>

        <div className="mt-5 grid grid-cols-3 gap-2 border-y border-noir-line py-4 text-center">
          <div>
            <div className="text-sm font-semibold text-white">{car.power}</div>
            <div className="mt-0.5 text-[10px] uppercase tracking-widest text-smoke">Puissance</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{car.acceleration}</div>
            <div className="mt-0.5 text-[10px] uppercase tracking-widest text-smoke">0–100 km/h</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{car.seats} places</div>
            <div className="mt-0.5 text-[10px] uppercase tracking-widest text-smoke">{car.transmission}</div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div>
            <span className="font-display text-2xl font-bold text-blood">{car.pricePerDay}€</span>
            <span className="ml-1 text-xs text-smoke">/ jour</span>
          </div>
          <button
            onClick={() => onBook(car)}
            className="rounded-full border border-white/15 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-white transition-all duration-300 hover:border-blood hover:bg-blood hover:shadow-[0_0_24px_rgba(225,29,46,0.35)]"
          >
            Louer ce véhicule
          </button>
        </div>
      </div>
    </motion.article>
  );
}

export default function Fleet({ vehicles, onBook }: { vehicles: Vehicle[]; onBook: (car: Vehicle) => void }) {
  const sliderRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: number) => {
    sliderRef.current?.scrollBy({ left: dir * 360, behavior: "smooth" });
  };

  return (
    <section id="flotte" className="relative py-24 md:py-36">
      <div className="mx-auto max-w-7xl px-5 md:px-10">
        <Reveal>
          <div className="mb-4 flex items-baseline gap-4">
            <span className="font-display text-6xl font-extrabold text-stroke-red md:text-8xl">02</span>
            <h2 className="text-xs uppercase tracking-widest2 text-blood md:text-sm">
              Présentation de la flotte
            </h2>
          </div>
        </Reveal>
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <Reveal delay={0.1}>
            <p className="max-w-lg font-display text-2xl font-semibold text-white md:text-4xl">
              Des machines choisies une à une.
            </p>
          </Reveal>
          {/* Desktop slider arrows */}
          <div className="hidden gap-3 md:flex">
            <button
              onClick={() => scrollBy(-1)}
              aria-label="Précédent"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-noir-line text-white transition-colors hover:border-blood hover:text-blood"
            >
              ←
            </button>
            <button
              onClick={() => scrollBy(1)}
              aria-label="Suivant"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-noir-line text-white transition-colors hover:border-blood hover:text-blood"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* Mobile: swipeable horizontal snap slider. Desktop: grid. */}
      <div
        ref={sliderRef}
        className="no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 md:mx-auto md:grid md:max-w-7xl md:snap-none md:grid-cols-3 md:gap-8 md:overflow-visible md:px-10"
      >
        {vehicles.map((car, i) => (
          <CarCard key={car.id} car={car} index={i} onBook={onBook} />
        ))}
      </div>
    </section>
  );
}
