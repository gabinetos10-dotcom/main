import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Marquee infini en CSS pur (deux copies, translateX(-50%)).
 * S'arrête automatiquement en motion réduite (media query globale).
 */
export function Marquee({
  children,
  speed = 42,
  reverse = false,
  className,
}: {
  children: ReactNode;
  speed?: number;
  reverse?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden", className)}>
      <div
        className="animate-marquee flex w-max items-center"
        style={
          {
            "--marquee-duration": `${speed}s`,
            animationDirection: reverse ? "reverse" : undefined,
          } as CSSProperties
        }
      >
        <div className="flex items-center">{children}</div>
        <div className="flex items-center" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
