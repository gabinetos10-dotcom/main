"use client";

import Link from "next/link";
import { useRef } from "react";
import { FOOTER, SITE } from "@/lib/content";
import { useApp, useLenisApi } from "@/components/providers/AppContext";
import { useAnchor } from "@/hooks/useAnchor";
import { Magnetic } from "@/components/ui/Magnetic";
import { Marquee } from "@/components/fx/Marquee";

/**
 * Footer signature : rupture totale avec le site sombre — bloc Mindaro
 * lumineux, wordmark géant, CTA énorme, lueur qui suit le pointeur.
 * `data-cursor-invert` retourne le curseur custom en bleu profond.
 */
export function Footer() {
  const { setConsentDialogOpen } = useApp();
  const { scrollTo } = useLenisApi();
  const onAnchor = useAnchor();
  const rootRef = useRef<HTMLElement>(null);

  const onPointerMove = (e: React.PointerEvent) => {
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  const marqueeItems = (
    <span className="flex items-center font-mono text-[11px] uppercase tracking-[0.3em] text-ink/70">
      {[0, 1, 2].map((i) => (
        <span key={i} className="flex items-center">
          <span className="px-6">{FOOTER.marquee}</span>
          <span aria-hidden className="text-ink/40">✦</span>
        </span>
      ))}
    </span>
  );

  return (
    <footer
      ref={rootRef}
      onPointerMove={onPointerMove}
      data-cursor-invert
      className="group/footer relative z-10 mt-4 overflow-hidden rounded-t-[2.5rem] bg-mindaro text-ink"
    >
      {/* Lueur interactive qui suit le pointeur */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover/footer:opacity-100 [background:radial-gradient(560px_circle_at_var(--mx,50%)_var(--my,20%),rgb(230_244_184/0.9),transparent_60%)]"
      />

      <Marquee speed={34} className="relative border-b border-ink/10 py-3.5">
        {marqueeItems}
      </Marquee>

      <div className="container-gjs relative pt-14 lg:pt-20">
        {/* CTA géant */}
        <div className="flex flex-col gap-10 pb-14 lg:flex-row lg:items-end lg:justify-between lg:pb-20">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ink/70">{FOOTER.hookSmall}</p>
            <a
              href="/#contact"
              onClick={onAnchor("/#contact")}
              data-cursor="GO"
              className="group mt-5 block font-display text-[clamp(2.7rem,7.5vw,6.8rem)] font-semibold leading-[0.95] tracking-tight transition-colors duration-500 hover:text-yale"
            >
              Travaillons
              <br />
              <span className="inline-flex items-center gap-3 lg:gap-6">
                ensemble
                <span
                  aria-hidden
                  className="inline-block text-[0.6em] transition-transform duration-500 ease-(--ease-gjs) group-hover:-translate-y-2 group-hover:translate-x-2"
                >
                  ↗
                </span>
              </span>
            </a>
          </div>
          <Magnetic>
            <a
              href={`mailto:${SITE.email}`}
              className="inline-flex items-center gap-3 rounded-full border border-ink/25 px-6 py-3.5 font-mono text-sm transition-colors duration-300 hover:bg-ink hover:text-mindaro"
            >
              {SITE.email}
            </a>
          </Magnetic>
        </div>

        {/* Colonnes */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 border-t border-ink/15 py-12 md:grid-cols-4">
          {[FOOTER.columns.nav, FOOTER.columns.services, FOOTER.columns.contact, FOOTER.columns.social].map(
            (col) => (
              <div key={col.title}>
                <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-ink/60">{col.title}</p>
                <ul className="space-y-2.5">
                  {col.items.map((item) => (
                    <li key={item.label}>
                      {item.href ? (
                        <a
                          href={item.href}
                          onClick={item.href.startsWith("/#") ? onAnchor(item.href) : undefined}
                          target={item.href.startsWith("http") ? "_blank" : undefined}
                          rel={item.href.startsWith("http") ? "noreferrer noopener" : undefined}
                          className="text-sm font-medium transition-[color,transform] duration-300 hover:text-yale"
                        >
                          {item.label}
                        </a>
                      ) : (
                        <span className="text-sm font-medium text-ink/80">{item.label}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}
        </div>

        {/* Wordmark géant — textLength force la pleine largeur */}
        <div aria-hidden className="relative select-none">
          <svg viewBox="0 0 760 225" className="block h-auto w-full" role="presentation">
            <text
              x="380"
              y="212"
              textAnchor="middle"
              fontSize="260"
              fontWeight="600"
              textLength="750"
              lengthAdjust="spacingAndGlyphs"
              fill="currentColor"
              style={{ fontFamily: "var(--font-clash), sans-serif", letterSpacing: "-0.02em" }}
            >
              GJS
            </text>
          </svg>
        </div>
      </div>

      {/* Barre légale */}
      <div className="relative border-t border-ink/15">
        <div className="container-gjs flex flex-wrap items-center justify-between gap-4 py-6 font-mono text-[11px] tracking-wider text-ink/70">
          <span>© 2026 {SITE.name} — Tous droits réservés</span>
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/mentions-legales" className="link-sweep hover:text-ink">
              Mentions légales
            </Link>
            <Link href="/politique-de-confidentialite" className="link-sweep hover:text-ink">
              Politique de confidentialité
            </Link>
            <button onClick={() => setConsentDialogOpen(true)} className="link-sweep hover:text-ink">
              Gérer les cookies
            </button>
          </div>
          <Magnetic>
            <button
              onClick={() => scrollTo(0)}
              aria-label="Revenir en haut de page"
              className="grid h-12 w-12 place-items-center rounded-full border border-ink/25 text-base transition-colors duration-300 hover:bg-ink hover:text-mindaro"
            >
              ↑
            </button>
          </Magnetic>
        </div>
      </div>
    </footer>
  );
}
