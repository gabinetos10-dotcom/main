"use client";

import Link from "next/link";
import { useState } from "react";
import Monogram from "@/components/brand/Monogram";
import { InstagramIcon, Phone, MailIcon, PinIcon, ArrowRight } from "@/components/ui/Icons";
import { brand } from "@/lib/content";

const legalLinks = [
  { label: "Plan du site", href: "/#top" },
  { label: "Mentions légales & CGV", href: "/mentions-legales" },
  { label: "Politique de confidentialité", href: "/politique-de-confidentialite" },
];

export default function Footer() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent || !email) return;
    // [À CONNECTER] — brancher à votre outil d'emailing (Brevo, Mailchimp…).
    setSent(true);
    setEmail("");
  };

  return (
    <footer className="relative z-10 overflow-hidden" style={{ background: "var(--prune)" }}>
      {/* Vague de séparation avec la section précédente */}
      <div className="pointer-events-none -mt-px" aria-hidden>
        <svg viewBox="0 0 1440 90" preserveAspectRatio="none" className="block h-16 w-full sm:h-24">
          <path
            d="M0,50 C240,90 480,10 720,40 C960,70 1200,20 1440,45 L1440,90 L0,90 Z"
            fill="var(--prune)"
          />
        </svg>
      </div>

      {/* Grand monogramme + botanique dorée en filigrane */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.06]" aria-hidden>
        <Monogram className="w-[60vw] max-w-3xl" color="var(--or)" strokeWidth={1.2} withFrame={false} />
      </div>

      <div className="relative mx-auto max-w-[86rem] px-5 pb-10 pt-6 sm:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.2fr_1fr_1fr]">
          {/* Colonne marque */}
          <div>
            <div className="flex items-center gap-3">
              <Monogram className="w-11" color="var(--or)" strokeWidth={3} />
              <div className="flex flex-col leading-none">
                <span className="font-serif text-xl text-creme">Maison Jolie</span>
                <span className="text-[0.6rem] uppercase tracking-kicker text-miel/80">Wedding</span>
              </div>
            </div>
            <p className="mt-6 max-w-xs font-serif text-2xl leading-snug text-creme/90 text-balance">
              {brand.footerBaseline}
            </p>
            <p className="script-accent mt-4 text-3xl text-miel">Mélina</p>
          </div>

          {/* Colonne contact */}
          <div className="text-sm text-creme/75">
            <h3 className="kicker mb-4 text-miel/90">Prenons contact</h3>
            <ul className="space-y-3">
              <li>
                <a href={brand.contact.phoneHref} className="flex items-center gap-3 transition-colors hover:text-miel">
                  <Phone /> {brand.contact.phone}
                </a>
              </li>
              <li>
                <a href={brand.contact.emailHref} className="flex items-center gap-3 transition-colors hover:text-miel">
                  <MailIcon /> {brand.contact.email}
                </a>
              </li>
              <li>
                <a
                  href={brand.contact.instagramHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 transition-colors hover:text-miel"
                >
                  <InstagramIcon className="h-4 w-4" /> {brand.contact.instagram}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <PinIcon /> {brand.area.cities.join(" · ")}
              </li>
            </ul>
          </div>

          {/* Colonne newsletter */}
          <div>
            <h3 className="kicker mb-4 text-miel/90">La lettre de Maison Jolie</h3>
            {sent ? (
              <p className="text-sm text-creme/80">
                Merci — on garde le lien précieusement. À très vite. ✿
              </p>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <div className="flex items-center gap-2 rounded-pill border border-creme/20 bg-creme/5 px-4 py-2.5">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Votre e-mail"
                    aria-label="Votre adresse e-mail"
                    className="w-full bg-transparent text-sm text-creme placeholder:text-creme/40 focus:outline-none"
                  />
                  <button
                    type="submit"
                    aria-label="S'inscrire à la newsletter"
                    className="text-miel transition-transform hover:translate-x-0.5"
                  >
                    <ArrowRight />
                  </button>
                </div>
                <label className="flex items-start gap-2 text-xs text-creme/55">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 accent-[var(--terracotta)]"
                    required
                  />
                  <span>
                    J&apos;accepte de recevoir la lettre de Maison Jolie et la{" "}
                    <Link href="/politique-de-confidentialite" className="underline">
                      politique de confidentialité
                    </Link>
                    .
                  </span>
                </label>
              </form>
            )}
          </div>
        </div>

        <div className="mt-12 h-px w-full bg-creme/10" />

        <div className="mt-6 flex flex-col items-center justify-between gap-4 text-xs text-creme/50 sm:flex-row">
          <p>
            © {new Date().getFullYear()} Maison Jolie Wedding — {brand.area.region}.
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2" aria-label="Liens légaux">
            {legalLinks.map((l) => (
              <Link key={l.href} href={l.href} className="link-underline transition-colors hover:text-miel">
                {l.label}
              </Link>
            ))}
          </nav>
          <p className="text-creme/35">Conception & design — studio créatif.</p>
        </div>
      </div>
    </footer>
  );
}
