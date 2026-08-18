import type { Blueprint, ContentData, TokenType } from "@calque/blueprint";

/**
 * `assets/calque-overrides.css` (§9.4, §15 étape 7).
 *
 * Le CSS d'origine n'est jamais modifié. Tout ce que le client change dans le
 * thème, et tout bloc qu'il masque, vit dans cette feuille chargée en dernier.
 * Elle est donc entièrement régénérable : la supprimer rend le site à son état
 * livré.
 */

export const OVERRIDES_PATH = "assets/calque-overrides.css";

/**
 * Valeurs acceptées pour un jeton, par type.
 *
 * Liste blanche plutôt que liste noire : une valeur qu'on ne sait pas valider
 * est rejetée, et le jeton garde la valeur du site. Une liste noire finit
 * toujours par laisser passer la forme à laquelle on n'avait pas pensé.
 */
const VALIDATEURS: Record<TokenType, RegExp> = {
  color:
    /^(?:#[0-9a-f]{3,8}|(?:rgb|rgba|hsl|hsla|oklch|lab|lch)\([0-9a-z.,%/\s-]+\)|[a-z]{3,20})$/iu,
  length: /^-?\d*\.?\d+(?:px|rem|em|%|vh|vw|ch|pt|cm|mm)?$/u,
  radius: /^(?:-?\d*\.?\d+(?:px|rem|em|%)?\s*){1,4}$/u,
  "font-family": /^[\w\s"',.-]{1,120}$/u,
  shadow: /^(?:inset\s+)?[-\d.a-z%\s(),/]{1,160}$/iu,
};

export function isValidTokenValue(type: TokenType, valeur: string): boolean {
  const propre = valeur.trim();
  if (propre.length === 0 || propre.length > 200) return false;
  if (/[{};<>]/u.test(propre)) return false;
  if (/@import|url\s*\(|expression\s*\(/iu.test(propre)) return false;
  return VALIDATEURS[type].test(propre);
}

export interface OverridesResult {
  css: string;
  /** Vrai quand il n'y a rien à écrire : la feuille n'est alors pas générée. */
  empty: boolean;
}

export function renderOverrides(
  blueprint: Blueprint,
  content: ContentData,
): OverridesResult {
  const lignes: string[] = [];

  const jetons = blueprint.theme.tokens
    .map((jeton) => {
      const valeur = content.theme[jeton.id];
      if (valeur === undefined) return null;
      if (!jeton.inferred && valeur === jeton.value) return null;
      if (!isValidTokenValue(jeton.type, valeur)) return null;
      return `  ${jeton.cssVar}: ${valeur.trim()};`;
    })
    .filter((ligne): ligne is string => ligne !== null);

  if (jetons.length > 0) {
    lignes.push("/* Couleurs et réglages choisis dans l'éditeur */");
    lignes.push(":root {", ...jetons, "}");
  }

  // Un bloc masqué n'est jamais supprimé du HTML source (§13) : il est caché.
  // Le `domPath` d'un bloc est déjà un sélecteur CSS valide.
  const masques: string[] = [];
  for (const page of blueprint.pages) {
    if (page.virtual) continue;
    for (const bloc of page.blocks) {
      if (content.blocks[bloc.id]?.hidden === true) masques.push(bloc.domPath);
    }
  }

  if (masques.length > 0) {
    lignes.push("");
    lignes.push("/* Sections masquées depuis l'éditeur */");
    for (const selecteur of [...new Set(masques)]) {
      lignes.push(`${selecteur} { display: none !important; }`);
    }
  }

  const css = lignes.length === 0 ? "" : `${lignes.join("\n")}\n`;
  return { css, empty: css.length === 0 };
}
