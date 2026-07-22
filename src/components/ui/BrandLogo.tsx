import { cn } from "@/lib/utils";

/**
 * GJS GROUP lockup. Vector recreation drawn with `currentColor`, so contrast is
 * automatic: white on dark surfaces, ink on the light footer. `size` is the
 * height of the GJS mark in px.
 *
 * SWAP: when the official file lands, drop it in /public and replace the <svg>
 * below with `<img src="/gjs-group.svg" className="h-[1em] w-auto" />` (add
 * `className="[filter:invert(1)]"` in dark contexts if the artwork is black).
 */
export function BrandLogo({
  size = 30,
  showGroup = true,
  className,
}: {
  size?: number;
  showGroup?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex flex-col items-center leading-none", className)}
      style={{ fontSize: size }}
      aria-label="GJS Group"
    >
      <svg
        viewBox="-20 95 730 445"
        role="img"
        style={{ height: "1em", width: "auto", display: "block" }}
        fill="none"
        stroke="currentColor"
        strokeWidth={92}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M268 214 A120 152 0 1 0 268 386" />
        <path d="M268 300 L168 300" />
        <path d="M374 150 L374 332 A88 88 0 0 1 198 332" />
        <path d="M648 250 C648 198 604 186 560 190 C500 195 466 222 466 266 C466 316 520 330 568 344 C620 360 640 390 634 428 C628 476 582 486 540 480 C498 474 474 450 472 416" />
      </svg>
      {showGroup && (
        <span
          className="font-[family-name:var(--font-sans)] font-medium uppercase"
          style={{
            fontSize: "0.2em",
            letterSpacing: "0.42em",
            textIndent: "0.42em",
            marginTop: "0.62em",
          }}
        >
          Group
        </span>
      )}
    </span>
  );
}
