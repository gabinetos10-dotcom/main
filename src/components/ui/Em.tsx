import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Serif‑italic emphasis word — the editorial signature that lifts a headline
 * out of "default sans" territory. Colour inherits by default; pass
 * `accent` for the ember highlight.
 */
export function Em({
  children,
  className,
  accent = false,
}: {
  children: ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <span className={cn("em", accent && "text-[var(--color-accent)]", className)}>
      {children}
    </span>
  );
}
