"use client";

import { ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { NAV_LINKS } from "@/lib/data";
import { useLenis } from "@/components/providers/SmoothScroll";
import { Marquee } from "@/components/ui/Marquee";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { Em } from "@/components/ui/Em";
import { LegalModal, type LegalType } from "@/components/legal/LegalModal";

const MARQUEE_WORDS = ["CREATE", "AUTOMATE", "SCRAPE", "CONSULT"];

export function Footer() {
  const { scrollTo } = useLenis();
  const [legal, setLegal] = useState<LegalType>(null);
  const time = useParisClock();

  return (
    <footer className="relative mt-10 overflow-hidden text-[var(--color-ink)]">
      {/* Warm ivory rupture — the clean break from the dark site. */}
      <div className="relative overflow-hidden rounded-t-[2.5rem] bg-[var(--color-ivory)] pt-24">
        {/* Magnet CTA */}
        <div className="container-x relative flex flex-col items-center text-center">
          <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.3em] text-black/45">
            Prêt à décoller ?
          </p>
          <h2 className="mt-6 max-w-4xl font-[family-name:var(--font-display)] text-[15vw] font-semibold leading-[0.9] tracking-[-0.045em] sm:text-7xl lg:text-[7.5rem]">
            Un projet en <Em accent>tête</Em> ?
          </h2>
          <div className="mt-10">
            <MagneticButton
              strength={0.5}
              onClick={() => scrollTo("#contact")}
              className="!bg-[var(--color-ink)] !px-9 !py-4 !text-base !text-[var(--color-ivory)] hover:!bg-black"
            >
              Lancer la conversation <ArrowUpRight size={18} />
            </MagneticButton>
          </div>
        </div>

        {/* Giant marquee */}
        <div className="relative mt-20 border-y border-black/10 py-6">
          <Marquee speed={22}>
            {MARQUEE_WORDS.map((w) => (
              <span
                key={w}
                className="mx-6 font-[family-name:var(--font-display)] text-5xl font-semibold tracking-[-0.02em] sm:text-7xl"
              >
                {w}
                <span className="mx-6 text-[var(--color-accent)]">✦</span>
              </span>
            ))}
          </Marquee>
        </div>

        {/* Info grid */}
        <div className="container-x relative grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="font-[family-name:var(--font-display)] text-2xl font-semibold">GJS</div>
            <p className="mt-3 max-w-[15rem] text-sm text-black/55">
              Studio digital sur‑mesure. On crée, automatise, scrape et conseille.
            </p>
          </div>

          <div>
            <p className="mb-4 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.2em] text-black/40">
              Navigation
            </p>
            <ul className="space-y-2.5 text-sm">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <button
                    onClick={() => scrollTo(l.href)}
                    className="link-underline text-black/70 transition-colors hover:text-black"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-4 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.2em] text-black/40">
              Contact
            </p>
            <ul className="space-y-2.5 text-sm text-black/70">
              <li>
                <a href="mailto:hello@gjs.agency" className="link-underline transition-colors hover:text-black">
                  hello@gjs.agency
                </a>
              </li>
              <li>Paris, France</li>
              <li className="flex items-center gap-2">
                <span className="pulse-dot" />
                Open for projects
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-4 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.2em] text-black/40">
              Heure de Paris
            </p>
            <div className="font-[family-name:var(--font-display)] text-4xl font-semibold tabular-nums">
              {time ?? "--:--:--"}
            </div>
            <p className="mt-1 text-xs text-black/45">CET · temps réel</p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="relative border-t border-black/10">
          <div className="container-x flex flex-col items-center justify-between gap-4 py-6 text-xs text-black/60 sm:flex-row">
            <span>© {new Date().getFullYear()} GJS — Tous droits réservés.</span>
            <div className="flex items-center gap-5">
              <button onClick={() => setLegal("mentions")} className="link-underline transition-colors hover:text-black">
                Mentions légales
              </button>
              <button
                onClick={() => setLegal("confidentialite")}
                className="link-underline transition-colors hover:text-black"
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
