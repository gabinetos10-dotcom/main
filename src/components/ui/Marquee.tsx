"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Infinite horizontal marquee. Renders two copies and translates -50% so the
 * loop is seamless. Speed is seconds per full cycle.
 */
export function Marquee({
  children,
  speed = 22,
  reverse = false,
  className,
}: {
  children: ReactNode;
  speed?: number;
  reverse?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full overflow-hidden", className)}>
      <div
        className="flex shrink-0 items-center"
        style={{
          animation: `marquee ${speed}s linear infinite`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        {children}
        {children}
      </div>
    </div>
  );
}
