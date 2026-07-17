import localFont from "next/font/local";

/**
 * Typographies auto-hébergées (aucune requête tierce au runtime — RGPD friendly).
 * — Clash Display : display / titres (Fontshare Free Font License)
 * — Satoshi : corps de texte (Fontshare Free Font License)
 * — JetBrains Mono : accent code/data (SIL Open Font License)
 * Fichiers : /public/fonts
 */

export const clash = localFont({
  src: "../public/fonts/ClashDisplay-Variable.woff2",
  variable: "--font-clash",
  weight: "200 700",
  display: "swap",
});

export const satoshi = localFont({
  src: [
    { path: "../public/fonts/Satoshi-Variable.woff2", weight: "300 900", style: "normal" },
    { path: "../public/fonts/Satoshi-VariableItalic.woff2", weight: "300 900", style: "italic" },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

export const jetbrains = localFont({
  src: "../public/fonts/JetBrainsMono-Variable.woff2",
  variable: "--font-jetbrains",
  weight: "100 800",
  display: "swap",
});
