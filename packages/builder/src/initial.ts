import type { Blueprint, ContentData } from "@calque/blueprint";
import { contentDataSchema } from "@calque/blueprint";

/**
 * Contenu initial : le calque qui, appliqué au source, ne change rien.
 *
 * C'est le contenu que l'ingestion dépose dans le premier brouillon du site
 * (§10) — le client ouvre l'éditeur et voit son site tel qu'il a été livré — et
 * c'est l'entrée de l'invariant du §15 :
 *
 *     build(source, blueprint, contenu_initial) ≡ source
 */
export function initialContent(blueprint: Blueprint): ContentData {
  const fields: Record<string, unknown> = {};
  const collections: Record<string, unknown> = {};
  const theme: Record<string, string> = {};
  const seo: Record<string, unknown> = {};
  const globals: Record<string, unknown> = {};

  for (const page of blueprint.pages) {
    if (page.virtual) continue;
    seo[page.path] = { ...page.seo };

    for (const bloc of page.blocks) {
      for (const champ of bloc.fields) fields[champ.id] = champ.value;

      for (const collection of bloc.collections) {
        collections[collection.id] = {
          order: collection.items.map((item) => item.itemId),
          added: {},
          removed: [],
        };
        for (const item of collection.items) {
          for (const [clef, valeur] of Object.entries(item.values)) {
            fields[`${item.itemId}.${clef}`] = valeur;
          }
        }
      }
    }
  }

  for (const jeton of blueprint.theme.tokens) {
    if (!jeton.inferred) theme[jeton.id] = jeton.value;
  }

  for (const groupe of blueprint.globals) {
    for (const champ of groupe.fields) globals[champ.id] = champ.value;
  }

  return contentDataSchema.parse({ fields, collections, theme, seo, globals });
}

/** Clé d'une valeur d'item dans `content.fields` : `itm_001.f2`. */
export function itemValueKey(itemId: string, clef: string): string {
  return `${itemId}.${clef}`;
}
