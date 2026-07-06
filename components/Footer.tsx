import Link from "next/link";

const SOCIALS = [
  { label: "Instagram", href: "https://instagram.com/locnjoy.paris" },
  { label: "Snapchat", href: "https://snapchat.com/add/locnjoy" },
  { label: "Email", href: "mailto:contact@locnjoy.fr" },
  { label: "Téléphone", href: "tel:+33600000000" },
];

const LEGAL = [
  { label: "Politique de confidentialité", href: "/confidentialite" },
  { label: "Mentions légales", href: "/mentions-legales" },
  { label: "Conditions générales", href: "/cgv" },
];

export default function Footer() {
  return (
    <footer className="border-t border-noir-line bg-noir-soft">
      {/* Marquee band */}
      <div className="overflow-hidden border-b border-noir-line py-5">
        <div className="flex w-max animate-marquee gap-8 whitespace-nowrap">
          {[...Array(2)].map((_, half) => (
            <div key={half} className="flex gap-8">
              {[...Array(6)].map((_, i) => (
                <span
                  key={i}
                  className="font-display text-xl font-bold uppercase tracking-widest text-noir-line"
                >
                  Loc&apos;N&apos;Joy <span className="text-blood">—</span> Paris{" "}
                  <span className="text-blood">—</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-3 md:px-10">
        <div>
          <p className="font-display text-xl font-bold uppercase tracking-widest text-white">
            Loc<span className="text-blood">&apos;N&apos;</span>Joy
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-smoke">
            Location de véhicules sportifs et premium à Paris.
            Livraison en Île-de-France, conciergerie 24/7.
          </p>
        </div>

        <div>
          <p className="mb-4 text-[11px] uppercase tracking-[0.25em] text-smoke">Contact</p>
          <ul className="space-y-2.5">
            {SOCIALS.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  target={s.href.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  className="text-sm text-smoke-light transition-colors hover:text-blood"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-4 text-[11px] uppercase tracking-[0.25em] text-smoke">Légal</p>
          <ul className="space-y-2.5">
            {LEGAL.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-sm text-smoke-light transition-colors hover:text-blood"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-noir-line py-5 text-center text-xs text-smoke/60">
        © {new Date().getFullYear()} Loc&apos;N&apos;Joy — Tous droits réservés — Paris, France
      </div>
    </footer>
  );
}
