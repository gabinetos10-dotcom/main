/**
 * Palette GJS — source de vérité partagée entre CSS (styles/globals.css),
 * la scène three.js et les canvas 2D (mini-jeux, matrix rain).
 */
export const PALETTE = {
  ink: "#04070e",
  abyss: "#071022",
  deep: "#0d1b33",
  navy: "#142e57",
  yale: "#1b4079",
  royal: "#2b5da8",
  air: "#4d7c8a",
  cambridge: "#7f9c96",
  sage: "#8fad88",
  mindaro: "#cbdf90",
  lumen: "#e6f4b8",
  mist: "#eaf3ee",
  alert: "#e07a5f",
} as const;

export type PaletteKey = keyof typeof PALETTE;
