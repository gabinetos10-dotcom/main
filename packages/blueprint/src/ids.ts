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

/**
 * Identifiant d'un item de collection.
 *
 * Dérivé de la collection et du rang, jamais d'un compteur de page : le contenu
 * du client est un dictionnaire plat à l'échelle du **site**, et deux pages
 * numérotant leurs items à partir de 1 verraient leurs valeurs se recouvrir.
 */
export function computeItemId(collectionId: string, index: number): string {
  return `itm_${sha1(`${collectionId}::${index}`).slice(0, 10)}`;
}

/** Identifiant d'un item ajouté par le client : sans rang dans le source. */
export function addedItemId(collectionId: string, nonce: string): string {
  return `itm_${sha1(`${collectionId}::ajout::${nonce}`).slice(0, 10)}`;
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
 * Le troisième segment décrit les enfants sur deux niveaux — `img+div(h3+p+a)` —
 * dans une forme *lisible et comparable*, non hachée : c'est ce qui permet la
 * similarité graduée ci-dessous. Un hachage ne se compare que par égalité, et
 * l'égalité est précisément ce qui échoue sur les collections hétérogènes.
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
 * Aplatit un descripteur de forme en multi-ensemble de balises.
 * `img+div(h3+p+a)` → `["img", "div", "h3", "p", "a"]`.
 */
export function shapeTokens(shape: string): string[] {
  const tokens: string[] = [];

  const decouper = (entree: string): void => {
    let profondeur = 0;
    let debut = 0;
    for (let i = 0; i <= entree.length; i += 1) {
      const caractere = entree[i];
      if (caractere === "(") profondeur += 1;
      else if (caractere === ")") profondeur -= 1;
      if ((caractere === "+" && profondeur === 0) || i === entree.length) {
        const morceau = entree.slice(debut, i);
        debut = i + 1;
        if (morceau.length === 0) continue;
        const ouvrante = morceau.indexOf("(");
        if (ouvrante === -1) {
          tokens.push(morceau);
        } else {
          tokens.push(morceau.slice(0, ouvrante));
          decouper(morceau.slice(ouvrante + 1, morceau.lastIndexOf(")")));
        }
      }
    }
  };

  decouper(shape);
  return tokens;
}

/** Indice de Sørensen-Dice sur deux multi-ensembles. Deux vides sont identiques. */
function dice(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const restants = new Map<string, number>();
  for (const jeton of b) restants.set(jeton, (restants.get(jeton) ?? 0) + 1);

  let communs = 0;
  for (const jeton of a) {
    const disponible = restants.get(jeton) ?? 0;
    if (disponible > 0) {
      communs += 1;
      restants.set(jeton, disponible - 1);
    }
  }

  return (2 * communs) / (a.length + b.length);
}

function jaccard(a: readonly string[], b: readonly string[]): number {
  const gauche = new Set(a);
  const droite = new Set(b);
  const union = new Set([...gauche, ...droite]);
  if (union.size === 0) return 1;

  let intersection = 0;
  for (const valeur of gauche) if (droite.has(valeur)) intersection += 1;
  return intersection / union.size;
}

/** Similarité de forme seule, dans [0..1]. Sert de garde-fou au regroupement. */
export function fingerprintShapeSimilarity(a: string, b: string): number {
  const gauche = splitFingerprint(a);
  const droite = splitFingerprint(b);
  if (gauche === null || droite === null) return 0;
  return dice(shapeTokens(gauche.shapeHash), shapeTokens(droite.shapeHash));
}

/**
 * Similarité entre deux empreintes, dans [0..1].
 *
 * L'égalité stricte du §9.3 produit des faux négatifs sur le cas le plus courant
 * du vibe coding : une grille dont une carte porte un badge « Populaire » et une
 * autre pas. Le regroupement se fait donc sur un seuil, pas sur une égalité.
 *
 * Pondération : la balise doit correspondre (sinon 0), puis **forme 60 %,
 * classes 40 %**. La forme pèse davantage parce qu'une classe modificatrice
 * (`carte--populaire`) est le bruit le plus fréquent, alors qu'une forme
 * franchement différente signale un composant réellement différent.
 *
 * Seuil et pondération calibrés en P2 sur les trois fixtures : voir
 * `packages/parser/test/collections.test.ts`, qui gèle les cas limites.
 */
export function fingerprintSimilarity(a: string, b: string): number {
  if (a === b) return 1;

  const gauche = splitFingerprint(a);
  const droite = splitFingerprint(b);
  if (gauche === null || droite === null) return 0;
  if (gauche.tagName !== droite.tagName) return 0;

  const classes = jaccard(gauche.classes, droite.classes);
  const forme = dice(shapeTokens(gauche.shapeHash), shapeTokens(droite.shapeHash));

  return classes * 0.4 + forme * 0.6;
}

/**
 * Seuil de regroupement d'une collection (§9.3, risque 5).
 *
 * 0,65 est le plus haut seuil qui regroupe les trois cartes de la fixture 01
 * — dont une porte un badge et une autre n'a pas d'image — sans regrouper les
 * deux colonnes d'une mise en page en `.deux-colonnes`.
 */
export const DEFAULT_COLLECTION_SIMILARITY_THRESHOLD = 0.65;

/**
 * Plancher de similarité de forme. Deux blocs peuvent atteindre le seuil global
 * par leurs seules classes — souvent absentes des deux côtés, donc parfaitement
 * « identiques » — sans se ressembler du tout. Ce plancher l'interdit.
 *
 * 0,6 sépare exactement, sur les fixtures, la galerie dont un item utilise
 * `<img>` et les autres `<picture>` (0,67, à regrouper) de deux paragraphes
 * voisins dont l'un porte des liens (0,5, à ne pas regrouper).
 */
export const DEFAULT_COLLECTION_SHAPE_FLOOR = 0.6;
