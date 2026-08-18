import { parseFragment, serialize } from "parse5";
import type { DefaultTreeAdapterTypes } from "parse5";

/**
 * Échappement et assainissement (§17).
 *
 * Tout ce qui vient du client traverse ce module avant d'entrer dans le HTML
 * publié. Une valeur de champ est une donnée, jamais du balisage — sauf pour un
 * champ `richtext`, où seule une liste blanche d'éléments survit.
 */

export function escapeText(valeur: string): string {
  return valeur.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");
}

export function escapeAttribute(valeur: string): string {
  return valeur
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
}

/**
 * URLs acceptées dans un `href` ou un `src` édité par le client.
 *
 * `javascript:` et `data:` sont refusés : le premier exécute, le second permet
 * d'embarquer du HTML exécutable dans une page qui, elle, est servie sur le
 * domaine du client.
 */
const PROTOCOLE_INTERDIT = /^\s*(?:javascript|data|vbscript|file)\s*:/iu;

export function sanitizeUrl(valeur: string): string {
  return PROTOCOLE_INTERDIT.test(valeur) ? "#" : valeur.trim();
}

const ATTRIBUTS_TOUJOURS_INTERDITS = /^on/iu;

type Element = DefaultTreeAdapterTypes.Element;
type Node = DefaultTreeAdapterTypes.Node;

function estElement(noeud: Node): noeud is Element {
  return "tagName" in noeud;
}

/**
 * Assainit un fragment de texte enrichi contre une liste blanche.
 *
 * Un élément hors liste n'est pas supprimé avec son contenu : il est *déballé*,
 * son texte remonte. Supprimer ferait disparaître du contenu que le client
 * croyait avoir écrit ; déballer ne perd que la mise en forme.
 */
export function sanitizeRichtext(
  html: string,
  balisesAutorisees: readonly string[],
): string {
  const autorisees = new Set(balisesAutorisees.map((balise) => balise.toLowerCase()));
  const fragment = parseFragment(html);

  const nettoyer = (parent: { childNodes: Node[] }): void => {
    const sortie: Node[] = [];

    for (const enfant of parent.childNodes) {
      if (!estElement(enfant)) {
        sortie.push(enfant);
        continue;
      }

      nettoyer(enfant);
      const balise = enfant.tagName.toLowerCase();

      if (!autorisees.has(balise)) {
        for (const petit of enfant.childNodes) {
          petit.parentNode = parent as never;
          sortie.push(petit);
        }
        continue;
      }

      enfant.attrs = enfant.attrs.filter((attribut) => {
        if (ATTRIBUTS_TOUJOURS_INTERDITS.test(attribut.name)) return false;
        if (attribut.name === "href" || attribut.name === "src") {
          attribut.value = sanitizeUrl(attribut.value);
        }
        if (attribut.name === "style") return false;
        return true;
      });

      sortie.push(enfant);
    }

    parent.childNodes = sortie;
  };

  nettoyer(fragment);
  return serialize(fragment);
}
