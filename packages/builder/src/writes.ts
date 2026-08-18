import type { Field, FieldType, SourceRange } from "@calque/blueprint";
import {
  attributeInsertPoint,
  attributeValueRange,
  getAttr,
  innerRange,
  type Element,
} from "@calque/parser";
import type { Splice } from "@calque/parser";
import { escapeAttribute, escapeText, sanitizeRichtext, sanitizeUrl } from "./escape";

/**
 * Traduction d'une valeur de champ en remplacements d'octets (§15, étape 3).
 *
 * Rien n'est resérialisé : on remplace exactement l'intervalle qui porte la
 * valeur, et rien d'autre. C'est ce qui garantit qu'un site publié après une
 * modification d'un titre ne diffère du source que par ce titre.
 */

export interface WriteContext {
  element: Element;
  source: string;
}

/** Écriture d'un attribut : remplacement s'il existe, insertion sinon. */
function ecrireAttribut(
  contexte: WriteContext,
  nom: string,
  valeur: string,
): Splice | null {
  const existante = attributeValueRange(contexte.element, nom, contexte.source);
  if (existante !== undefined) {
    return { ...existante, replacement: escapeAttribute(valeur) };
  }

  const point = attributeInsertPoint(contexte.element);
  if (point === undefined) return null;
  return {
    startOffset: point.startOffset,
    endOffset: point.endOffset,
    replacement: ` ${nom}="${escapeAttribute(valeur)}"`,
  };
}

function ecrireTexte(contexte: WriteContext, valeur: string): Splice | null {
  const interieur = innerRange(contexte.element);
  if (interieur === undefined) return null;
  return { ...interieur, replacement: escapeText(valeur) };
}

/**
 * Reconstruit l'URL d'une carte à partir d'une adresse.
 *
 * Le client saisit une adresse, jamais une URL d'iframe (§9.2) : lui laisser
 * l'URL reviendrait à lui demander de comprendre les paramètres de Google Maps,
 * et à accepter n'importe quelle iframe dans sa page.
 */
export function mapEmbedUrl(adresse: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(adresse)}&output=embed`;
}

const ALLOWLIST_PAR_DEFAUT = [
  "b",
  "strong",
  "i",
  "em",
  "u",
  "a",
  "br",
  "ul",
  "ol",
  "li",
  "p",
  "span",
];

function chaine(valeur: unknown): string {
  return typeof valeur === "string" ? valeur : String(valeur ?? "");
}

function objet(valeur: unknown): Record<string, unknown> {
  return typeof valeur === "object" && valeur !== null
    ? (valeur as Record<string, unknown>)
    : {};
}

/**
 * Remplacements à appliquer pour porter `valeur` sur l'élément résolu.
 *
 * Renvoie une liste vide quand il n'y a rien à écrire ; `null` quand la valeur
 * ne peut pas être écrite du tout — le champ est alors déclaré irrésolu plutôt
 * que réécrit au hasard.
 */
export function splicesForValue(
  type: FieldType,
  valeur: unknown,
  contexte: WriteContext,
  constraints: Readonly<Record<string, unknown>> = {},
): Splice[] | null {
  switch (type) {
    case "text":
    case "contact": {
      const splice = ecrireTexte(contexte, chaine(valeur));
      return splice === null ? null : [splice];
    }

    case "richtext": {
      const interieur = innerRange(contexte.element);
      if (interieur === undefined) return null;
      const balises = Array.isArray(constraints["allowedTags"])
        ? (constraints["allowedTags"] as string[])
        : ALLOWLIST_PAR_DEFAUT;
      return [{ ...interieur, replacement: sanitizeRichtext(chaine(valeur), balises) }];
    }

    case "image": {
      const image = objet(valeur);
      const splices: Splice[] = [];

      if (constraints["isBackground"] === true) {
        const style = getAttr(contexte.element, "style");
        const plage = attributeValueRange(contexte.element, "style", contexte.source);
        if (style === undefined || plage === undefined) return null;
        const remplace = style.replace(
          /url\((['"]?)([^'")]*)\1\)/u,
          (_entier, guillemet: string) =>
            `url(${guillemet}${sanitizeUrl(chaine(image["src"]))}${guillemet})`,
        );
        return [{ ...plage, replacement: escapeAttribute(remplace) }];
      }

      const src = ecrireAttribut(contexte, "src", sanitizeUrl(chaine(image["src"])));
      if (src === null) return null;
      splices.push(src);

      // Le §14 rend le texte alternatif obligatoire : on l'écrit même quand
      // l'attribut n'existe pas dans le source.
      const alt = ecrireAttribut(contexte, "alt", chaine(image["alt"]));
      if (alt !== null) splices.push(alt);

      return splices;
    }

    case "link":
    case "cta": {
      const lien = objet(valeur);
      const splices: Splice[] = [];

      const libelle = ecrireTexte(contexte, chaine(lien["label"]));
      if (libelle !== null) splices.push(libelle);

      const href = ecrireAttribut(contexte, "href", sanitizeUrl(chaine(lien["href"])));
      if (href !== null) splices.push(href);

      const cible = chaine(lien["target"]);
      if (cible === "_blank") {
        const rel = ecrireAttribut(contexte, "rel", "noopener noreferrer");
        if (rel !== null) splices.push(rel);
      }

      return splices.length === 0 ? null : splices;
    }

    case "social": {
      const reseau = objet(valeur);
      const href = ecrireAttribut(contexte, "href", sanitizeUrl(chaine(reseau["href"])));
      return href === null ? null : [href];
    }

    case "form-endpoint": {
      const formulaire = objet(valeur);
      const action = ecrireAttribut(
        contexte,
        "action",
        sanitizeUrl(chaine(formulaire["action"])),
      );
      if (action === null) return null;
      const methode = chaine(formulaire["method"]) === "GET" ? "GET" : "POST";
      const splices = [action];
      const attributMethode = ecrireAttribut(contexte, "method", methode);
      if (attributMethode !== null) splices.push(attributMethode);
      return splices;
    }

    case "map-embed": {
      const carte = objet(valeur);
      const adresse = chaine(carte["address"]);
      const url =
        adresse.length > 0 ? mapEmbedUrl(adresse) : sanitizeUrl(chaine(carte["src"]));
      const src = ecrireAttribut(contexte, "src", url);
      return src === null ? null : [src];
    }

    case "video-embed": {
      const video = objet(valeur);
      const src = ecrireAttribut(contexte, "src", sanitizeUrl(chaine(video["src"])));
      return src === null ? null : [src];
    }

    // Une icône se change dans le panneau de thème, pas dans le HTML source ;
    // un booléen pilote le masquage d'un bloc, qui passe par la surcharge CSS.
    case "icon":
    case "boolean":
      return [];

    default:
      return null;
  }
}

/** Deux valeurs de champ sont-elles identiques ? Comparaison structurelle. */
export function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object" || a === null || b === null) return false;
  return JSON.stringify(normaliser(a)) === JSON.stringify(normaliser(b));
}

function normaliser(valeur: unknown): unknown {
  if (Array.isArray(valeur)) return valeur.map(normaliser);
  if (typeof valeur === "object" && valeur !== null) {
    const entrees = Object.entries(valeur as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return Object.fromEntries(entrees.map(([cle, v]) => [cle, normaliser(v)]));
  }
  return valeur;
}

export type { Field, SourceRange };
