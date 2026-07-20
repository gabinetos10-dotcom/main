import Link from "next/link";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import PortfolioGallery from "@/components/portfolio/PortfolioGallery";
import { ArrowRight } from "@/components/ui/Icons";

export default function Portfolio() {
  return (
    <Section id="portfolio">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading
          kicker="Portfolio"
          title={
            <>
              Des mariages <em className="italic text-sunwash">à leur image</em>.
            </>
          }
          intro="Chaque célébration est une histoire singulière. En voici quelques fragments, par ambiance."
        />
        <Reveal delay={0.1}>
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-2 text-sm font-semibold text-terracotta"
          >
            Voir tout le portfolio
            <ArrowRight />
          </Link>
        </Reveal>
      </div>

      <div className="mt-12">
        <PortfolioGallery />
      </div>
    </Section>
  );
}
