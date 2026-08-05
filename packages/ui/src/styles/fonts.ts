import localFont from 'next/font/local';

/**
 * Polices du back-office — direction « Atelier » (docs/DESIGN.md).
 *
 * ADR-012 : catalogue fermé, auto-hébergé. `next/font/local` exige des fichiers connus à la
 * compilation ; c'est ce qui donne le préchargement, l'absence de requête tierce et le CLS nul.
 * Les fichiers sont versionnés dans `./fonts/` et rafraîchis par `pnpm fonts:fetch`.
 *
 * Cabinet Grotesk et Switzer : Fontshare (Indian Type Foundry), libres d'usage commercial.
 * Martian Mono : SIL Open Font License.
 */

/** Titres. Interlettrage resserré : voir --ui-tracking-display. */
export const displayFont = localFont({
  src: [
    { path: './fonts/cabinet-grotesk-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/cabinet-grotesk-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--ui-font-display-loaded',
  display: 'swap',
  preload: true,
  fallback: ['ui-sans-serif', 'sans-serif'],
});

/** Interface dense : libellés, champs, tableaux. */
export const sansFont = localFont({
  src: [
    { path: './fonts/switzer-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/switzer-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/switzer-600.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--ui-font-sans-loaded',
  display: 'swap',
  preload: true,
  fallback: ['ui-sans-serif', 'sans-serif'],
});

/**
 * Valeurs numériques : dimensions, tokens, coordonnées.
 * C'est la signature de la direction « Atelier » — un inspecteur dont les chiffres s'alignent
 * lit comme un instrument, pas comme un formulaire.
 */
export const monoFont = localFont({
  src: [{ path: './fonts/martian-mono-latin.woff2', weight: '400 600', style: 'normal' }],
  variable: '--ui-font-mono-loaded',
  display: 'swap',
  preload: false,
  fallback: ['ui-monospace', 'monospace'],
});

/** À poser sur `<html>` : rend les trois familles disponibles via les tokens. */
export const fontVariables = [displayFont.variable, sansFont.variable, monoFont.variable].join(' ');
