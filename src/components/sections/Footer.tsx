"use client";

import { ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { NAV_LINKS } from "@/lib/data";
import { useLenis } from "@/components/providers/SmoothScroll";
import { Marquee } from "@/components/ui/Marquee";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { LegalModal, type LegalType } from "@/components/legal/LegalModal";

const MARQUEE_WORDS = ["CREATE", "AUTOMATE", "SCRAPE", "CONSULT"];

export function Footer() {
  const { scrollTo } = useLenis();
  const [legal, setLegal] = useState<LegalType>(null);
  const time = useParisClock();

  return (
    <footer className="relative mt-10 overflow-hidden">
      {/* Ultra‑saturated rupture panel */}
      <div className="relative overflow-hidden rounded-t-[3rem] bg-[linear-gradient(135deg,#5b3df6_0%,#7b61ff_40%,#2de2e6_100%)] pt-20">
        {/* grain + glow */}
        <div className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay [background-image:radial-gradient(circle_at_20%_20%,#fff,transparent_40%)]" />

        {/* Magnet CTA */}
        <div className="container-x relative flex flex-col items-center text-center text-white">
          <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.3em] text-white/70">
            Prêt à décoller ?
          </p>
          <h2 className="mt-5 max-w-3xl font-[family-name:var(--font-display)] text-[13vw] font-semibold leading-[0.95] tracking-[-0.03em] sm:text-7xl lg:text-[6rem]">
            Un projet en tête&nbsp;?
          </h2>
          <div className="mt-9">
            <MagneticButton
              strength={0.5}
              onClick={() => scrollTo("#contact")}
              className="!bg-black !px-8 !py-4 !text-base !text-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]"
            >
              Lancer la conversation <ArrowUpRight size={18} />
            </MagneticButton>
          </div>
        </div>

        {/* Giant marquee */}
        <div className="relative mt-16 border-y border-white/15 py-5">
          <Marquee speed={20}>
            {MARQUEE_WORDS.map((w) => (
              <span
                key={w}
                className="mx-8 font-[family-name:var(--font-display)] text-5xl font-semibold text-white/90 sm:text-7xl"
              >
                {w}
                <span className="mx-8 text-white/40">•</span>
              </span>
            ))}
          </Marquee>
        </div>

        {/* Info grid */}
        <div className="container-x relative grid gap-10 py-14 text-white sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="font-[family-name:var(--font-display)] text-2xl font-semibold">GJS</div>
            <p className="mt-3 max-w-[15rem] text-sm text-white/70">
              Studio digital sur‑mesure. On crée, automatise, scrape et conseille.
            </p>
          </div>

          <div>
            <p className="mb-4 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.2em] text-white/60">
              Navigation
            </p>
            <ul className="space-y-2 text-sm">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <button
                    onClick={() => scrollTo(l.href)}
                    className="text-white/80 transition-colors hover:text-white"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-4 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.2em] text-white/60">
              Contact
            </p>
            <ul className="space-y-2 text-sm text-white/80">
              <li>
                <a href="mailto:hello@gjs.agency" className="transition-colors hover:text-white">
                  hello@gjs.agency
                </a>
              </li>
              <li>Paris, France</li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-white shadow-[0_0_10px_#fff]" />
                Open for projects
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-4 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.2em] text-white/60">
              Heure de Paris
            </p>
            <div className="font-[family-name:var(--font-display)] text-4xl font-semibold tabular-nums">
              {time ?? "--:--:--"}
            </div>
            <p className="mt-1 text-xs text-white/60">CET · temps réel</p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="relative border-t border-white/15">
          <div className="container-x flex flex-col items-center justify-between gap-4 py-6 text-xs text-white/70 sm:flex-row">
            <span>© {new Date().getFullYear()} GJS — Tous droits réservés.</span>
            <div className="flex items-center gap-5">
              <button onClick={() => setLegal("mentions")} className="transition-colors hover:text-white">
                Mentions légales
              </button>
              <button
                onClick={() => setLegal("confidentialite")}
                className="transition-colors hover:text-white"
              >
                Confidentialité
              </button>
              <span className="font-[family-name:var(--font-mono)]">Made in France 🇫🇷</span>
            </div>
          </div>
        </div>
      </div>

      <LegalModal type={legal} onClose={() => setLegal(null)} />
    </footer>
  );
}

/** Live clock in Europe/Paris — client‑only to avoid hydration mismatch. */
function useParisClock(): string | null {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const update = () => setTime(fmt.format(new Date()));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}
