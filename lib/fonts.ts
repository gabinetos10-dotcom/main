import { Fraunces, Ephesis, Hanken_Grotesk } from "next/font/google";

/**
 * Serif d'affichage — Fraunces en variable, axes optiques « soft/organic ».
 * L'italique est réservée aux mots-clés émotionnels.
 */
export const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT", "WONK"],
  variable: "--font-fraunces",
});

/** Calligraphie — Ephesis, à doser pour les moments d'émotion uniquement. */
export const ephesis = Ephesis({
  subsets: ["latin"],
  display: "swap",
  weight: "400",
  variable: "--font-ephesis",
});

/** Sans humaniste — Hanken Grotesk, corps de texte, UI, menus. */
export const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-hanken",
});
