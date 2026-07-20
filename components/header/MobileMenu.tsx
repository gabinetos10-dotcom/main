"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Botanical from "@/components/decor/Botanical";
import Button from "@/components/ui/Button";
import { InstagramIcon, Phone, MailIcon } from "@/components/ui/Icons";
import { brand } from "@/lib/content";

const links = [
  { label: "Accueil", href: "/" },
  { label: "Wedding Planner", href: "/wedding-planner" },
  { label: "Wedding Designer", href: "/wedding-designer" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export default function MobileMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (open) document.body.classList.add("no-scroll");
    else document.body.classList.remove("no-scroll");
    return () => document.body.classList.remove("no-scroll");
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex flex-col overflow-hidden lg:hidden"
          initial={{ clipPath: "circle(0% at calc(100% - 2.5rem) 2.5rem)" }}
          animate={{ clipPath: "circle(150% at calc(100% - 2.5rem) 2.5rem)" }}
          exit={{ clipPath: "circle(0% at calc(100% - 2.5rem) 2.5rem)" }}
          transition={{ duration: 0.6, ease: EASE }}
          style={{ background: "linear-gradient(160deg, var(--creme), var(--blush))" }}
        >
          {/* Botanique décorative */}
          <Botanical variant="branch" className="absolute -left-6 top-24 w-40 opacity-40" color="var(--sauge)" />
          <Botanical variant="sprig" flip className="absolute -right-4 bottom-28 w-36 opacity-40" color="var(--rose-poudre)" />

          <nav className="flex flex-1 flex-col justify-center gap-1 px-8 pt-24" aria-label="Menu mobile">
            {links.map((link, i) => (
              <motion.div
                key={link.href}
                initial={{ opacity: 0, y: 28, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.6, ease: EASE, delay: 0.15 + i * 0.07 }}
              >
                <Link
                  href={link.href}
                  onClick={onClose}
                  className="block py-2 font-serif text-4xl text-prune transition-colors hover:text-terracotta"
                >
                  {link.label}
                </Link>
              </motion.div>
            ))}
          </nav>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.6 }}
            className="space-y-5 px-8 pb-12"
          >
            <div className="hairline-gold" />
            <div className="flex flex-col gap-2 text-sm text-prune/75">
              <a href={brand.contact.phoneHref} className="flex items-center gap-2">
                <Phone /> {brand.contact.phone}
              </a>
              <a href={brand.contact.emailHref} className="flex items-center gap-2">
                <MailIcon /> {brand.contact.email}
              </a>
              <a
                href={brand.contact.instagramHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <InstagramIcon className="h-4 w-4" /> {brand.contact.instagram}
              </a>
            </div>
            <Button href="/contact" onClick={onClose} className="w-full" confettiOnHover>
              Je me marie !
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
