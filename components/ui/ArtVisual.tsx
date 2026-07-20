import { cn } from "@/lib/utils";

/**
 * Visuel art-dirigé — PLACEHOLDER en attendant les vraies photographies.
 * // [À REMPLACER] par les photos © Yann Bader / © Cindy Gonzalez / © Lydia Torresan.
 * Compose un champ de dégradé + soleil + botanique en trait fin, on-brand,
 * pour ne jamais afficher un visuel « cassé ».
 */
export default function ArtVisual({
  hues = ["var(--blush)", "var(--soleil)"],
  seed = 0,
  className,
  motif = "sun",
}: {
  hues?: [string, string];
  seed?: number;
  className?: string;
  motif?: "sun" | "arch" | "sprig";
}) {
  const [a, b] = hues;
  return (
    <div
      className={cn("relative h-full w-full overflow-hidden", className)}
      style={{
        background: `linear-gradient(150deg, color-mix(in oklab, ${a} 78%, var(--creme)), color-mix(in oklab, ${b} 70%, var(--ivoire)))`,
      }}
      aria-hidden
    >
      {/* Soleil / lumière chaude */}
      <div
        className="absolute rounded-full blur-2xl"
        style={{
          width: "60%",
          height: "60%",
          top: seed % 2 ? "-15%" : "auto",
          bottom: seed % 2 ? "auto" : "-20%",
          right: seed % 3 ? "-10%" : "auto",
          left: seed % 3 ? "auto" : "-10%",
          background: `radial-gradient(circle, color-mix(in oklab, ${b} 85%, white), transparent 65%)`,
          opacity: 0.75,
        }}
      />

      <svg viewBox="0 0 400 500" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        {motif === "arch" && (
          <path
            d="M120 460 L120 220 A80 80 0 0 1 280 220 L280 460"
            fill="none"
            stroke="color-mix(in oklab, var(--or) 55%, transparent)"
            strokeWidth="1.5"
          />
        )}
        {motif === "sun" && (
          <>
            <circle cx="300" cy="120" r="54" fill="none" stroke="color-mix(in oklab, var(--or) 50%, transparent)" strokeWidth="1.4" />
            {Array.from({ length: 12 }).map((_, i) => {
              const ang = (i / 12) * Math.PI * 2;
              return (
                <line
                  key={i}
                  x1={300 + Math.cos(ang) * 66}
                  y1={120 + Math.sin(ang) * 66}
                  x2={300 + Math.cos(ang) * 80}
                  y2={120 + Math.sin(ang) * 80}
                  stroke="color-mix(in oklab, var(--or) 45%, transparent)"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              );
            })}
          </>
        )}
        {/* Sprig botanique en bas */}
        <g stroke="color-mix(in oklab, var(--sauge) 80%, var(--prune))" strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.8">
          <path d="M60 500 C70 440 55 400 80 350" />
          {[470, 440, 410, 385].map((y, i) => {
            const s = i % 2 ? 1 : -1;
            return <path key={y} d={`M${68 + i} ${y} C${68 + s * 24} ${y - 16}, ${68 + s * 30} ${y + 4}, ${68 + i} ${y}`} />;
          })}
        </g>
      </svg>

      {/* Grain léger */}
      <div
        className="absolute inset-0 opacity-[0.12] mix-blend-soft-light"
        style={{ backgroundImage: "var(--grain-url)", backgroundSize: "180px" }}
      />
    </div>
  );
}
