/**
 * Aurore d'ambiance 100 % CSS — toujours présente sous la scène WebGL,
 * elle EST aussi le fallback (mobile bas de gamme, no-WebGL, motion réduite :
 * les dérives s'arrêtent via la media query globale, la composition reste).
 */
export function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
      {/* fond profond */}
      <div className="absolute inset-0 [background:radial-gradient(120%_90%_at_50%_0%,var(--color-abyss)_0%,var(--color-ink)_62%)]" />

      {/* nappes lumineuses (palette) */}
      <div className="absolute -left-[12%] -top-[18%] h-[58vmax] w-[58vmax] animate-drift-a rounded-full bg-yale/35 blur-[130px]" />
      <div className="absolute -right-[16%] top-[22%] h-[46vmax] w-[46vmax] animate-drift-b rounded-full bg-air/20 blur-[130px]" />
      <div className="absolute -bottom-[22%] left-[12%] h-[52vmax] w-[52vmax] animate-drift-c rounded-full bg-sage/15 blur-[150px]" />
      <div className="absolute bottom-[6%] right-[8%] h-[26vmax] w-[26vmax] animate-drift-a rounded-full bg-mindaro/[0.07] blur-[110px]" />

      {/* grille « instrument » masquée au centre */}
      <div className="absolute inset-0 opacity-[0.045] [background-image:linear-gradient(to_right,var(--color-mist)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-mist)_1px,transparent_1px)] [background-size:88px_88px] [mask-image:radial-gradient(ellipse_75%_60%_at_50%_40%,black_20%,transparent_75%)]" />

      {/* vignette */}
      <div className="absolute inset-0 [background:radial-gradient(95%_75%_at_50%_45%,transparent_55%,rgb(4_7_14/0.75)_100%)]" />
    </div>
  );
}
