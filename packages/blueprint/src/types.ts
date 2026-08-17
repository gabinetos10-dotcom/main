import { z } from "zod";
import { seoSchema } from "./schema";

/**
 * Le contenu du client — le « calque » proprement dit (§5, §10).
 *
 * Ce document ne référence jamais un nœud du DOM : uniquement des identifiants
 * du blueprint. C'est ce qui rend `build(source, blueprint, contenu)` pure et
 * ce qui permet à un contenu de survivre à une re-livraison de design.
 */

export const collectionStateSchema = z.object({
  /** Ordre courant des items, y compris ceux ajoutés par le client. */
  order: z.array(z.string()).default([]),
  /** Items créés depuis le gabarit : itemId → valeurs indexées par `key`. */
  added: z.record(z.string(), z.record(z.string(), z.unknown())).default({}),
  /** Items du source retirés par le client. Le HTML source n'est jamais modifié. */
  removed: z.array(z.string()).default([]),
});

export const blockStateSchema = z.object({
  /** Masquage : `display:none` via les overrides à la publication (§13). */
  hidden: z.boolean().default(false),
  /** Duplications du bloc, dans l'ordre d'insertion après le bloc source. */
  duplicates: z.array(z.string()).default([]),
});

export const contentDataSchema = z.object({
  /** fieldId → valeur. La forme dépend du `type` du champ dans le blueprint. */
  fields: z.record(z.string(), z.unknown()).default({}),
  /** collectionId → état. */
  collections: z.record(z.string(), collectionStateSchema).default({}),
  /** blockId → état. */
  blocks: z.record(z.string(), blockStateSchema).default({}),
  /** tokenId → valeur CSS. Injecté dans `assets/calque-overrides.css` (§9.4). */
  theme: z.record(z.string(), z.string()).default({}),
  /** pagePath → SEO surchargé. */
  seo: z.record(z.string(), seoSchema.partial()).default({}),
  /** fieldId d'un champ global (contact, réseaux) → valeur. */
  globals: z.record(z.string(), z.unknown()).default({}),
});

/** Patch d'autosave (§10) : sous-ensemble partiel appliqué par fusion profonde. */
export const contentPatchSchema = contentDataSchema.partial();

export const fieldDiffSchema = z.object({
  fieldId: z.string(),
  label: z.string(),
  pagePath: z.string().optional(),
  before: z.unknown(),
  after: z.unknown(),
  kind: z.enum(["ajout", "modification", "suppression"]),
});

export const contentDiffSchema = z.object({
  fields: z.array(fieldDiffSchema).default([]),
  summary: z.string().default(""),
});

export type CollectionState = z.infer<typeof collectionStateSchema>;
export type BlockState = z.infer<typeof blockStateSchema>;
export type ContentData = z.infer<typeof contentDataSchema>;
export type ContentPatch = z.infer<typeof contentPatchSchema>;
export type FieldDiff = z.infer<typeof fieldDiffSchema>;
export type ContentDiff = z.infer<typeof contentDiffSchema>;

export function emptyContent(): ContentData {
  return contentDataSchema.parse({});
}
