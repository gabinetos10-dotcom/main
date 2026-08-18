import type { Collection, CollectionState, TemplateField } from "@calque/blueprint";
import {
  applySplices,
  children,
  elementRange,
  innerRange,
  tagName,
  type Element,
  type Splice,
} from "@calque/parser";
import { escapeAttribute, escapeText, sanitizeRichtext, sanitizeUrl } from "./escape";
import { itemValueKey } from "./initial";
import type { PageIndex } from "./resolve";

/**
 * Ajout, suppression et réordonnancement d'items (§13, §15 étape 4).
 *
 * Deux régimes, et c'est délibéré :
 *
 *  • **collection inchangée** — on n'y touche pas du tout, et les valeurs de ses
 *    items s'écrivent comme n'importe quel champ. C'est ce qui préserve
 *    l'identité byte-à-byte du §15 ;
 *  • **collection modifiée** — on réécrit l'intérieur du conteneur d'un seul
 *    tenant, dans l'ordre demandé. Reconstruire élément par élément obligerait à
 *    deviner où insérer sans casser l'indentation.
 */

const ETAT_PAR_DEFAUT: CollectionState = { order: [], added: {}, removed: [] };

export function collectionUnchanged(
  collection: Collection,
  etat: CollectionState | undefined,
): boolean {
  if (etat === undefined) return true;
  if (etat.removed.length > 0) return false;
  if (Object.keys(etat.added).length > 0) return false;
  if (etat.order.length === 0) return true;

  const naturel = collection.items.map((item) => item.itemId);
  return (
    etat.order.length === naturel.length &&
    etat.order.every((id, index) => id === naturel[index])
  );
}

/** Applique une valeur à l'emplacement `data-f="clef"` d'un fragment de gabarit. */
function remplirGabarit(
  html: string,
  champs: readonly TemplateField[],
  valeurs: Readonly<Record<string, unknown>>,
): string {
  let sortie = html;

  for (const champ of champs) {
    const valeur = valeurs[champ.key];
    const marqueur = `data-f="${champ.key}"`;
    const position = sortie.indexOf(marqueur);
    if (position === -1) continue;

    const finBalise = sortie.indexOf(">", position);
    if (finBalise === -1) continue;

    if (champ.type === "image") {
      const image = (
        typeof valeur === "object" && valeur !== null ? valeur : {}
      ) as Record<string, unknown>;
      const src = sanitizeUrl(String(image["src"] ?? ""));
      const alt = String(image["alt"] ?? "");
      sortie =
        sortie.slice(0, finBalise) +
        ` src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}"` +
        sortie.slice(finBalise);
      continue;
    }

    // Champs textuels et liens : le contenu se pose entre les balises.
    const balise =
      /<([a-z0-9-]+)/iu.exec(sortie.slice(position - 40, position))?.[1] ?? "";
    const fermeture = balise.length > 0 ? sortie.indexOf(`</${balise}`, finBalise) : -1;
    if (fermeture === -1) continue;

    let contenu = "";
    if (champ.type === "richtext") {
      contenu = sanitizeRichtext(String(valeur ?? ""), [
        "b",
        "strong",
        "i",
        "em",
        "u",
        "a",
        "br",
      ]);
    } else if (champ.type === "link" || champ.type === "cta") {
      const lien = (
        typeof valeur === "object" && valeur !== null ? valeur : {}
      ) as Record<string, unknown>;
      contenu = escapeText(String(lien["label"] ?? ""));
      const href = sanitizeUrl(String(lien["href"] ?? "#"));
      sortie =
        sortie.slice(0, finBalise) +
        ` href="${escapeAttribute(href)}"` +
        sortie.slice(finBalise);
      return remplirGabaritSuite(sortie, champs, valeurs, champ.key, contenu);
    } else {
      contenu = escapeText(String(valeur ?? ""));
    }

    sortie = sortie.slice(0, finBalise + 1) + contenu + sortie.slice(fermeture);
  }

  return sortie;
}

/**
 * Reprend le remplissage après une réécriture qui a décalé les offsets.
 *
 * Poser un `href` déplace tout ce qui suit : plutôt que de tenir une
 * comptabilité d'offsets sur une chaîne qu'on modifie, on repart du marqueur.
 */
function remplirGabaritSuite(
  html: string,
  champs: readonly TemplateField[],
  valeurs: Readonly<Record<string, unknown>>,
  clefFaite: string,
  contenu: string,
): string {
  const marqueur = `data-f="${clefFaite}"`;
  const position = html.indexOf(marqueur);
  const finBalise = html.indexOf(">", position);
  const balise =
    /<([a-z0-9-]+)/iu.exec(html.slice(Math.max(0, position - 60), position))?.[1] ?? "a";
  const fermeture = html.indexOf(`</${balise}`, finBalise);
  const avec =
    fermeture === -1
      ? html
      : html.slice(0, finBalise + 1) + contenu + html.slice(fermeture);

  const restants = champs.filter((champ) => champ.key !== clefFaite);
  return restants.length === 0 ? avec : remplirGabarit(avec, restants, valeurs);
}

