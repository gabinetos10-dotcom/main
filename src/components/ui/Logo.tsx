"use client";

import { useEasterEgg } from "@/components/providers/EasterEgg";
import { BrandLogo } from "./BrandLogo";
import { cn } from "@/lib/utils";

export function Logo({ className, onClick }: { className?: string; onClick?: () => void }) {
  const { registerLogoClick } = useEasterEgg();
  return (
    <button
      onClick={() => {
        registerLogoClick();
        onClick?.();
      }}
      aria-label="GJS Group — accueil (cliquez 5× pour une surprise)"
      className={cn(
        "group flex items-center outline-none transition-opacity duration-300 hover:opacity-80",
        className
      )}
    >
      <BrandLogo size={26} showGroup={false} />
    </button>
  );
}
