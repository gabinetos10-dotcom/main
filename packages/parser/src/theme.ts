import postcss, { type ChildNode, type Declaration } from "postcss";
import type { Theme, ThemeFont, ThemeToken, TokenType } from "@calque/blueprint";
import { computeFontId, computeTokenId } from "@calque/blueprint/ids";
import { humanize } from "./labels";

/**
 * Jetons de design et polices (§9.4).
 *
 * Le client n'édite jamais du CSS : il édite des jetons. Le CSS d'origine n'est
 * jamais modifié — la publication ajoute un `:root{}` de surcharge chargé en
 * dernier. Ce module ne fait donc que *lire*.
 */

export interface StyleSheet {
  path: string;
  css: string;
}

export interface ThemeAnalysis {
  theme: Theme;
  /** Vrai quand le site ne déclare aucune variable CSS (§9.4, repli par comptage). */
  noCssVariables: boolean;
}

const SELECTEURS_THEME = /^(?::root|html|\[data-theme[^\]]*\])$/u;

const COULEUR =
  /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|color-mix)\(|^(?:transparent|currentcolor)$/iu;
const LONGUEUR = /^-?[\d.]+(?:px|rem|em|%|vh|vw|ch|ex|pt|cm|mm|fr)$/u;

/** Couleurs écrites en dur dans une déclaration, à compter faute de variables. */
const COULEUR_LITTERALE = /#[0-9a-fA-F]{3,8}\b|(?:rgba?|hsla?)\([^)]*\)/gu;

/** Typage d'un jeton : le nom guide, la valeur tranche. */
export function tokenType(nom: string, valeur: string): TokenType {
  const indice = nom.toLowerCase();
  if (/ombre|shadow/u.test(indice)) return "shadow";
  if (/rayon|radius|arrondi/u.test(indice)) return "radius";
  if (/police|font(?!-size)/u.test(indice)) return "font-family";
  if (COULEUR.test(valeur.trim())) return "color";
  if (LONGUEUR.test(valeur.trim())) return "length";
  if (valeur.includes(",") && /["']|serif|sans-serif|monospace/u.test(valeur)) {
    return "font-family";
  }
  return "length";
}

/** `--couleur-primaire` → « Couleur primaire ». */
function labelDuJeton(cssVar: string): string {
  return humanize(cssVar.replace(/^--/u, "")) || cssVar;
}

function estDeclaration(noeud: ChildNode): noeud is Declaration {
  return noeud.type === "decl";
}

/** Familles citées dans une valeur `font-family`, dans l'ordre de la pile. */
export function familiesFromValue(valeur: string): string[] {
  return valeur
    .split(",")
    .map((morceau) => morceau.trim().replace(/^["']|["']$/gu, ""))
    .filter((famille) => famille.length > 0 && !famille.startsWith("var("));
}

const FAMILLES_SYSTEME = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "inherit",
  "initial",
  "unset",
  "-apple-system",
  "blinkmacsystemfont",
]);

function estFamilleUtile(famille: string): boolean {
  return !FAMILLES_SYSTEME.has(famille.toLowerCase());
}

/** `https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400…` */
export function googleFontFamilies(url: string): string[] {
  const familles: string[] = [];
  const requete = url.split("?")[1];
  if (requete === undefined) return familles;

  for (const paire of requete.split("&")) {
    const [cle, valeur] = paire.split("=");
    if (cle !== "family" || valeur === undefined) continue;
    const famille = decodeURIComponent(valeur.split(":")[0] ?? "").replace(/\+/gu, " ");
    if (famille.length > 0) familles.push(famille);
  }
  return familles;
}

function roleDepuisSelecteur(selecteur: string): ThemeFont["role"] {
  if (/\bh[1-6]\b|titre|title|heading/u.test(selecteur)) return "headings";
  if (/^(?:body|html|\*)\b/u.test(selecteur.trim())) return "body";
  return "inconnu";
}

export function analyzeTheme(feuilles: readonly StyleSheet[]): ThemeAnalysis {
  const jetons = new Map<string, ThemeToken>();
  const polices = new Map<string, ThemeFont>();
  const couleurs = new Map<string, number>();
  const usages = new Map<string, number>();

  const ajouterPolice = (
    famille: string,
    source: ThemeFont["source"],
    role: ThemeFont["role"],
  ): void => {
    if (!estFamilleUtile(famille)) return;
    const existante = polices.get(famille);
    if (existante === undefined) {
      polices.set(famille, { id: computeFontId(famille), family: famille, source, role });
    } else if (existante.role === "inconnu" && role !== "inconnu") {
      polices.set(famille, { ...existante, role });
    }
  };

  for (const feuille of feuilles) {
    let racine;
    try {
      racine = postcss.parse(feuille.css, { from: feuille.path });
    } catch {
      // Une feuille illisible ne doit pas faire échouer l'ingestion : le site
      // reste analysable, seul son thème est incomplet.
      continue;
    }

    racine.walkAtRules((regle) => {
      if (regle.name === "import") {
        for (const famille of googleFontFamilies(regle.params)) {
          ajouterPolice(famille, "google", "inconnu");
        }
      }
      if (regle.name === "font-face") {
        for (const noeud of regle.nodes ?? []) {
          if (estDeclaration(noeud) && noeud.prop.toLowerCase() === "font-family") {
            for (const famille of familiesFromValue(noeud.value)) {
              ajouterPolice(famille, "local", "inconnu");
            }
          }
        }
      }
    });

    racine.walkRules((regle) => {
      const cible = regle.selectors.some((selecteur) =>
        SELECTEURS_THEME.test(selecteur.trim()),
      );

      for (const noeud of regle.nodes ?? []) {
        if (!estDeclaration(noeud)) continue;
        const propriete = noeud.prop.trim();
        const valeur = noeud.value.trim();

        if (cible && propriete.startsWith("--")) {
          if (!jetons.has(propriete)) {
            jetons.set(propriete, {
              id: computeTokenId(propriete),
              cssVar: propriete,
              type: tokenType(propriete, valeur),
              value: valeur,
              label: labelDuJeton(propriete),
              usageCount: 0,
              inferred: false,
            });
          }
        }

        if (propriete.toLowerCase() === "font-family") {
          const familles = familiesFromValue(valeur);
          const role = roleDepuisSelecteur(regle.selector);
          const principale = familles[0];
          if (principale !== undefined) ajouterPolice(principale, "local", role);
        }

        for (const trouve of valeur.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/gu)) {
          const nom = trouve[1] as string;
          usages.set(nom, (usages.get(nom) ?? 0) + 1);
        }

        if (!propriete.startsWith("--")) {
          for (const trouve of valeur.matchAll(COULEUR_LITTERALE)) {
            const couleur = trouve[0].toLowerCase().replace(/\s+/gu, "");
            couleurs.set(couleur, (couleurs.get(couleur) ?? 0) + 1);
          }
        }
      }
    });

    // Les feuilles Tailwind ne déclarent rien : les polices vivent dans le HTML.
    racine.walkDecls("font", (noeud) => {
      const familles = familiesFromValue(noeud.value.split(/\s+/u).slice(-1)[0] ?? "");
      const principale = familles[0];
      if (principale !== undefined) ajouterPolice(principale, "local", "inconnu");
    });
  }

  const listeJetons = [...jetons.values()].map((jeton) => ({
    ...jeton,
    usageCount: usages.get(jeton.cssVar) ?? 0,
  }));

  const noCssVariables = listeJetons.length === 0;

  // §9.4 : sans variable CSS, on propose les six couleurs les plus fréquentes.
  // `inferred: true` — le remplacement global reste un choix explicite de l'admin.
  if (noCssVariables) {
    const frequentes = [...couleurs.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 6);

    for (const [index, [couleur, occurrences]] of frequentes.entries()) {
      const nom = `--calque-couleur-${index + 1}`;
      listeJetons.push({
        id: computeTokenId(`${couleur}#${index}`),
        cssVar: nom,
        type: "color",
        value: couleur,
        label: `Couleur du site ${index + 1}`,
        usageCount: occurrences,
        inferred: true,
      });
    }
  }

  return {
    theme: { tokens: listeJetons, fonts: [...polices.values()] },
    noCssVariables,
  };
}
