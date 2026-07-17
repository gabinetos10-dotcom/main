"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FOOTER, NAV_ITEMS, SITE } from "@/lib/content";
import { useLenisApi } from "@/components/providers/AppContext";

const EASE_BEZIER: [number, number, number, number] = [0.87, 0, 0.13, 1];
const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

const LINKS = [
  { label: "Accueil", href: "/#top", index: "00" },
  ...NAV_ITEMS.map((n) => ({ label: n.label, href: `/#${n.id}`, index: n.index })),
];

/**
 * Menu plein écran immersif : rideau qui descend, liens géants révélés
 * par masque, horloge Paris, indice d'easter egg. Fermeture ESC / bouton.
 */
export function FullscreenMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { scrollTo } = useLenisApi();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [time, setTime] = useState("--:--:--");

  useEffect(() => {
    if (!open) return;
    const fmt = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const tick = () => setTime(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => closeRef.current?.focus(), 450);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open, onClose]);

  const navigate = (href: string) => (e: React.MouseEvent) => {
    onClose();
    if (pathname === "/") {
      e.preventDefault();
      const hash = href.slice(1); // "/#services" → "#services"
      setTimeout(() => scrollTo(hash === "#top" ? 0 : hash), 550);
      history.replaceState(null, "", href);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="menu"
          id="menu-gjs"
          role="dialog"
          aria-modal="true"
          aria-label="Menu principal"
          className="fixed inset-0 z-[60] overflow-hidden bg-abyss"
          initial={{ clipPath: "inset(0 0 100% 0)" }}
          animate={{ clipPath: "inset(0 0 0% 0)" }}
          exit={{ clipPath: "inset(0 0 100% 0)" }}
          transition={{ duration: 0.75, ease: EASE_BEZIER }}
        >
          {/* Décor : grille + lueurs */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(to_right,var(--color-mist)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-mist)_1px,transparent_1px)] [background-size:88px_88px]"
          />
          <div aria-hidden className="absolute -left-32 top-1/4 h-96 w-96 animate-drift-a rounded-full bg-yale/40 blur-[140px]" />
          <div aria-hidden className="absolute -right-24 bottom-10 h-80 w-80 animate-drift-b rounded-full bg-sage/20 blur-[130px]" />

          {/* Barre haute : logo + fermer */}
          <div className="container-gjs relative flex items-center justify-between py-5">
            <span className="font-display text-2xl font-semibold tracking-tight text-mist">
              GJS<span className="text-mindaro">.</span>
            </span>
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Fermer le menu"
              className="group grid h-11 w-11 place-items-center rounded-full border border-mist/15 transition-colors duration-300 hover:border-mindaro/60"
            >
              <span className="relative block h-4 w-4">
                <span className="absolute left-0 top-1/2 h-px w-full rotate-45 bg-mist transition-colors group-hover:bg-mindaro" />
                <span className="absolute left-0 top-1/2 h-px w-full -rotate-45 bg-mist transition-colors group-hover:bg-mindaro" />
              </span>
            </button>
          </div>

          <div className="container-gjs relative flex h-[calc(100%-90px)] flex-col justify-between pb-6 pt-4 lg:flex-row lg:items-end lg:pb-10">
            {/* Liens géants */}
            <motion.nav
              aria-label="Menu"
              initial="hidden"
              animate="show"
              exit="hidden"
              variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.25 } } }}
              className="flex flex-col gap-1 lg:gap-2"
            >
              {LINKS.map((link) => (
                <div key={link.href} className="overflow-hidden">
                  <motion.div
                    variants={{
                      hidden: { y: "115%" },
                      show: { y: 0, transition: { duration: 0.8, ease: EASE_OUT } },
                    }}
                  >
                    <a
                      href={link.href}
                      onClick={navigate(link.href)}
                      className="group flex items-baseline gap-4 font-display text-[clamp(2.4rem,7.5vh,5.2rem)] font-semibold leading-[1.05] text-mist transition-[color,transform] duration-500 ease-(--ease-gjs) hover:translate-x-3 hover:text-mindaro"
                      data-cursor="ALLER"
                    >
                      <span className="font-mono text-xs tracking-[0.3em] text-cambridge transition-colors group-hover:text-mindaro">
                        {link.index}
                      </span>
                      {link.label}
                    </a>
                  </motion.div>
                </div>
              ))}
            </motion.nav>

            {/* Colonne info */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.55, duration: 0.7, ease: EASE_OUT } }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              className="mt-8 flex flex-col gap-5 lg:mt-0 lg:items-end lg:text-right"
            >
              <div>
                <p className="eyebrow mb-2">Nouveau projet</p>
                <a
                  href={`mailto:${SITE.email}`}
                  className="link-sweep font-mono text-sm text-mist hover:text-mindaro md:text-base"
                >
                  {SITE.email}
                </a>
              </div>
              <div className="flex gap-4 font-mono text-[11px] uppercase tracking-[0.2em] text-cambridge lg:justify-end">
                {FOOTER.columns.social.items.map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noreferrer noopener" className="link-sweep hover:text-mindaro">
                    {s.label}
                  </a>
                ))}
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.2em] text-cambridge lg:justify-end">
                <span aria-hidden className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-mindaro" />
                PARIS — {time}
              </div>
              <p className="max-w-[26ch] font-mono text-[10px] leading-relaxed tracking-wider text-cambridge/60">
                indice : tapez g·j·s n'importe où sur le site. il se passera quelque chose.
              </p>
              <div className="flex gap-4 font-mono text-[10px] uppercase tracking-[0.18em] text-cambridge/70">
                <Link href="/mentions-legales" onClick={onClose} className="hover:text-mist">
                  Mentions légales
                </Link>
                <Link href="/politique-de-confidentialite" onClick={onClose} className="hover:text-mist">
                  Confidentialité
                </Link>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
