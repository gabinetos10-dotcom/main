import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";

export function Section({
  id,
  children,
  className,
  container = true,
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
  container?: boolean;
}) {
  return (
    <section id={id} className={cn("relative py-20 sm:py-28 lg:py-32", className)}>
      {container ? (
        <div className="mx-auto max-w-[86rem] px-5 sm:px-8">{children}</div>
      ) : (
        children
      )}
    </section>
  );
}

export function SectionHeading({
  kicker,
  title,
  intro,
  align = "left",
  className,
  titleClassName,
}: {
  kicker?: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
  titleClassName?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-3xl",
        align === "center" && "mx-auto text-center",
        className
      )}
    >
      {kicker && (
        <Reveal>
          <p className={cn("kicker mb-4", align === "center" && "flex justify-center")}>
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-px w-6 bg-terracotta/60" />
              {kicker}
            </span>
          </p>
        </Reveal>
      )}
      <Reveal delay={0.05}>
        <h2
          className={cn(
            "font-serif text-display-sm font-light leading-[1.02] text-prune text-balance",
            titleClassName
          )}
        >
          {title}
        </h2>
      </Reveal>
      {intro && (
        <Reveal delay={0.1}>
          <p className="mt-5 text-base leading-relaxed text-prune/70 text-pretty">{intro}</p>
        </Reveal>
      )}
    </div>
  );
}
