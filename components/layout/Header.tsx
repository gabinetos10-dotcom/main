"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NAV_ITEMS, SITE } from "@/lib/content";
import { cn, prefersReducedMotion } from "@/lib/utils";
import { useApp, useLenisApi } from "@/components/providers/AppContext";
import { useAnchor } from "@/hooks/useAnchor";
import { Magnetic } from "@/components/ui/Magnetic";
import { Button } from "@/components/ui/Button";
import { FullscreenMenu } from "./FullscreenMenu";

/** Wordmark interactif : brouillage de glyphes au survol, 5 clics = terminal. */
function LogoMark() {
  const ref = useRef<HTMLSpanElement>(null);
  const running = useRef(false);

  const scramble = () => {
    const el = ref.current;
    if (!el || running.current || prefersReducedMotion()) return;
    running.current = true;
    const target = "GJS";
    const glyphs = "GJS<>{}[]/=+*#§";
    let frame = 0;
    const id = setInterval(() => {
      frame++;
      el.textContent = target
        .split("")
        .map((c, i) => (frame > i * 2 + 3 ? c : glyphs[Math.floor(Math.random() * glyphs.length)]))
        .join("");
      if (frame > 9) {
        clearInterval(id);
        el.textContent = target;
        running.current = false;
      }
    }, 42);
  };

  return (
    <span className="inline-flex items-baseline font-display text-2xl font-semibold tracking-tight text-mist">
      <span ref={ref} onMouseEnter={scramble}>
        GJS
      </span>
      <span aria-hidden className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-mindaro" />
    </span>
  );
}

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [compact, setCompact] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const { scrollTo, lock, unlock } = useLenisApi();
  const { setTerminalOpen, preloaderDone } = useApp();
  const onAnchor = useAnchor();
  const clicksRef = useRef<number[]>([]);
  const lastY = useRef(0);

  /* Header intelligent : se compacte après 40px, se masque en descente,
     réapparaît dès qu'on remonte. */
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setCompact(y > 40);
      if (y > 180 && y > lastY.current + 6) setHidden(true);
      else if (y < lastY.current - 4 || y <= 180) setHidden(false);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Indicateur de section active (home uniquement) */
  useEffect(() => {
    if (!isHome) {
      setActive(null);
      return;
    }
    const sections = document.querySelectorAll<HTMLElement>("[data-section]");
    if (!sections.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [isHome, preloaderDone]);

  /* Verrou de scroll pendant le menu */
  useEffect(() => {
    if (!menuOpen) return;
    lock();
    return () => unlock();
  }, [menuOpen, lock, unlock]);

  /* Easter egg : 5 clics rapides sur le logo → terminal secret */
  const onLogoClick = (e: React.MouseEvent) => {
    const now = performance.now();
    clicksRef.current = [...clicksRef.current.filter((t) => now - t < 2600), now];
    if (clicksRef.current.length >= 5) {
      clicksRef.current = [];
      setTerminalOpen(true);
    }
    if (isHome) {
      e.preventDefault();
      scrollTo(0);
    }
  };

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-transform duration-500 ease-(--ease-gjs)",
          hidden && !menuOpen && "-translate-y-full"
        )}
      >
        <div
          className={cn(
            "border-b transition-[background-color,border-color,backdrop-filter] duration-500",
            compact && !menuOpen
              ? "border-mist/5 bg-ink/70 backdrop-blur-lg"
              : "border-transparent bg-transparent"
          )}
        >
          <div className={cn("container-gjs flex items-center justify-between transition-[padding] duration-500", compact ? "py-3" : "py-5")}>
            <Magnetic strength={0.25}>
              <a href="/" onClick={onLogoClick} aria-label="GJS — retour à l'accueil">
                <LogoMark />
              </a>
            </Magnetic>

            {/* Navigation desktop */}
            <nav aria-label="Navigation principale" className="hidden items-center gap-7 lg:flex">
              {NAV_ITEMS.map((item) => (
                <Magnetic key={item.id} strength={0.3}>
                  <a
                    href={`/#${item.id}`}
                    onClick={onAnchor(`/#${item.id}`)}
                    aria-current={active === item.id ? "true" : undefined}
                    className={cn(
                      "link-sweep font-mono text-[11px] uppercase tracking-[0.22em] transition-colors duration-300",
                      active === item.id ? "text-mindaro" : "text-cambridge hover:text-mist"
                    )}
                  >
                    <sup className="mr-1 text-[8px] text-mindaro/70">{item.index}</sup>
                    {item.label}
                  </a>
                </Magnetic>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <span className="hidden items-center gap-2 rounded-full border border-mist/10 px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-cambridge xl:flex">
                <span aria-hidden className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-mindaro" />
                {SITE.availability}
              </span>
              <div className="hidden md:block">
                <Button href="/#contact" size="sm" cursorLabel="GO">
                  Un projet ?
                </Button>
              </div>
              {/* Burger — le menu immersif est accessible partout, même desktop */}
              <Magnetic strength={0.4}>
                <button
                  onClick={() => setMenuOpen(true)}
                  aria-expanded={menuOpen}
                  aria-controls="menu-gjs"
                  aria-label="Ouvrir le menu"
                  className="group grid h-11 w-11 place-items-center rounded-full border border-mist/15 transition-colors duration-300 hover:border-mindaro/60"
                >
                  <span className="flex flex-col items-center gap-[5px]">
                    <span className="h-px w-5 bg-mist transition-all duration-300 group-hover:w-3.5 group-hover:bg-mindaro" />
                    <span className="h-px w-5 bg-mist transition-all duration-300 group-hover:bg-mindaro" />
                  </span>
                </button>
              </Magnetic>
            </div>
          </div>
        </div>
      </header>

      <FullscreenMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
