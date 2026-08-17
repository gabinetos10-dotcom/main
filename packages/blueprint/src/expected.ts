import { z } from "zod";
import { fieldTypeSchema, lockReasonSchema, warningCodeSchema } from "./schema";

/**
 * Vérité terrain d'une fixture (`expected.json`).
 *
 * Écrite à la main en P1, consommée par les tests du parser en P2 pour mesurer :
 *   • le **rappel** : part des champs attendus effectivement détectés (≥ 90 %) ;
 *   • les **faux positifs destructeurs** : tout élément listé dans `mustBeLocked`
 *     mais classé éditable. Un seul suffit à faire échouer la phase.
 *
 * Les éléments sont désignés par sélecteur CSS et non par `domPath` : un
 * sélecteur reste lisible et modifiable à la main, un `domPath` non.
 */

export const expectedFieldSchema = z.object({
  /** Sélecteur CSS résolu contre le HTML source, avant tout JavaScript. */
  selector: z.string(),
  type: fieldTypeSchema,
  /** Libellé lisible attendu. Indicatif : le rappel ne le teste pas. */
  label: z.string().optional(),
  /**
   * Un champ critique compte double dans le rappel : c'est un champ dont l'absence
   * rendrait le produit inutilisable sur cette fixture (titre du hero, photo
   * principale, téléphone…).
   */
  critical: z.boolean().default(false),
  /** Note d'intention, pour le lecteur humain du fichier. */
  note: z.string().optional(),
});

export const expectedCollectionSchema = z.object({
  containerSelector: z.string(),
  label: z.string().optional(),
  minItems: z.number().int().min(2),
  /** Types attendus des champs du gabarit, dans l'ordre du DOM. */
  itemFields: z.array(fieldTypeSchema),
  /**
   * Vrai quand les items ne sont volontairement pas identiques (badge en plus,
   * image en moins). Ces cas exercent le regroupement flou plutôt que l'égalité
   * stricte d'empreinte.
   */
  heterogeneous: z.boolean().default(false),
  /** Attendu verrouillé par défaut : menus, fils d'Ariane, mentions légales (§9.3). */
  expectLocked: z.boolean().default(false),
  note: z.string().optional(),
});

export const expectedLockedSchema = z.object({
  selector: z.string(),
  reason: lockReasonSchema,
  note: z.string().optional(),
});

export const expectedPageSchema = z.object({
  path: z.string(),
  label: z.string().optional(),
  fields: z.array(expectedFieldSchema).default([]),
  collections: z.array(expectedCollectionSchema).default([]),
  /** Faux positifs destructeurs : ces éléments ne doivent JAMAIS être éditables. */
  mustBeLocked: z.array(expectedLockedSchema).default([]),
  seo: z
    .object({
      title: z.boolean().default(true),
      description: z.boolean().default(true),
      ogImage: z.boolean().default(false),
    })
    .prefault({}),
});

export const expectedSchema = z.object({
  fixture: z.string(),
  description: z.string(),
  /** Ce que cette fixture est censée mettre à l'épreuve. Documentaire. */
  exercises: z.array(z.string()).default([]),
  entry: z.string(),
  pages: z.array(expectedPageSchema).min(1),
  /** Variables CSS attendues dans le thème. */
  themeTokens: z.array(z.string()).default([]),
  themeFonts: z.array(z.string()).default([]),
  /** Avertissements que le parser doit remonter (§8, cas limites). */
  expectedWarnings: z.array(warningCodeSchema).default([]),
});

export type ExpectedField = z.infer<typeof expectedFieldSchema>;
export type ExpectedCollection = z.infer<typeof expectedCollectionSchema>;
export type ExpectedLocked = z.infer<typeof expectedLockedSchema>;
export type ExpectedPage = z.infer<typeof expectedPageSchema>;
export type Expected = z.infer<typeof expectedSchema>;

export function parseExpected(input: unknown): Expected {
  return expectedSchema.parse(input);
}

/** Nombre total de points de rappel d'une fixture (les champs critiques comptent double). */
export function recallWeight(expected: Expected): number {
  let total = 0;
  for (const page of expected.pages) {
    for (const field of page.fields) {
      total += field.critical ? 2 : 1;
    }
  }
  return total;
}
