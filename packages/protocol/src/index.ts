import * as z from "zod/mini";

/**
 * Protocole `postMessage` entre le panneau d'édition et l'aperçu (§11).
 *
 * Deux processus séparés par une frontière de sécurité — l'aperçu est servi
 * depuis un autre domaine, dans une iframe en bac à sable. Tout ce qui traverse
 * est donc validé par Zod **des deux côtés** : le panneau ne fait pas confiance
 * à l'aperçu, et l'aperçu ne fait pas confiance au panneau.
 *
 * Le protocole est versionné. Un aperçu servi depuis un build antérieur peut
 * cohabiter avec un panneau plus récent le temps d'un déploiement : chacun
 * ignore ce qu'il ne comprend pas, plutôt que de planter.
 */

export const PROTOCOL_VERSION = 1;

/* ── Types partagés ────────────────────────────────────────────────────────── */

export const viewportSchema = z.enum(["desktop", "tablette", "mobile"]);
export type Viewport = z.infer<typeof viewportSchema>;

export const editorModeSchema = z.enum([
  /** Édition : le site est neutralisé, les champs sont cliquables. */
  "edition",
  /** Aperçu réel : le site se comporte comme en ligne. */
  "apercu",
]);
export type EditorMode = z.infer<typeof editorModeSchema>;

/**
 * `zod/mini` plutôt que `zod` : ce module est embarqué dans le runtime
 * d'édition, dont le §4 fixe le budget à 40 kB gzip. Le Zod complet en coûte à
 * lui seul davantage. La variante mini a la même sémantique de validation, une
 * API fonctionnelle, et se réduit à ce qu'on en utilise réellement.
 */
const enveloppe = <T extends string, S extends z.ZodMiniType>(type: T, payload: S) =>
  z.object({
    protocol: z.literal("calque"),
    version: z.literal(PROTOCOL_VERSION),
    type: z.literal(type),
    payload,
  });

/* ── Aperçu → panneau ──────────────────────────────────────────────────────── */

export const readySchema = enveloppe(
  "READY",
  z.object({
    /** Champs effectivement résolus dans le DOM vivant. */
    resolvedFieldIds: z.array(z.string()),
    /** Champs que l'aperçu n'a pas su retrouver : le panneau les grise. */
    unresolvedFieldIds: z.array(z.string()),
    /** Bibliothèques d'animation neutralisées, pour l'expliquer au client. */
    neutralized: z.array(z.string()),
  }),
);

export const fieldClickSchema = enveloppe(
  "FIELD_CLICK",
  z.object({ fieldId: z.string() }),
);

export const fieldInputSchema = enveloppe(
  "FIELD_INPUT",
  z.object({ fieldId: z.string(), value: z.string() }),
);

export const hoverSchema = enveloppe(
  "HOVER",
  z.object({ fieldId: z.nullable(z.string()) }),
);

export const scrollPosSchema = enveloppe("SCROLL_POS", z.object({ y: z.number() }));

export const errorSchema = enveloppe(
  "ERROR",
  z.object({ message: z.string(), fieldId: z.optional(z.string()) }),
);

/**
 * Demande d'opération sur une liste, faite depuis l'aperçu (§13).
 *
 * L'aperçu ne réordonne rien lui-même : il n'a ni le gabarit, ni les bornes, ni
 * le contenu. Il demande, le panneau décide et reconstruit.
 */
export const collectionRequestSchema = enveloppe(
  "COLLECTION_REQUEST",
  z.object({
    collectionId: z.string(),
    itemId: z.string(),
    op: z.enum(["up", "down", "duplicate", "remove"]),
  }),
);

export const fromPreviewSchema = z.discriminatedUnion("type", [
  readySchema,
  fieldClickSchema,
  fieldInputSchema,
  hoverSchema,
  scrollPosSchema,
  errorSchema,
  collectionRequestSchema,
]);
export type FromPreview = z.infer<typeof fromPreviewSchema>;

/* ── Panneau → aperçu ──────────────────────────────────────────────────────── */

export const setValueSchema = enveloppe(
  "SET_VALUE",
  z.object({
    fieldId: z.string(),
    /** Forme dépendante du type ; l'aperçu n'écrit que ce qu'il sait écrire. */
    value: z.unknown(),
    type: z.string(),
  }),
);

export const highlightSchema = enveloppe(
  "HIGHLIGHT",
  z.object({
    fieldId: z.nullable(z.string()),
    /** Illumine toutes les zones modifiables d'un coup (§12). */
    showAll: z._default(z.boolean(), false),
  }),
);

export const scrollToSchema = enveloppe("SCROLL_TO", z.object({ fieldId: z.string() }));

export const setModeSchema = enveloppe("SET_MODE", z.object({ mode: editorModeSchema }));

export const collectionOpSchema = enveloppe(
  "COLLECTION_OP",
  z.object({
    collectionId: z.string(),
    op: z.enum(["add", "duplicate", "remove", "reorder"]),
    itemId: z.optional(z.string()),
    order: z.optional(z.array(z.string())),
  }),
);

export const setTokenSchema = enveloppe(
  "SET_TOKEN",
  z.object({ cssVar: z.string(), value: z.string() }),
);

export const setViewportSchema = enveloppe(
  "SET_VIEWPORT",
  z.object({ viewport: viewportSchema }),
);

export const toPreviewSchema = z.discriminatedUnion("type", [
  setValueSchema,
  highlightSchema,
  scrollToSchema,
  setModeSchema,
  collectionOpSchema,
  setTokenSchema,
  setViewportSchema,
]);
export type ToPreview = z.infer<typeof toPreviewSchema>;

/* ── Fabriques ─────────────────────────────────────────────────────────────── */

type Sans<T> = T extends { payload: infer P } ? P : never;

export function message<T extends FromPreview["type"]>(
  type: T,
  payload: Sans<Extract<FromPreview, { type: T }>>,
): Extract<FromPreview, { type: T }>;
export function message<T extends ToPreview["type"]>(
  type: T,
  payload: Sans<Extract<ToPreview, { type: T }>>,
): Extract<ToPreview, { type: T }>;
export function message(type: string, payload: unknown): unknown {
  return { protocol: "calque", version: PROTOCOL_VERSION, type, payload };
}

/**
 * Lecture d'un message reçu.
 *
 * Renvoie `null` — sans lever — pour tout ce qui n'est pas un message Calque de
 * la bonne version. Une fenêtre reçoit des messages de toutes sortes : extensions
 * de navigateur, outils de développement, autres iframes. Lever sur chacun
 * rendrait l'éditeur inutilisable.
 */
export function readFromPreview(donnee: unknown): FromPreview | null {
  return fromPreviewSchema.safeParse(donnee).data ?? null;
}

export function readToPreview(donnee: unknown): ToPreview | null {
  return toPreviewSchema.safeParse(donnee).data ?? null;
}
