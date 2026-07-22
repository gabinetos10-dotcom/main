"use client";

import { forwardRef, type ReactNode } from "react";
import { Magnetic } from "./Magnetic";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "outline";

type BaseProps = {
  children: ReactNode;
  variant?: Variant;
  className?: string;
  strength?: number;
};

const variants: Record<Variant, string> = {
  // Solid warm‑paper pill with ink text — quietly premium, not a gradient.
  primary:
    "text-[var(--color-ink)] bg-[var(--color-highlight)] hover:bg-white shadow-[0_20px_50px_-24px_rgba(0,0,0,0.9)]",
  ghost:
    "text-[var(--color-text)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-strong)] border border-[var(--color-line)]",
  outline:
    "text-[var(--color-text)] bg-transparent border border-[var(--color-line-strong)] hover:border-[var(--color-text-dim)] hover:bg-[var(--color-surface)]",
};

const base =
  "relative inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-[0.9rem] font-medium tracking-tight transition-[box-shadow,background-color,border-color,transform,color] duration-500 ease-[var(--ease-out-expo)] will-change-transform select-none";

/** Magnetic call‑to‑action, polymorphic across button & anchor. */
export const MagneticButton = forwardRef<
  HTMLButtonElement,
  BaseProps & React.ButtonHTMLAttributes<HTMLButtonElement>
>(function MagneticButton(
  { children, variant = "primary", className, strength = 0.4, ...props },
  ref
) {
  return (
    <Magnetic strength={strength} className="inline-block">
      <button ref={ref} className={cn(base, variants[variant], className)} {...props}>
        <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
      </button>
    </Magnetic>
  );
});

export function MagneticLink({
  children,
  variant = "primary",
  className,
  strength = 0.4,
  href,
  ...props
}: BaseProps & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <Magnetic strength={strength} className="inline-block">
      <a href={href} className={cn(base, variants[variant], className)} {...props}>
        <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
      </a>
    </Magnetic>
  );
}
