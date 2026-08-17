import * as React from "react";
import { cn } from "@calque/ui";

export const Label = React.forwardRef<HTMLLabelElement, React.ComponentProps<"label">>(
  function Label({ className, ...props }, ref) {
    return (
      <label
        ref={ref}
        className={cn("text-sm font-medium text-encre-800", className)}
        {...props}
      />
    );
  },
);
