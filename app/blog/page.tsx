import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/ui/PageHero";
import { Section } from "@/components/ui/Section";
import { Stagger, StaggerItem } from "@/components/ui/Reveal";
import ArtVisual from "@/components/ui/ArtVisual";
import { ArrowRight } from "@/components/ui/Icons";
import { posts } from "@/lib/content";
import { formatDateFR } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Blog — inspirations, conseils & coulisses",
  description:
    "Le journal de Maison Jolie : inspirations déco, conseils d'organisation et coulisses de mariages en Occitanie.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  return (
    <>
      <PageHero
        kicker="Le journal"
        title={
          <>
            Inspirations, conseils &amp; <em className="italic text-sunwash">coulisses</em>.
          </>
        }
        intro="De quoi nourrir votre projet et découvrir mon regard, entre idées déco et dessous de l'organisation."
      />
      <Section className="pt-6">
        <Stagger className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, i) => (
            <StaggerItem key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-card border border-or/15 bg-ivoire shadow-blush transition-shadow duration-500 hover:shadow-bloom"
              >
                <div className="relative aspect-[16/11] overflow-hidden">
                  <div className="h-full w-full transition-transform duration-700 ease-signature group-hover:scale-105">
                    <ArtVisual hues={post.hues} seed={i + 2} motif={i % 2 ? "sun" : "sprig"} />
                  </div>
                  <span className="absolute left-4 top-4 rounded-full bg-ivoire/85 px-3 py-1 text-[0.62rem] uppercase tracking-kicker text-terracotta backdrop-blur">
                    {post.category}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center gap-2 text-xs text-prune/50">
                    <time dateTime={post.date}>{formatDateFR(post.date)}</time>
                    <span className="text-or">·</span>
                    <span>{post.readingTime}</span>
                  </div>
                  <h2 className="mt-3 font-serif text-xl font-light leading-snug text-prune text-balance">
                    {post.title}
                  </h2>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-prune/65">{post.excerpt}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-terracotta">
                    Lire l&apos;article
                    <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>
    </>
  );
}
