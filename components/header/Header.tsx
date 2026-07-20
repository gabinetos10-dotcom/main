"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Monogram from "@/components/brand/Monogram";
import Button from "@/components/ui/Button";
import MobileMenu from "./MobileMenu";
import { InstagramIcon } from "@/components/ui/Icons";
import { brand, nav } from "@/lib/content";
import { cn } from "@/lib/utils";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpenMenu(false), [pathname]);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-signature",
          scrolled
            ? "border-b border-or/15 bg-creme/70 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent"
        )}
        style={{ height: "var(--header-h)" }}
      >
        <div className="mx-auto flex h-full max-w-[86rem] items-center justify-between px-5 sm:px-8">
          {/* Logo — monogramme + wordmark */}
          <Link href="/" className="group flex items-center gap-3" aria-label="Maison Jolie — accueil">
            <Monogram className="w-9" withFrame strokeWidth={3} />
            <span className="hidden flex-col leading-none sm:flex">
              <span className="font-serif text-lg tracking-tight text-prune">Maison Jolie</span>
              <span className="text-[0.6rem] uppercase tracking-kicker text-terracotta/80">
                Wedding
              </span>
            </span>
          </Link>

          {/* Nav desktop */}
          <nav className="hidden items-center gap-8 lg:flex" aria-label="Navigation principale">
            {nav.map((item) =>
              "children" in item && item.children ? (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => setServicesOpen(true)}
                  onMouseLeave={() => setServicesOpen(false)}
                >
                  <Link
                    href={item.href}
                    className="link-underline flex items-center gap-1 text-sm font-medium text-prune/80 transition-colors hover:text-prune"
                  >
                    {item.label}
                    <svg viewBox="0 0 10 6" className="h-1.5 w-2.5 opacity-60" aria-hidden>
                      <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  </Link>
                  <AnimatePresence>
                    {servicesOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: 8, filter: "blur(6px)" }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute left-1/2 top-full w-60 -translate-x-1/2 pt-4"
                      >
                        <div className="invitation-card overflow-hidden p-2">
                          {item.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              className="block rounded-2xl px-4 py-3 text-sm text-prune/80 transition-colors hover:bg-blush/30 hover:text-prune"
                            >
                              <span className="font-serif text-base">{child.label}</span>
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className="link-underline text-sm font-medium text-prune/80 transition-colors hover:text-prune"
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>

          {/* Actions droite */}
          <div className="flex items-center gap-3 sm:gap-4">
            <a
              href={brand.contact.instagramHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Instagram ${brand.contact.instagram}`}
              className="hidden text-prune/70 transition-colors hover:text-terracotta sm:block"
            >
              <InstagramIcon />
            </a>
            <div className="hidden sm:block">
              <Button href="/contact" confettiOnHover className="px-6 py-3 text-[0.82rem]">
                Je me marie !
              </Button>
            </div>

            {/* Burger mobile */}
            <button
              onClick={() => setOpenMenu((v) => !v)}
              aria-label={openMenu ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={openMenu}
              className="relative z-50 flex h-11 w-11 items-center justify-center rounded-full border border-or/25 bg-ivoire/60 backdrop-blur lg:hidden"
            >
              <BurgerFlower open={openMenu} />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu open={openMenu} onClose={() => setOpenMenu(false)} />
    </>
  );
}

/** Burger sur-mesure : trois traits qui se nouent en fleur/étoile à l'ouverture. */
function BurgerFlower({ open }: { open: boolean }) {
  return (
    <span className="relative block h-4 w-5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute left-0 block h-[1.6px] w-5 rounded-full bg-prune"
          style={{ top: `${i * 7}px`, transformOrigin: "center" }}
          animate={
            open
              ? i === 1
                ? { opacity: 0 }
                : { top: "7px", rotate: i === 0 ? 45 : -45 }
              : { top: `${i * 7}px`, rotate: 0, opacity: 1 }
          }
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}
    </span>
  );
}
