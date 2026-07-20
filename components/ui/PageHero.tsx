import { Reveal } from "./Reveal";
import Botanical from "@/components/decor/Botanical";
import { cn } from "@/lib/utils";

/** En-tête des pages intérieures — respire sous le header, botanique discrète. */
export default function PageHero({
  kicker,
  title,
  intro,
  children,
  className,
}: {
  kicker?: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("relative overflow-hidden pt-[calc(var(--header-h)+3rem)]", className)}>
      <Botanical variant="sprig" className="absolute -left-6 top-24 hidden w-28 opacity-40 lg:block" color="var(--sauge)" />
      <Botanical variant="branch" flip className="absolute right-0 top-32 hidden w-28 opacity-40 lg:block" color="var(--rose-poudre)" />
      <div className="mx-auto max-w-[86rem] px-5 pb-8 pt-8 text-center sm:px-8">
        {kicker && (
          <Reveal>
            <p className="script-accent mb-2 text-3xl text-terracotta">{kicker}</p>
          </Reveal>
        )}
        <Reveal delay={0.05}>
          <h1 className="mx-auto max-w-4xl font-serif text-display font-light leading-[0.98] text-prune text-balance">
            {title}
          </h1>
        </Reveal>
        {intro && (
          <Reveal delay={0.1}>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-prune/70 text-pretty">
              {intro}
            </p>
          </Reveal>
        )}
        {children && (
          <Reveal delay={0.15}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">{children}</div>
          </Reveal>
        )}
      </div>
    </header>
  );
}
