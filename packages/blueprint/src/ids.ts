import { createHash } from "node:crypto";

/**
 * Calcul des identifiants stables (§9.1).
 *
 * ⚠️ Lire ADR-002 avant de modifier quoi que ce soit ici.
 *
 * `fieldId` est *dérivable* mais pas *dérivé à la lecture* : il est calculé une
 * fois à l'ingestion, persisté, puis traité comme opaque. Le recalcul ne sert
 * qu'à proposer un mapping lors d'une re-livraison de design (§8). Deux raisons :
 *
 *  1. `domPath` est positionnel. Insérer une section en tête de page décale tous
 *     les `nth-of-type` en aval et changerait l'identité de chaque champ.
 *  2. La duplication de bloc (§13) produit des identifiants préfixés `dup_` qui
 *     ne sont, par construction, dérivables d'aucun `domPath` du source.
 */

export function sha1(input: string): string {
  return createHash("sha1").update(input, "utf8").digest("hex");
}

/** Normalisation avant hachage de contenu : espaces compactés, bords rognés. */
export function normalizeText(input: string): string {
  return input.replace(/\s+/gu, " ").trim();
}

export function computeContentHash(text: string): string {
  return sha1(normalizeText(text)).slice(0, 16);
}

export function computeFieldId(pagePath: string, domPath: string): string {
  return `fld_${sha1(`${pagePath}::${domPath}`).slice(0, 10)}`;
}

export function computeBlockId(pagePath: string, domPath: string): string {
  return `blk_${sha1(`${pagePath}::${domPath}`).slice(0, 10)}`;
}

export function computeCollectionId(pagePath: string, containerPath: string): string {
  return `col_${sha1(`${pagePath}::${containerPath}`).slice(0, 10)}`;
}

export function computeTokenId(cssVar: string): string {
  return `tok_${sha1(cssVar).slice(0, 8)}`;
}

export function computeFontId(family: string): string {
  return `fnt_${sha1(family).slice(0, 8)}`;
}

/**
 * Identifiant d'un champ né d'une duplication de bloc. Volontairement non
 * dérivable d'un `domPath` : le bloc dupliqué n'existe pas dans le source.
 */
export function duplicatedFieldId(sourceFieldId: string, duplicateNonce: string): string {
  return `dup_${sha1(`${sourceFieldId}::${duplicateNonce}`).slice(0, 10)}`;
}

export function isDuplicatedId(id: string): boolean {
  return id.startsWith("dup_");
}

/**
 * Empreinte structurelle d'un élément (§9.1).
 *
 * Les classes sont triées pour que l'ordre d'écriture dans le HTML n'influe pas.
 * `shapeHash` décrit les enfants sur deux niveaux de profondeur.
 */
export function computeFingerprint(input: {
  tagName: string;
  classes: readonly string[];
  shapeHash: string;
}): string {
  const classes = [...input.classes].sort().join(".");
  return `${input.tagName}|${classes}|${input.shapeHash}`;
}

/** Décompose une empreinte en ses trois segments, pour comparaison floue. */
export function splitFingerprint(
  fingerprint: string,
): { tagName: string; classes: string[]; shapeHash: string } | null {
  const parts = fingerprint.split("|");
  if (parts.length !== 3) return null;
  const [tagName, classes, shapeHash] = parts as [string, string, string];
  return {
    tagName,
    classes: classes.length > 0 ? classes.split(".") : [],
    shapeHash,
  };
}

/**
 * Similarité entre deux empreintes, dans [0..1].
 *
 * L'égalité stricte du §9.3 produit des faux négatifs sur le cas le plus courant
 * du vibe coding : une grille dont une carte porte un badge « Populaire » et une
 * autre pas. Le regroupement se fait donc sur un seuil (défaut 0,75), pas sur
 * une égalité. Le seuil est calibré sur les fixtures en P2.
 *
 * Pondération : la balise doit correspondre (sinon 0), puis Jaccard sur les
 * classes (60 %) et égalité de forme (40 %).
 */
export function fingerprintSimilarity(a: string, b: string): number {
  if (a === b) return 1;

  const left = splitFingerprint(a);
  const right = splitFingerprint(b);
  if (left === null || right === null) return 0;
  if (left.tagName !== right.tagName) return 0;

  const setA = new Set(left.classes);
  const setB = new Set(right.classes);
  const union = new Set([...setA, ...setB]);

  let intersectionSize = 0;
  for (const cls of setA) {
    if (setB.has(cls)) intersectionSize += 1;
  }

  const classScore = union.size === 0 ? 1 : intersectionSize / union.size;
  const shapeScore = left.shapeHash === right.shapeHash ? 1 : 0;

  return classScore * 0.6 + shapeScore * 0.4;
}

/** Seuil par défaut de regroupement d'une collection (§9.3, risque 5). */
export const DEFAULT_COLLECTION_SIMILARITY_THRESHOLD = 0.75;
