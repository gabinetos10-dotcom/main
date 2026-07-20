import Link from "next/link";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/Reveal";
import ArtVisual from "@/components/ui/ArtVisual";
import { ArrowRight } from "@/components/ui/Icons";
import { posts } from "@/lib/content";
import { formatDateFR } from "@/lib/utils";

export default function BlogTeaser() {
  return (
    <Section id="blog">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading
          kicker="Inspirations & coulisses"
          title={
            <>
              Le <em className="italic text-sunwash">journal</em> de Maison Jolie.
            </>
          }
          intro="Des idées, des conseils et les dessous de mes mariages, pour nourrir le vôtre."
        />
        <Reveal delay={0.1}>
          <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-terracotta">
            Lire le journal
            <ArrowRight />
          </Link>
        </Reveal>
      </div>

      <Stagger className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
        {posts.map((post, i) => (
          <StaggerItem key={post.slug}>
            <Link
              href={`/blog/${post.slug}`}
              className="group block overflow-hidden rounded-card border border-or/15 bg-ivoire shadow-blush transition-shadow duration-500 hover:shadow-bloom"
            >
              <div className="relative aspect-[16/11] overflow-hidden">
                <div className="h-full w-full transition-transform duration-700 ease-signature group-hover:scale-105">
                  <ArtVisual hues={post.hues as [string, string]} seed={i + 2} motif={i % 2 ? "sun" : "sprig"} />
                </div>
                <span className="absolute left-4 top-4 rounded-full bg-ivoire/85 px-3 py-1 text-[0.62rem] uppercase tracking-kicker text-terracotta backdrop-blur">
                  {post.category}
                </span>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 text-xs text-prune/50">
                  <time dateTime={post.date}>{formatDateFR(post.date)}</time>
                  <span className="text-or">·</span>
                  <span>{post.readingTime} de lecture</span>
                </div>
                <h3 className="mt-3 font-serif text-xl font-light leading-snug text-prune transition-colors group-hover:text-terracotta text-balance">
                  {post.title}
                </h3>
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
  );
}
