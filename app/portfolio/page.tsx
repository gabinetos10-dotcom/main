import type { Metadata } from "next";
import PageHero from "@/components/ui/PageHero";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import Button from "@/components/ui/Button";
import PortfolioGallery from "@/components/portfolio/PortfolioGallery";

export const metadata: Metadata = {
  title: "Portfolio — mariages en Occitanie",
  description:
    "Découvrez une sélection de mariages imaginés par Maison Jolie — wedding planner & designer en Occitanie. Filtrez par ambiance.",
  alternates: { canonical: "/portfolio" },
};

export default function PortfolioPage() {
  return (
    <>
      <PageHero
        kicker="Portfolio"
        title={
          <>
            Des mariages <em className="italic text-sunwash">à leur image</em>.
          </>
        }
        intro="Chaque histoire est unique. Explorez ces univers par ambiance — et imaginez le vôtre."
      />
      <Section className="pt-6">
        <PortfolioGallery />

        <Reveal>
          <div className="mt-16 text-center">
            <p className="text-sm text-prune/60">
              © Crédits photographes : Yann Bader · Cindy Gonzalez · Lydia Torresan
            </p>
            <div className="mt-6">
              <Button href="/contact" confettiOnHover>
                Créons le vôtre
              </Button>
            </div>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
