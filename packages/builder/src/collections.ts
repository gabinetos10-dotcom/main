import type { Collection, CollectionState, TemplateField } from "@calque/blueprint";
import {
  applySplices,
  attributeRange,
  children,
  elementRange,
  findAll,
  getAttr,
  hasAttr,
  innerRange,
  parseHtml,
  tagName,
  type Element,
  type Splice,
} from "@calque/parser";
import { escapeAttribute, escapeText, sanitizeRichtext } from "./escape";
import { itemValueKey } from "./initial";
import type { PageIndex } from "./resolve";
import { splicesForValue } from "./writes";

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

/**
 * Instancie un item à partir du gabarit (§13).
 *
 * Le gabarit est un fragment de HTML découpé dans le source, dont les éléments
 * porteurs de valeurs sont marqués `data-f="clef"`. On le **parse** pour
 * retrouver ces éléments : les repérer à l'index dans la chaîne revient à lire
 * du HTML à l'expression régulière, ce que le §21 interdit — et ce qui, ici,
 * confondait la balise d'un champ avec celle du conteneur qui l'entoure, au
 * point d'effacer la moitié de la carte ajoutée.
 *
 * Une fois les éléments résolus, l'écriture est celle de n'importe quel champ :
 * `splicesForValue`, la même fonction que pour une page entière.
 */
function remplirGabarit(
  html: string,
  champs: readonly TemplateField[],
  valeurs: Readonly<Record<string, unknown>>,
  marquerPour: string | null = null,
): string {
  const document = parseHtml(html);

  const parClef = new Map<string, Element>();
  for (const element of findAll(document, (candidat) => hasAttr(candidat, "data-f"))) {
    const clef = getAttr(element, "data-f");
    if (clef !== undefined && !parClef.has(clef)) parClef.set(clef, element);
  }

  const splices: Splice[] = [];

  for (const champ of champs) {
    const element = parClef.get(champ.key);
    if (element === undefined) continue;

    const ecritures = splicesForValue(
      champ.type,
      valeurs[champ.key],
      { element, source: html },
      champ.constraints,
    );
    if (ecritures !== null) splices.push(...ecritures);
  }

  // Le marqueur du gabarit n'atteint jamais la page : publié, il disparaît ; en
  // aperçu, il devient le marquage que le runtime d'édition sait résoudre. Sans
  // lui, un item ajouté serait visible mais pas cliquable — il n'existe dans
  // aucun chemin DOM du blueprint, puisqu'il n'existait pas à l'analyse.
  for (const [clef, element] of parClef) {
    const plage = attributeRange(element, "data-f", html);
    if (plage === undefined) continue;
    splices.push({
      ...plage,
      replacement:
        marquerPour === null
          ? ""
          : ` data-calque-field="${escapeAttribute(itemValueKey(marquerPour, clef))}"`,
    });
  }

  return applySplices(html, splices);
}

export interface CollectionRewrite {
  splice: Splice;
  /** Clés de `content.fields` déjà appliquées : à ne pas réécrire au niveau page. */
  consumedFieldKeys: string[];
}

/**
 * Pose `data-calque-item` sur la balise ouvrante d'un item.
 *
 * Après un réordonnancement, le chemin DOM d'un item ne vaut plus rien : c'est
 * par cet attribut que le runtime d'édition retrouve les items dans la page
 * reconstruite.
 */
export function marquerItem(html: string, itemId: string): string {
  const ouvrante = /<([a-z][a-z0-9-]*)/iu.exec(html);
  if (ouvrante === null) return html;
  const position = ouvrante.index + ouvrante[0].length;
  return `${html.slice(0, position)} data-calque-item="${itemId}"${html.slice(position)}`;
}

export function rewriteCollection(
  collection: Collection,
  etat: CollectionState,
  index: PageIndex,
  source: string,
  valeurs: Readonly<Record<string, unknown>>,
  marquer = false,
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
      const instancie = remplirGabarit(
        collection.itemTemplate.html,
        collection.itemTemplate.fields,
        ajoute,
        marquer ? itemId : null,
      );
      morceaux.push(marquer ? marquerItem(instancie, itemId) : instancie);
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

    const brut = applySplices(source.slice(plage.startOffset, plage.endOffset), local);
    morceaux.push(marquer ? marquerItem(brut, itemId) : brut);
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
