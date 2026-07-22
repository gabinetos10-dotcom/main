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
  primary:
    "text-white bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] shadow-[0_10px_40px_-12px_rgba(123,97,255,0.7)] hover:shadow-[0_16px_50px_-10px_rgba(45,226,230,0.6)]",
  ghost:
    "text-[var(--color-text)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-strong)] border border-[var(--color-line)]",
  outline:
    "text-[var(--color-text)] bg-transparent border-gradient hover:bg-[var(--color-surface)]",
};

const base =
  "relative inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium tracking-wide transition-[box-shadow,background-color,transform] duration-500 ease-[var(--ease-out-expo)] will-change-transform select-none";

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
