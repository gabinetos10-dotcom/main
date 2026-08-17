import * as React from "react";
import { cn } from "@calque/ui";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-10 w-full rounded-[var(--radius-calque)] border border-papier-300 bg-white px-3",
          "text-sm text-encre-900 placeholder:text-encre-500",
          "transition-colors focus:border-bleu-500 focus:outline-none",
          "aria-[invalid=true]:border-erreur-600",
          className,
        )}
        {...props}
      />
    );
  },
);
