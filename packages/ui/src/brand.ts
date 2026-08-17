/**
 * Identité de marque Calque (§2) — sobre, artisanale, rassurante, française.
 * Pas de dégradé violet, pas d'esthétique « IA générique ».
 *
 * Source de vérité pour les usages qui ne passent pas par CSS : emails
 * transactionnels, images Open Graph, thème par défaut de l'éditeur.
 * Les mêmes valeurs sont déclarées en tokens CSS dans `theme.css`.
 */
export const BRAND = {
  name: "Calque",
  tagline: "Vos clients modifient leur site. Vous gardez le code.",
  colors: {
    /** Encre — texte et surfaces sombres. */
    ink: "#151A21",
    /** Papier — fond principal. */
    paper: "#FAF8F4",
    /** Accent froid — actions primaires, liens. */
    blue: "#2F5CE0",
    /** Accent chaud — mises en avant, états d'attention. */
    amber: "#E0703A",
  },
  fonts: {
    ui: "Inter",
    display: "Instrument Serif",
  },
} as const;

export type BrandColor = keyof typeof BRAND.colors;
