import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHero from "@/components/ui/PageHero";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import Button from "@/components/ui/Button";
import ArtVisual from "@/components/ui/ArtVisual";
import RibbonDivider from "@/components/decor/RibbonDivider";
import { ArrowRight } from "@/components/ui/Icons";
import { posts } from "@/lib/content";
import { formatDateFR } from "@/lib/utils";

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = posts.find((p) => p.slug === params.slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { title: post.title, description: post.excerpt, type: "article" },
  };
}

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const post = posts.find((p) => p.slug === params.slug);
  if (!post) notFound();

  const related = posts.filter((p) => p.slug !== post.slug).slice(0, 2);

  return (
    <>
      <PageHero
        kicker={post.category}
        title={post.title}
        intro={
          <span className="flex items-center justify-center gap-2 text-sm text-prune/55">
            <time dateTime={post.date}>{formatDateFR(post.date)}</time>
            <span className="text-or">·</span>
            <span>{post.readingTime} de lecture</span>
          </span>
        }
      />

      <Section className="pt-8">
        <Reveal>
          <div className="invitation-card mx-auto max-w-4xl overflow-hidden p-2.5">
            <div className="aspect-[16/9] overflow-hidden rounded-[1.4rem]">
              <ArtVisual hues={post.hues} motif="arch" seed={5} />
            </div>
          </div>
        </Reveal>

        <article className="mx-auto mt-12 max-w-2xl">
          {/* [À VALIDER] — contenu d'article rédigé par le studio. */}
          {post.body.map((para, i) => (
            <Reveal key={i} delay={i * 0.03}>
              <p
                className={
                  i === 0
                    ? "font-serif text-2xl font-light leading-snug text-prune first-letter:float-left first-letter:mr-3 first-letter:font-serif first-letter:text-6xl first-letter:leading-[0.8] first-letter:text-terracotta"
                    : "mt-6 text-base leading-relaxed text-prune/80 text-pretty"
                }
              >
                {para}
              </p>
            </Reveal>
          ))}

          <Reveal>
            <div className="mt-10 hairline-gold" />
            <p className="script-accent mt-6 text-center text-4xl text-terracotta">Mélina</p>
          </Reveal>
        </article>
      </Section>

      <RibbonDivider />

      {/* Articles liés */}
      <Section className="pt-0">
        <p className="kicker mb-6">À lire aussi</p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {related.map((p) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className="group flex items-center gap-5 rounded-card border border-or/15 bg-ivoire p-4 shadow-blush transition-shadow hover:shadow-bloom"
            >
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl">
                <ArtVisual hues={p.hues} seed={2} motif="sun" />
              </div>
              <div>
                <span className="text-[0.62rem] uppercase tracking-kicker text-terracotta">{p.category}</span>
                <h3 className="mt-1 font-serif text-lg leading-snug text-prune group-hover:text-terracotta">{p.title}</h3>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Button href="/blog" variant="outline">
            <ArrowRight className="rotate-180" /> Tous les articles
          </Button>
        </div>
      </Section>
    </>
  );
}
