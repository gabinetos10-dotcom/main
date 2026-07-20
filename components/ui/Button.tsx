"use client";

import Link from "next/link";
import { useRef } from "react";
import { useMagnetic } from "@/lib/hooks";
import { burstFromElement } from "@/lib/confetti";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost" | "ivory";

const variants: Record<Variant, string> = {
  // CTA principal — terracotta pour capter l'œil
  primary:
    "bg-terracotta text-ivoire shadow-bloom hover:shadow-[0_26px_70px_-30px_rgba(227,139,109,0.7)]",
  outline:
    "bg-transparent text-prune border border-or/50 hover:border-or hover:bg-ivoire/40",
  ghost: "bg-transparent text-prune hover:bg-blush/30",
  ivory: "bg-ivoire text-prune shadow-blush hover:shadow-bloom",
};

type ButtonProps = {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
  magnetic?: boolean;
  confettiOnHover?: boolean;
  strength?: number;
  href?: string;
  type?: "button" | "submit" | "reset";
  target?: string;
  rel?: string;
  ["aria-label"]?: string;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
};

/**
 * Bouton magnétique. Rendu en <Link> si `href`, sinon <button>.
 * Le CTA principal peut émettre un micro-burst de confettis au survol.
 */
export default function Button({
  children,
  variant = "primary",
  className,
  magnetic = true,
  confettiOnHover = false,
  strength = 0.3,
  href,
  type = "button",
  target,
  rel,
  onClick,
  ...aria
}: ButtonProps) {
  const magRef = useMagnetic<HTMLSpanElement>(magnetic ? strength : 0);
  const lastBurst = useRef(0);

  const onEnter = (e: React.MouseEvent) => {
    if (!confettiOnHover) return;
    const now = Date.now();
    if (now - lastBurst.current < 600) return; // throttle
    lastBurst.current = now;
    burstFromElement(e.currentTarget as HTMLElement, { count: 12, power: 6, spread: Math.PI });
  };

  const inner = (
    <span
      ref={magRef}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 rounded-pill px-7 py-3.5",
        "text-sm font-semibold tracking-wide transition-[box-shadow,transform,background-color,border-color] duration-300 ease-signature",
        "will-change-transform",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        target={target}
        rel={rel}
        onMouseEnter={onEnter}
        onClick={onClick}
        className="inline-flex"
        aria-label={aria["aria-label"]}
      >
        {inner}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onMouseEnter={onEnter}
      onClick={onClick}
      className="inline-flex"
      aria-label={aria["aria-label"]}
    >
      {inner}
    </button>
  );
}
