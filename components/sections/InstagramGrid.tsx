import { Section, SectionHeading } from "@/components/ui/Section";
import { Stagger, StaggerItem } from "@/components/ui/Reveal";
import ArtVisual from "@/components/ui/ArtVisual";
import { InstagramIcon } from "@/components/ui/Icons";
import { brand } from "@/lib/content";

// Teintes d'illustration du feed. // [À REMPLACER] par le vrai flux Instagram.
const tiles: [string, string][] = [
  ["var(--blush)", "var(--soleil)"],
  ["var(--sauge)", "var(--creme)"],
  ["var(--miel)", "var(--terracotta)"],
  ["var(--rose-poudre)", "var(--blush)"],
  ["var(--soleil)", "var(--miel)"],
  ["var(--terracotta)", "var(--blush)"],
];

export default function InstagramGrid() {
  return (
    <Section id="instagram">
      <SectionHeading
        align="center"
        kicker="Sur le vif"
        title={
          <>
            Suivez le quotidien sur <em className="italic text-sunwash">Instagram</em>.
          </>
        }
        intro={brand.contact.instagram}
      />

      <Stagger className="mx-auto mt-12 grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {tiles.map((hues, i) => (
          <StaggerItem key={i}>
            <a
              href={brand.contact.instagramHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Voir la publication ${i + 1} sur Instagram`}
              className="group relative block aspect-square overflow-hidden rounded-2xl"
            >
              <div className="h-full w-full transition-transform duration-700 ease-signature group-hover:scale-110">
                <ArtVisual hues={hues} seed={i} motif={i % 2 ? "sun" : "sprig"} />
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-prune/40 opacity-0 transition-opacity duration-400 group-hover:opacity-100">
                <InstagramIcon className="h-7 w-7 text-ivoire" strokeWidth={1.4} />
              </div>
            </a>
          </StaggerItem>
        ))}
      </Stagger>

      <div className="mt-10 text-center">
        <a
          href={brand.contact.instagramHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-pill border border-or/30 bg-ivoire/60 px-6 py-3 text-sm font-semibold text-prune transition-colors hover:border-terracotta hover:text-terracotta"
        >
          <InstagramIcon className="h-4 w-4" />
          {brand.contact.instagram}
        </a>
      </div>
    </Section>
  );
}
