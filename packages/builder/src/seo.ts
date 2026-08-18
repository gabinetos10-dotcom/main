import type { Seo } from "@calque/blueprint";
import {
  attributeValueRange,
  findAll,
  findFirst,
  getAttr,
  innerRange,
  tagName,
  type Element,
  type Splice,
} from "@calque/parser";
import { escapeAttribute, escapeText, sanitizeUrl } from "./escape";

/**
 * Réécriture du SEO d'une page (§9.5, §15 étape 8).
 *
 * Quand la balise existe, on remplace sa valeur ; quand elle manque, on l'insère
 * juste avant `</head>`. Rien d'autre du `<head>` n'est touché : le reste est
 * technique et n'appartient pas au client.
 */

interface Cible {
  /** Clé de `Seo` concernée. */
  cle: keyof Seo;
  /** Retrouve la balise dans le `<head>`. */
  trouver: (head: Element) => Element | null;
  /** Attribut porteur de la valeur, ou `null` pour le contenu textuel. */
  attribut: string | null;
  /** Balise à écrire si elle n'existe pas encore. */
  creer: (valeur: string) => string;
  url?: boolean;
}

function meta(head: Element, nom: string, propriete = false): Element | null {
  return (
    findAll(head, (element) => {
      if (tagName(element) !== "meta") return false;
      const attribut = propriete ? "property" : "name";
      return getAttr(element, attribut)?.toLowerCase() === nom;
    })[0] ?? null
  );
}

function lien(head: Element, relation: string): Element | null {
  return (
    findAll(head, (element) => {
      if (tagName(element) !== "link") return false;
      return (getAttr(element, "rel") ?? "")
        .toLowerCase()
        .split(/\s+/u)
        .includes(relation);
    })[0] ?? null
  );
}

const CIBLES: Cible[] = [
  {
    cle: "title",
    trouver: (head) => findFirst(head, (element) => tagName(element) === "title"),
    attribut: null,
    creer: (valeur) => `<title>${escapeText(valeur)}</title>`,
  },
  {
    cle: "description",
    trouver: (head) => meta(head, "description"),
    attribut: "content",
    creer: (valeur) => `<meta name="description" content="${escapeAttribute(valeur)}">`,
  },
  {
    cle: "ogTitle",
    trouver: (head) => meta(head, "og:title", true),
    attribut: "content",
    creer: (valeur) => `<meta property="og:title" content="${escapeAttribute(valeur)}">`,
  },
  {
    cle: "ogDescription",
    trouver: (head) => meta(head, "og:description", true),
    attribut: "content",
    creer: (valeur) =>
      `<meta property="og:description" content="${escapeAttribute(valeur)}">`,
  },
  {
    cle: "ogImage",
    trouver: (head) => meta(head, "og:image", true),
    attribut: "content",
    creer: (valeur) => `<meta property="og:image" content="${escapeAttribute(valeur)}">`,
    url: true,
  },
  {
    cle: "canonical",
    trouver: (head) => lien(head, "canonical"),
    attribut: "href",
    creer: (valeur) => `<link rel="canonical" href="${escapeAttribute(valeur)}">`,
    url: true,
  },
];

export function seoSplices(
  head: Element,
  source: string,
  actuel: Seo,
  souhaite: Partial<Seo>,
): { splices: Splice[]; insertions: string[] } {
  const splices: Splice[] = [];
  const insertions: string[] = [];

  for (const cible of CIBLES) {
    const valeur = souhaite[cible.cle];
    if (typeof valeur !== "string") continue;
    if (valeur === actuel[cible.cle]) continue;

    const propre = cible.url === true ? sanitizeUrl(valeur) : valeur;
    const element = cible.trouver(head);

    if (element === null) {
      if (propre.length > 0) insertions.push(cible.creer(propre));
      continue;
    }

    if (cible.attribut === null) {
      const interieur = innerRange(element);
      if (interieur !== undefined) {
        splices.push({ ...interieur, replacement: escapeText(propre) });
      }
      continue;
    }

    const plage = attributeValueRange(element, cible.attribut, source);
    if (plage !== undefined) {
      splices.push({ ...plage, replacement: escapeAttribute(propre) });
    }
  }

  return { splices, insertions };
}
