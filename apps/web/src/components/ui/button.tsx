import * as React from "react";
import { cn } from "@calque/ui";

/**
 * Primitives d'interface écrites à la main plutôt qu'installées via la CLI
 * shadcn (qui exige un réseau et une invite interactive). Les conventions sont
 * identiques — `cn`, variantes, `className` fusionnable — pour qu'un
 * `npx shadcn add` ultérieur s'intègre sans friction.
 */
type Variant = "primaire" | "secondaire" | "discret";
type Taille = "md" | "lg";

const variants: Record<Variant, string> = {
  primaire:
    "bg-bleu-600 text-white hover:bg-bleu-700 disabled:bg-encre-300 disabled:text-papier-100",
  secondaire:
    "bg-white text-encre-900 border border-papier-300 hover:border-encre-300 hover:bg-papier-50",
  discret: "bg-transparent text-encre-700 hover:bg-papier-200",
};

const tailles: Record<Taille, string> = {
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  taille?: Taille;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primaire", taille = "md", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-calque)] font-medium",
        "transition-colors duration-150",
        "disabled:cursor-not-allowed disabled:opacity-70",
        variants[variant],
        tailles[taille],
        className,
      )}
      {...props}
    />
  );
});
