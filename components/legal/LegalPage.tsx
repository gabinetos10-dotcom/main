import PageHero from "@/components/ui/PageHero";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

export type LegalBlock = { heading: string; body: React.ReactNode };

/** Gabarit commun aux pages légales — typographie sobre et lisible. */
export default function LegalPage({
  kicker,
  title,
  intro,
  blocks,
  updated,
}: {
  kicker: string;
  title: string;
  intro?: string;
  blocks: LegalBlock[];
  updated?: string;
}) {
  return (
    <>
      <PageHero kicker={kicker} title={title} intro={intro} />
      <Section className="pt-6">
        <div className="mx-auto max-w-2xl">
          {updated && (
            <p className="mb-8 text-xs uppercase tracking-wide text-prune/45">
              Dernière mise à jour : {updated}
            </p>
          )}
          <div className="space-y-10">
            {blocks.map((block, i) => (
              <Reveal key={i} delay={i * 0.02}>
                <section>
                  <h2 className="font-serif text-2xl font-light text-prune">{block.heading}</h2>
                  <div className="mt-3 space-y-3 text-sm leading-relaxed text-prune/75 [&_a]:text-terracotta [&_a]:underline">
                    {block.body}
                  </div>
                </section>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}

/** Marqueur visuel pour les champs à compléter par le client. */
export function ToFill({ children }: { children: React.ReactNode }) {
  return (
    <mark className="rounded bg-soleil/40 px-1.5 py-0.5 text-prune">[À COMPLÉTER — {children}]</mark>
  );
}
