"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Magnetic } from "./Magnetic";
import { useAnchor } from "@/hooks/useAnchor";

interface ButtonProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "ghost" | "lime-ghost";
  size?: "md" | "sm";
  className?: string;
  cursorLabel?: string;
  disabled?: boolean;
  magnetic?: boolean;
}

/**
 * Bouton signature : pastille avec balayage lumineux au survol,
 * magnétique sur desktop. `variant="primary"` = accent Mindaro (rare et précieux).
 */
export function Button({
  children,
  href,
  onClick,
  type = "button",
  variant = "primary",
  size = "md",
  className,
  cursorLabel,
  disabled,
  magnetic = true,
}: ButtonProps) {
  const onAnchor = useAnchor();

  const base = cn(
    "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-semibold transition-all duration-500",
    size === "md" ? "px-7 py-3.5 text-sm" : "px-5 py-2.5 text-xs",
    variant === "primary" &&
      "bg-mindaro text-ink hover:shadow-glow-sm focus-visible:shadow-glow-sm",
    variant === "ghost" &&
      "border border-mist/15 text-mist hover:border-mindaro/60 hover:text-mindaro",
    variant === "lime-ghost" &&
      "border border-mindaro/40 text-mindaro hover:bg-mindaro hover:text-ink",
    disabled && "pointer-events-none opacity-50",
    className
  );

  const inner = (
    <>
      {variant === "primary" && (
        <span
          aria-hidden
          className="absolute inset-0 -translate-x-full bg-lumen transition-transform duration-500 ease-(--ease-gjs) group-hover:translate-x-0"
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </>
  );

  const el = href ? (
    <a href={href} onClick={onAnchor(href)} className={base} data-cursor={cursorLabel}>
      {inner}
    </a>
  ) : (
    <button type={type} onClick={onClick} disabled={disabled} className={base} data-cursor={cursorLabel}>
      {inner}
    </button>
  );

  return magnetic ? <Magnetic>{el}</Magnetic> : el;
}
