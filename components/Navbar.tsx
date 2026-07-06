"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import MagneticButton from "./MagneticButton";

const LINKS = [
  { href: "#apropos", label: "Qui sommes-nous" },
  { href: "#flotte", label: "La flotte" },
  { href: "#reservation", label: "Réservation" },
  { href: "#contact", label: "Contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 2.6, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-noir/85 backdrop-blur-md border-b border-noir-line py-3"
            : "bg-transparent py-5"
        }`}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 md:px-10">
          <a href="#" className="font-display text-lg md:text-xl font-bold uppercase tracking-widest text-white">
            Loc<span className="text-blood">&apos;N&apos;</span>Joy
          </a>

          <div className="hidden items-center gap-8 md:flex">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="group relative text-[13px] uppercase tracking-[0.18em] text-smoke transition-colors hover:text-white"
              >
                {l.label}
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-blood transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
            <MagneticButton
              href="#reservation"
              className="inline-block rounded-full bg-blood px-6 py-2.5 text-[13px] font-semibold uppercase tracking-[0.15em] text-white transition-colors hover:bg-blood-bright"
            >
              Réserver
            </MagneticButton>
          </div>

          {/* Mobile burger */}
          <button
            aria-label="Menu"
            onClick={() => setOpen(!open)}
            className="flex h-10 w-10 flex-col items-center justify-center gap-[6px] md:hidden"
          >
            <span className={`h-px w-6 bg-white transition-transform duration-300 ${open ? "translate-y-[7px] rotate-45" : ""}`} />
            <span className={`h-px w-6 bg-blood transition-opacity duration-300 ${open ? "opacity-0" : ""}`} />
            <span className={`h-px w-6 bg-white transition-transform duration-300 ${open ? "-translate-y-[7px] -rotate-45" : ""}`} />
          </button>
        </nav>
      </motion.header>

      {/* Mobile full-screen menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: "-4%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "-4%" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-8 bg-noir/97 backdrop-blur-lg md:hidden"
          >
            {LINKS.map((l, i) => (
              <motion.a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.07 }}
                className="font-display text-3xl font-bold uppercase tracking-wider text-white"
              >
                {l.label}
              </motion.a>
            ))}
            <motion.a
              href="#reservation"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="mt-4 rounded-full bg-blood px-10 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-white"
            >
              Réserver maintenant
            </motion.a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
