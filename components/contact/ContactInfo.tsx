import { brand } from "@/lib/content";
import { Phone, MailIcon, InstagramIcon, PinIcon } from "@/components/ui/Icons";

const items = [
  { icon: <Phone />, label: brand.contact.phone, href: brand.contact.phoneHref },
  { icon: <MailIcon />, label: brand.contact.email, href: brand.contact.emailHref },
  { icon: <InstagramIcon className="h-4 w-4" />, label: brand.contact.instagram, href: brand.contact.instagramHref, external: true },
];

export default function ContactInfo() {
  return (
    <div className="flex h-full flex-col gap-6">
      <div className="invitation-card p-6 sm:p-7">
        <p className="script-accent text-3xl text-terracotta">Parlons de vous</p>
        <p className="mt-2 text-sm leading-relaxed text-prune/70">
          Un café, un appel, un e-mail — comme il vous plaira. Je réponds à chaque message
          personnellement.
        </p>
        <ul className="mt-6 space-y-3">
          {items.map((it) => (
            <li key={it.label}>
              <a
                href={it.href}
                target={it.external ? "_blank" : undefined}
                rel={it.external ? "noopener noreferrer" : undefined}
                className="flex items-center gap-3 text-sm text-prune/80 transition-colors hover:text-terracotta"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blush/40 text-terracotta">
                  {it.icon}
                </span>
                {it.label}
              </a>
            </li>
          ))}
          <li className="flex items-center gap-3 text-sm text-prune/80">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sauge/40 text-prune">
              <PinIcon />
            </span>
            {brand.area.cities.join(" · ")} — {brand.area.departement}
          </li>
        </ul>
      </div>

      {/* Carte stylisée de la zone (Hérault / Occitanie) — illustration, non contractuelle */}
      <div className="invitation-card relative flex-1 overflow-hidden p-2.5">
        <div className="relative h-full min-h-[220px] overflow-hidden rounded-[1.4rem]" style={{ background: "linear-gradient(160deg, color-mix(in oklab, var(--sauge) 22%, var(--creme)), var(--ivoire))" }}>
          <StylizedMap />
          <span className="absolute left-4 top-4 rounded-full bg-ivoire/80 px-3 py-1 text-[0.6rem] uppercase tracking-kicker text-terracotta backdrop-blur">
            Zone d&apos;intervention
          </span>
        </div>
      </div>
    </div>
  );
}

/** Carte abstraite de la côte occitane — décorative. */
function StylizedMap() {
  const cities = [
    { name: "Montpellier", x: 300, y: 120 },
    { name: "Béziers", x: 200, y: 190 },
    { name: "Narbonne", x: 120, y: 250 },
  ];
  return (
    <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full" aria-hidden>
      {/* Mer */}
      <path d="M0 300 L400 300 L400 170 C320 210 240 250 150 290 C100 300 40 300 0 300 Z" fill="color-mix(in oklab, var(--soleil) 30%, var(--blush))" opacity="0.5" />
      {/* Trait de côte */}
      <path d="M400 160 C320 205 240 245 150 285 C100 300 40 300 0 300" fill="none" stroke="color-mix(in oklab, var(--or) 55%, transparent)" strokeWidth="1.4" strokeDasharray="2 4" />
      {/* Routes reliant les villes */}
      <path d={`M${cities[0].x} ${cities[0].y} L${cities[1].x} ${cities[1].y} L${cities[2].x} ${cities[2].y}`} fill="none" stroke="color-mix(in oklab, var(--terracotta) 55%, transparent)" strokeWidth="1.4" strokeLinecap="round" />
      {cities.map((c) => (
        <g key={c.name}>
          <circle cx={c.x} cy={c.y} r="5" fill="var(--terracotta)" />
          <circle cx={c.x} cy={c.y} r="10" fill="none" stroke="var(--terracotta)" strokeWidth="1" opacity="0.5" />
          <text x={c.x + 14} y={c.y + 4} fontSize="12" fill="var(--prune)" fontFamily="var(--font-hanken)">
            {c.name}
          </text>
        </g>
      ))}
    </svg>
  );
}
