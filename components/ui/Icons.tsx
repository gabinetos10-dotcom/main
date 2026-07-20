import { cn } from "@/lib/utils";

type IconProps = { className?: string; strokeWidth?: number };

export function InstagramIcon({ className, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("h-5 w-5", className)} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth={strokeWidth} />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth={strokeWidth} />
      <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function ArrowRight({ className, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("h-4 w-4", className)} aria-hidden>
      <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowDown({ className, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("h-4 w-4", className)} aria-hidden>
      <path d="M12 4v15M6 13l6 6 6-6" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Sparkle({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("h-4 w-4", className)} aria-hidden>
      <path
        d="M12 3c.6 3.7 2.3 5.4 6 6-3.7.6-5.4 2.3-6 6-.6-3.7-2.3-5.4-6-6 3.7-.6 5.4-2.3 6-6Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Phone({ className, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("h-4 w-4", className)} aria-hidden>
      <path
        d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5L15.5 12l4 1.5v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.5 6.2 2 2 0 0 1 6.5 4Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MailIcon({ className, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("h-4 w-4", className)} aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PinIcon({ className, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("h-4 w-4", className)} aria-hidden>
      <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth={strokeWidth} />
    </svg>
  );
}

/** Petite fleur / nœud pour le bouton burger animé. */
export function BloomMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("h-6 w-6", className)} aria-hidden>
      <path d="M12 12c0-4 2-6 2-6s2 2 2 6-2 6-2 6-2-2-2-6Z" fill="currentColor" opacity="0.9" />
      <path d="M12 12c4 0 6 2 6 2s-2 2-6 2-6-2-6-2 2-2 6-2Z" fill="currentColor" opacity="0.7" />
    </svg>
  );
}
