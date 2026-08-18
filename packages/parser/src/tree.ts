import { parse, type DefaultTreeAdapterTypes } from "parse5";
import type { SourceRange } from "@calque/blueprint";
import { computeFingerprint } from "@calque/blueprint/ids";
import { computeDomPath, type DomPathTree } from "./dom-path";

/**
 * Accès à l'arbre parse5. Tout le parser passe par ces fonctions : c'est le seul
 * endroit du package qui connaît la forme des nœuds, et §21 interdit d'atteindre
 * le HTML autrement que par parse5.
 */

export type Element = DefaultTreeAdapterTypes.Element;
export type Node = DefaultTreeAdapterTypes.Node;
export type Document = DefaultTreeAdapterTypes.Document;
export type TextNode = DefaultTreeAdapterTypes.TextNode;

export function parseHtml(html: string): Document {
  return parse(html, { sourceCodeLocationInfo: true });
}

export function isElement(node: Node): node is Element {
  return "tagName" in node;
}

function isTextNode(node: Node): node is TextNode {
  return node.nodeName === "#text";
}

export function childNodes(node: Node): readonly Node[] {
  return "childNodes" in node ? node.childNodes : [];
}

export function children(node: Node): Element[] {
  return childNodes(node).filter(isElement);
}

export function parentElement(node: Element): Element | null {
  const parent = node.parentNode;
  return parent !== null && isElement(parent) ? parent : null;
}

export function tagName(node: Node): string {
  return isElement(node) ? node.tagName.toLowerCase() : "";
}

export function getAttr(element: Element, name: string): string | undefined {
  return element.attrs.find((attribut) => attribut.name === name)?.value;
}

export function hasAttr(element: Element, name: string): boolean {
  return element.attrs.some((attribut) => attribut.name === name);
}

export function classList(element: Element): string[] {
  const brut = getAttr(element, "class") ?? "";
  return brut.split(/\s+/u).filter((classe) => classe.length > 0);
}

export function elementId(element: Element): string | undefined {
  const identifiant = getAttr(element, "id");
  return identifiant !== undefined && identifiant.length > 0 ? identifiant : undefined;
}

/* ── Texte ─────────────────────────────────────────────────────────────────── */

export function textContent(node: Node): string {
  if (isTextNode(node)) return node.value;
  let texte = "";
  for (const enfant of childNodes(node)) texte += textContent(enfant);
  return texte;
}

/** Texte propre au nœud, hors éléments enfants. */
export function ownText(node: Node): string {
  let texte = "";
  for (const enfant of childNodes(node)) {
    if (isTextNode(enfant)) texte += enfant.value;
  }
  return texte;
}

export function normalized(texte: string): string {
  // L'espace insécable est écrit en échappement : le vibe coding sème des
  // `&nbsp;` partout, et un U+00A0 littéral dans une source est invisible.
  return texte.replace(/[\s\u00A0\u202F]+/gu, " ").trim();
}

/* ── Chemin, empreinte ─────────────────────────────────────────────────────── */

export const parse5Tree: DomPathTree<Element> = {
  tagName: (node) => (isElement(node) ? node.tagName.toLowerCase() : null),
  parentOf: (node) => parentElement(node),
  childrenOf: (node) => children(node),
};

export function domPathOf(element: Element): string {
  return computeDomPath(element, parse5Tree);
}

/**
 * Descripteur de forme sur deux niveaux : `img+div(h3+p+a)`.
 *
 * Lisible à dessein — il finit dans `itemSignature`, que l'admin voit dans le
 * rapport d'ingestion — et comparable jeton à jeton, ce dont dépend tout le
 * regroupement flou du §9.3.
 */
export function shapeDescriptor(element: Element, profondeur = 2): string {
  if (profondeur === 0) return "";
  return children(element)
    .map((enfant) => {
      const sous = shapeDescriptor(enfant, profondeur - 1);
      return sous.length > 0 ? `${tagName(enfant)}(${sous})` : tagName(enfant);
    })
    .join("+");
}

export function fingerprintOf(element: Element): string {
  return computeFingerprint({
    tagName: tagName(element),
    classes: classList(element),
    shapeHash: shapeDescriptor(element),
  });
}

/* ── Étendues dans le source ───────────────────────────────────────────────── */

export function elementRange(element: Element): SourceRange | undefined {
  const localisation = element.sourceCodeLocation;
  if (!localisation) return undefined;
  return {
    startOffset: localisation.startOffset,
    endOffset: localisation.endOffset,
  };
}

/**
 * Étendue du contenu intérieur : entre la fin de la balise ouvrante et le début
 * de la fermante. C'est l'intervalle que le builder remplacera pour un texte.
 */
export function innerRange(element: Element): SourceRange | undefined {
  const localisation = element.sourceCodeLocation;
  if (!localisation?.startTag || !localisation.endTag) return undefined;
  return {
    startOffset: localisation.startTag.endOffset,
    endOffset: localisation.endTag.startOffset,
  };
}

/**
 * Étendue de la *valeur* d'un attribut, guillemets exclus.
 *
 * parse5 rapporte l'étendue de `src="a.jpg"` en entier ; le builder n'a le droit
 * de réécrire que `a.jpg`, sans quoi il changerait le style de guillemets et
 * casserait l'identité byte-à-byte.
 */
export function attributeValueRange(
  element: Element,
  name: string,
  source: string,
): SourceRange | undefined {
  const localisation = element.sourceCodeLocation?.attrs?.[name];
  if (!localisation) return undefined;

  const brut = source.slice(localisation.startOffset, localisation.endOffset);
  const egal = brut.indexOf("=");
  if (egal === -1) return undefined;

  let debut = localisation.startOffset + egal + 1;
  let fin = localisation.endOffset;
  const premier = source[debut];
  if (premier === '"' || premier === "'") {
    debut += 1;
    fin -= 1;
  }

  return { startOffset: debut, endOffset: fin };
}

/* ── Parcours ──────────────────────────────────────────────────────────────── */

export function findFirst(
  root: Node,
  predicat: (element: Element) => boolean,
): Element | null {
  for (const enfant of childNodes(root)) {
    if (isElement(enfant)) {
      if (predicat(enfant)) return enfant;
      const trouve = findFirst(enfant, predicat);
      if (trouve !== null) return trouve;
    }
  }
  return null;
}

export function findAll(root: Node, predicat: (element: Element) => boolean): Element[] {
  const trouves: Element[] = [];
  const parcourir = (noeud: Node): void => {
    for (const enfant of childNodes(noeud)) {
      if (!isElement(enfant)) continue;
      if (predicat(enfant)) trouves.push(enfant);
      parcourir(enfant);
    }
  };
  parcourir(root);
  return trouves;
}

export function findByTag(root: Node, balise: string): Element[] {
  return findAll(root, (element) => tagName(element) === balise);
}
