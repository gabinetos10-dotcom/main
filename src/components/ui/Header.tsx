"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { NAV_LINKS } from "@/lib/data";
import { useLenis } from "@/components/providers/SmoothScroll";
import { Logo } from "./Logo";
import { Magnetic } from "./Magnetic";
import { MagneticButton } from "./MagneticButton";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { scrollTo } = useLenis();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const go = (href: string) => {
    setMenuOpen(false);
    // small delay lets the menu close before smooth scroll starts
    setTimeout(() => scrollTo(href), menuOpen ? 500 : 0);
  };

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4 sm:pt-5"
      >
        <div
          className={`flex w-full max-w-[var(--container)] items-center justify-between gap-4 rounded-full px-4 py-2.5 transition-all duration-500 ease-[var(--ease-out-expo)] sm:px-5 ${
            scrolled
              ? "border-gradient border border-[var(--color-line)] bg-[rgba(10,10,12,0.62)] shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl [backdrop-filter:blur(20px)_saturate(140%)]"
              : "border border-transparent bg-transparent"
          }`}
        >
          <Logo />

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => (
              <Magnetic key={link.href} strength={0.25}>
                <button
                  onClick={() => go(link.href)}
                  className="rounded-full px-4 py-2 text-sm text-[var(--color-text-dim)] transition-colors duration-300 hover:text-[var(--color-text)]"
                >
                  {link.label}
                </button>
              </Magnetic>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {/* Live status */}
            <div className="hidden items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1.5 md:flex">
              <span className="pulse-dot" />
              <span className="font-[family-name:var(--font-mono)] text-[0.65rem] tracking-wide text-[var(--color-text-dim)]">
                Paris, FR · Open for projects
              </span>
            </div>

            <div className="hidden sm:block">
              <MagneticButton onClick={() => go("#contact")} className="!px-5 !py-2.5">
                Démarrer <ArrowUpRight size={16} />
              </MagneticButton>
            </div>

            {/* Mobile toggle */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu"
              className="grid h-10 w-10 place-items-center rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-text)] lg:hidden"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </motion.header>

      <MobileMenu open={menuOpen} onNavigate={go} />
    </>
  );
}

function MobileMenu({
  open,
  onNavigate,
}: {
  open: boolean;
  onNavigate: (href: string) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ clipPath: "circle(0% at 100% 0%)" }}
          animate={{ clipPath: "circle(150% at 100% 0%)" }}
          exit={{ clipPath: "circle(0% at 100% 0%)" }}
          transition={{ duration: 0.7, ease: [0.83, 0, 0.17, 1] }}
          className="fixed inset-0 z-40 flex flex-col justify-between bg-[var(--color-bg-2)] px-6 pb-10 pt-28 lg:hidden"
        >
          <div className="grid-lines pointer-events-none absolute inset-0 opacity-40" />
          <nav className="relative flex flex-col gap-2">
            {NAV_LINKS.map((link, i) => (
              <motion.button
                key={link.href}
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 + i * 0.07, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => onNavigate(link.href)}
                className="group flex items-baseline justify-between border-b border-[var(--color-line)] py-5 text-left"
              >
                <span className="font-[family-name:var(--font-display)] text-4xl font-medium sm:text-5xl">
                  {link.label}
                </span>
                <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-text-mute)]">
                  0{i + 1}
                </span>
              </motion.button>
            ))}
          </nav>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="relative flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="pulse-dot" />
              <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-text-dim)]">
                Open for projects
              </span>
            </div>
            <button
              onClick={() => onNavigate("#contact")}
              className="rounded-full bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-6 py-3 text-sm font-medium text-white"
            >
              Un projet ? →
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