/** Retire les marqueurs `data-f` d'un item instancié : ils ne servent qu'au gabarit. */
function retirerMarqueurs(html: string): string {
  return html.replace(/\s+data-f="[^"]*"/gu, "");
}

export interface CollectionRewrite {
  splice: Splice;
  /** Clés de `content.fields` déjà appliquées : à ne pas réécrire au niveau page. */
  consumedFieldKeys: string[];
}

export function rewriteCollection(
  collection: Collection,
  etat: CollectionState,
  index: PageIndex,
  source: string,
  valeurs: Readonly<Record<string, unknown>>,
): CollectionRewrite | null {
  const conteneur = index.byPath(collection.containerPath);
  if (conteneur === undefined) return null;

  const interieur = innerRange(conteneur);
  if (interieur === undefined) return null;

  const parId = new Map(collection.items.map((item) => [item.itemId, item]));
  const retires = new Set(etat.removed);
  const ordre =
    etat.order.length > 0
      ? etat.order
      : [...collection.items.map((item) => item.itemId), ...Object.keys(etat.added)];

  const consumedFieldKeys: string[] = [];
  const morceaux: string[] = [];

  for (const itemId of ordre) {
    if (retires.has(itemId)) continue;

    const ajoute = etat.added[itemId];
    if (ajoute !== undefined) {
      morceaux.push(
        retirerMarqueurs(
          remplirGabarit(
            collection.itemTemplate.html,
            collection.itemTemplate.fields,
            ajoute,
          ),
        ),
      );
      continue;
    }

    const item = parId.get(itemId);
    if (item === undefined) continue;

    const element = item.domPath !== undefined ? index.byPath(item.domPath) : undefined;
    const plage = element !== undefined ? elementRange(element) : item.meta?.sourceRange;
    if (plage === undefined) continue;

    // On repart du source de l'item, puis on y applique ses propres valeurs.
    const local: Splice[] = [];
    for (const gabarit of collection.itemTemplate.fields) {
      const clef = itemValueKey(itemId, gabarit.key);
      const localisation = item.valueMeta[gabarit.key];
      if (localisation === undefined) continue;
      consumedFieldKeys.push(clef);

      const valeur = valeurs[clef];
      if (valeur === undefined) continue;
      const plagesValeur = localisation.valueRanges ?? {};
      const cible = plagesValeur["text"] ?? plagesValeur["html"] ?? plagesValeur["label"];
      if (cible === undefined) continue;

      local.push({
        startOffset: cible.startOffset - plage.startOffset,
        endOffset: cible.endOffset - plage.startOffset,
        replacement:
          gabarit.type === "richtext"
            ? sanitizeRichtext(String(valeur ?? ""), [
                "b",
                "strong",
                "i",
                "em",
                "u",
                "a",
                "br",
              ])
            : escapeText(
                typeof valeur === "object" && valeur !== null
                  ? String((valeur as Record<string, unknown>)["label"] ?? "")
                  : String(valeur ?? ""),
              ),
      });
    }

    const brut = source.slice(plage.startOffset, plage.endOffset);
    morceaux.push(applySplices(brut, local));
  }

  const separateur = deduireSeparateur(conteneur, source);
  const contenu =
    morceaux.length === 0
      ? ""
      : `${separateur}${morceaux.join(separateur)}${finSeparateur(separateur)}`;

  return {
    splice: { ...interieur, replacement: contenu },
    consumedFieldKeys,
  };
}

/** Reprend l'indentation existante entre deux items, pour ne pas aplatir le HTML. */
function deduireSeparateur(conteneur: Element, source: string): string {
  const enfants = children(conteneur);
  const premier = enfants[0];
  const interieur = innerRange(conteneur);
  if (premier === undefined || interieur === undefined) return "\n";

  const debut = elementRange(premier)?.startOffset;
  if (debut === undefined) return "\n";

  const avant = source.slice(interieur.startOffset, debut);
  return /^\s*$/u.test(avant) && avant.length > 0 ? avant : "\n";
}

function finSeparateur(separateur: string): string {
  const saut = separateur.lastIndexOf("\n");
  return saut === -1
    ? separateur
    : separateur.slice(0, saut + 1) +
        " ".repeat(Math.max(0, separateur.length - saut - 3));
}

export { ETAT_PAR_DEFAUT, tagName };
