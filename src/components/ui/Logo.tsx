"use client";

import { useEasterEgg } from "@/components/providers/EasterEgg";
import { cn } from "@/lib/utils";

export function Logo({ className, onClick }: { className?: string; onClick?: () => void }) {
  const { registerLogoClick } = useEasterEgg();
  return (
    <button
      onClick={() => {
        registerLogoClick();
        onClick?.();
      }}
      aria-label="GJS — accueil (cliquez 5× pour une surprise)"
      className={cn(
        "group flex items-center gap-2.5 outline-none",
        className
      )}
    >
      <span className="relative grid h-9 w-9 place-items-center">
        <svg width="36" height="36" viewBox="0 0 100 100" fill="none">
          <defs>
            <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" />
              <stop offset="100%" stopColor="var(--color-accent-2)" />
            </linearGradient>
          </defs>
          <circle
            cx="50"
            cy="50"
            r="44"
            stroke="url(#logo-grad)"
            strokeWidth="2"
            className="opacity-70 transition-opacity duration-500 group-hover:opacity-100"
          />
          <path
            d="M62 34 H42 a10 10 0 0 0 -10 10 v12 a10 10 0 0 0 10 10 h8 a10 10 0 0 0 10 -10 v-6 H50"
            stroke="url(#logo-grad)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
        <span className="absolute inset-0 -z-10 rounded-full opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-60 bg-[radial-gradient(circle,var(--color-accent),transparent_70%)]" />
      </span>
      <span className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
        GJS
      </span>
    </button>
  );
}
