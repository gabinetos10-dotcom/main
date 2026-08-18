import { z } from "zod";

/**
 * Schéma du blueprint (§9.7) — le contrat entre le parser, le builder, l'éditeur
 * et la base de données. Toute donnée qui traverse une frontière (API, job,
 * postMessage, fichier) est validée ici (§4).
 *
 * Règle de compatibilité : `blueprintVersion` est majeur.mineur. Un ajout de champ
 * optionnel incrémente le mineur, un changement de forme incrémente le majeur et
 * exige une migration explicite du contenu stocké.
 */

export const BLUEPRINT_VERSION = "1.1" as const;

/* ── Types de champs (§9.2) ────────────────────────────────────────────────── */

export const fieldTypeSchema = z.enum([
  "text",
  "richtext",
  "image",
  "link",
  "cta",
  "video-embed",
  "map-embed",
  "icon",
  "contact",
  "social",
  "form-endpoint",
  "boolean",
]);

/* ── Identifiants et métadonnées de résolution (§9.1) ──────────────────────── */

/** Intervalle d'octets dans le fichier source, tel que parse5 le rapporte. */
export const sourceRangeSchema = z.object({
  startOffset: z.number().int().min(0),
  endOffset: z.number().int().min(0),
});

/**
 * `domPath` est une *piste*, pas une identité. La résolution d'un champ dégrade
 * en trois étages : domPath exact → fingerprint + contentHash → fingerprint seul.
 * `fieldId` est l'identité, opaque et persistée (cf. ADR-002).
 */
export const fieldMetaSchema = z.object({
  fingerprint: z.string(),
  contentHash: z.string().optional(),
  /** Étendue de l'élément entier. Sert au surlignage dans l'aperçu. */
  sourceRange: sourceRangeSchema.optional(),
  /**
   * Étendue de chaque partie réécrivable, par nom de partie : `text`, `src`,
   * `alt`, `href`, `label`, `action`…
   *
   * Une seule étendue ne suffit pas : une image se réécrit dans `src` *et* dans
   * `alt`, un lien dans son libellé *et* dans son `href`. Le builder du P3 ne
   * resérialise jamais un élément — il remplace exactement ces intervalles, ce
   * qui est la condition de l'identité byte-à-byte.
   */
  valueRanges: z.record(z.string(), sourceRangeSchema).optional(),
});

/** Où écrire la valeur d'un champ de gabarit, dans un item de collection. */
export const valueLocationSchema = z.object({
  domPath: z.string(),
  contentHash: z.string().optional(),
  sourceRange: sourceRangeSchema.optional(),
  valueRanges: z.record(z.string(), sourceRangeSchema).optional(),
});

/* ── Contraintes par type ──────────────────────────────────────────────────── */

const textConstraintsSchema = z.object({
  maxLength: z.number().int().positive().optional(),
  minLength: z.number().int().min(0).optional(),
  multiline: z.boolean().default(false),
});

const richtextConstraintsSchema = z.object({
  maxLength: z.number().int().positive().optional(),
  /** Allowlist d'assainissement (§17). Le serveur refuse tout le reste. */
  allowedTags: z
    .array(z.string())
    .default(["b", "strong", "i", "em", "u", "a", "br", "ul", "ol", "li", "p", "span"]),
});

const imageConstraintsSchema = z.object({
  /** Format « 16/9 ». Sert au recadrage guidé (§14). */
  aspectRatio: z.string().optional(),
  maxBytes: z.number().int().positive().default(10_000_000),
  /** Une image de fond CSS se réécrit dans une règle, pas dans un attribut `src`. */
  isBackground: z.boolean().default(false),
});

const linkConstraintsSchema = z.object({
  labelMaxLength: z.number().int().positive().optional(),
  allowExternal: z.boolean().default(true),
});

const emptyConstraintsSchema = z.object({});

/* ── Valeurs par type ──────────────────────────────────────────────────────── */

export const imageValueSchema = z.object({
  src: z.string(),
  alt: z.string().default(""),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export const linkValueSchema = z.object({
  label: z.string(),
  href: z.string(),
  target: z.enum(["_self", "_blank"]).default("_self"),
  rel: z.string().optional(),
});

export const videoEmbedValueSchema = z.object({
  provider: z.enum(["youtube", "vimeo", "file"]),
  src: z.string(),
  title: z.string().optional(),
});

export const mapEmbedValueSchema = z.object({
  /** Le client édite une adresse, jamais une URL d'iframe. */
  address: z.string(),
  src: z.string(),
});

export const iconValueSchema = z.object({
  set: z.enum(["lucide", "fontawesome", "inline-svg"]),
  name: z.string(),
});

export const socialValueSchema = z.object({
  network: z.enum([
    "instagram",
    "facebook",
    "linkedin",
    "tiktok",
    "x",
    "youtube",
    "pinterest",
    "autre",
  ]),
  href: z.string(),
});

export const formEndpointValueSchema = z.object({
  action: z.string(),
  method: z.enum(["GET", "POST"]).default("POST"),
});

/* ── Champ (union discriminée sur `type`) ──────────────────────────────────── */

const fieldBase = {
  id: z.string(),
  label: z.string(),
  domPath: z.string(),
  /** Verrouillé par l'admin : visible dans l'arbre, non éditable par le client. */
  locked: z.boolean().default(false),
  meta: fieldMetaSchema,
};

export const fieldSchema = z.discriminatedUnion("type", [
  z.object({
    ...fieldBase,
    type: z.literal("text"),
    value: z.string(),
    constraints: textConstraintsSchema.prefault({}),
  }),
  z.object({
    ...fieldBase,
    type: z.literal("richtext"),
    value: z.string(),
    constraints: richtextConstraintsSchema.prefault({}),
  }),
  z.object({
    ...fieldBase,
    type: z.literal("image"),
    value: imageValueSchema,
    constraints: imageConstraintsSchema.prefault({}),
  }),
  z.object({
    ...fieldBase,
    type: z.literal("link"),
    value: linkValueSchema,
    constraints: linkConstraintsSchema.prefault({}),
  }),
  z.object({
    ...fieldBase,
    type: z.literal("cta"),
    value: linkValueSchema,
    constraints: linkConstraintsSchema.prefault({}),
  }),
  z.object({
    ...fieldBase,
    type: z.literal("video-embed"),
    value: videoEmbedValueSchema,
    constraints: emptyConstraintsSchema.prefault({}),
  }),
  z.object({
    ...fieldBase,
    type: z.literal("map-embed"),
    value: mapEmbedValueSchema,
    constraints: emptyConstraintsSchema.prefault({}),
  }),
  z.object({
    ...fieldBase,
    type: z.literal("icon"),
    value: iconValueSchema,
    constraints: emptyConstraintsSchema.prefault({}),
  }),
  z.object({
    ...fieldBase,
    type: z.literal("contact"),
    value: z.string(),
    constraints: textConstraintsSchema.prefault({}),
  }),
  z.object({
    ...fieldBase,
    type: z.literal("social"),
    value: socialValueSchema,
    constraints: emptyConstraintsSchema.prefault({}),
  }),
  z.object({
    ...fieldBase,
    type: z.literal("form-endpoint"),
    value: formEndpointValueSchema,
    constraints: emptyConstraintsSchema.prefault({}),
  }),
  z.object({
    ...fieldBase,
    type: z.literal("boolean"),
    value: z.boolean(),
    constraints: emptyConstraintsSchema.prefault({}),
  }),
]);

/* ── Collections répétables (§9.3) ─────────────────────────────────────────── */

/**
 * Un champ de gabarit n'a pas de `domPath` : il est relatif à l'item, repéré par
 * l'attribut `data-f="<key>"` posé dans `itemTemplate.html`.
 */
export const templateFieldSchema = z.object({
  key: z.string(),
  type: fieldTypeSchema,
  label: z.string(),
  constraints: z.record(z.string(), z.unknown()).default({}),
});

export const collectionItemSchema = z.object({
  itemId: z.string(),
  /** Chemin de l'élément d'origine. Absent pour un item ajouté par le client. */
  domPath: z.string().optional(),
  /** Valeurs indexées par `templateField.key`. */
  values: z.record(z.string(), z.unknown()),
  /** Localisation de chaque valeur dans le source, même indexation. */
  valueMeta: z.record(z.string(), valueLocationSchema).default({}),
  meta: fieldMetaSchema.partial().optional(),
});

export const collectionSchema = z.object({
  id: z.string(),
  label: z.string(),
  containerPath: z.string(),
  /** Signature du *groupe*, pas du premier item : les cartes sont souvent hétérogènes. */
  itemSignature: z.string(),
  /** Similarité moyenne du groupe [0..1]. En dessous du seuil, aucun groupe n'est formé. */
  cohesion: z.number().min(0).max(1).default(1),
  min: z.number().int().min(0).default(1),
  max: z.number().int().positive().default(12),
  /** Un groupe sous nav/footer est verrouillé par défaut (§9.3, faux positifs). */
  locked: z.boolean().default(false),
  itemTemplate: z.object({
    html: z.string(),
    fields: z.array(templateFieldSchema),
  }),
  items: z.array(collectionItemSchema),
});

/* ── Blocs et pages ────────────────────────────────────────────────────────── */

export const blockCapabilitySchema = z.enum(["hide", "reorder", "duplicate"]);

export const blockSchema = z.object({
  id: z.string(),
  label: z.string(),
  domPath: z.string(),
  capabilities: z.array(blockCapabilitySchema).default([]),
  fields: z.array(fieldSchema).default([]),
  collections: z.array(collectionSchema).default([]),
});

export const seoSchema = z.object({
  title: z.string().default(""),
  description: z.string().default(""),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImage: z.string().optional(),
  canonical: z.string().optional(),
  lang: z.string().optional(),
  favicon: z.string().optional(),
});

export const pageSchema = z.object({
  path: z.string(),
  label: z.string(),
  /** Une section `[id]` d'un one-page traitée comme page virtuelle (§8). */
  virtual: z.boolean().default(false),
  /**
   * Bloc visé par une page virtuelle. Une page virtuelle ne porte aucun bloc en
   * propre : elle est une entrée de navigation vers un bloc de la page réelle,
   * sans quoi le même contenu existerait à deux endroits du blueprint.
   */
  anchorBlockId: z.string().optional(),
  seo: seoSchema.default({ title: "", description: "" }),
  blocks: z.array(blockSchema).default([]),
});

/* ── Thème (§9.4) ──────────────────────────────────────────────────────────── */

export const tokenTypeSchema = z.enum([
  "color",
  "length",
  "font-family",
  "shadow",
  "radius",
]);

export const themeTokenSchema = z.object({
  id: z.string(),
  cssVar: z.string(),
  type: tokenTypeSchema,
  value: z.string(),
  label: z.string(),
  usageCount: z.number().int().min(0).default(0),
  /** Couleur déduite d'un comptage plutôt que d'une variable : opt-in admin (§9.4). */
  inferred: z.boolean().default(false),
});

export const themeFontSchema = z.object({
  id: z.string(),
  family: z.string(),
  source: z.enum(["google", "local", "system", "inconnu"]),
  role: z.enum(["headings", "body", "accent", "inconnu"]).default("inconnu"),
});

export const themeSchema = z.object({
  tokens: z.array(themeTokenSchema).default([]),
  fonts: z.array(themeFontSchema).default([]),
});

/* ── Globaux (contact, réseaux sociaux) ────────────────────────────────────── */

export const globalGroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  fields: z.array(
    fieldSchema.and(
      z.object({
        /** Pages où la valeur apparaît : une édition les met toutes à jour. */
        occurrences: z.array(z.string()).default([]),
        /**
         * Champs de page portant cette valeur. C'est par eux que l'édition se
         * propage : le builder réécrit chacun, le panneau global n'en est que
         * la commande.
         */
        fieldIds: z.array(z.string()).default([]),
      }),
    ),
  ),
});

/* ── Surcharges admin (§9.6) ───────────────────────────────────────────────── */

/**
 * Décision d'admin persistée, appliquée à l'analyse suivante. Priorité du §9.6 :
 * annotation explicite dans le HTML > surcharge admin > heuristique.
 */
export const fieldOverrideSchema = z.object({
  label: z.string().optional(),
  type: fieldTypeSchema.optional(),
  locked: z.boolean().optional(),
  /** Force l'apparition d'un champ que l'heuristique a verrouillé. */
  editable: z.boolean().optional(),
});

/* ── Verrous et avertissements ─────────────────────────────────────────────── */

export const lockReasonSchema = z.enum([
  "script",
  "style",
  "noscript",
  "head",
  "decoratif",
  "wrapper-vide",
  "texte-trop-court",
  "compteur-anime",
  /** Texte écrit par JavaScript au chargement : éditable, il serait écrasé. */
  "texte-dynamique",
  /** Champs de saisie et contrôles : le §9.2 n'autorise que les libellés. */
  "structure-formulaire",
  "shadow-dom",
  "navigation",
  "annotation",
  "override-admin",
]);

export const lockedNodeSchema = z.object({
  domPath: z.string(),
  reason: lockReasonSchema,
  detail: z.string().optional(),
});

export const warningCodeSchema = z.enum([
  "DYNAMIC_TEXT",
  "ANIM_LIB_DETECTED",
  "DOM_MUTATED_AT_RUNTIME",
  "SHADOW_DOM_DETECTED",
  "TEXT_SPLITTER_DETECTED",
  "NO_CSS_VARIABLES",
  "COLLECTION_HETEROGENE",
  "FRAGMENT_SANS_HTML",
  "IMAGE_MANQUANTE",
  "FORM_SANS_ENDPOINT",
  "TAILWIND_CDN",
]);

export const warningSchema = z.object({
  code: warningCodeSchema,
  message: z.string(),
  pagePath: z.string().optional(),
  domPath: z.string().optional(),
  severity: z.enum(["info", "attention"]).default("info"),
});

/* ── Blueprint ─────────────────────────────────────────────────────────────── */

export const blueprintSchema = z.object({
  blueprintVersion: z.string(),
  generatedAt: z.string(),
  parserVersion: z.string(),
  site: z.object({
    entry: z.string(),
    pageCount: z.number().int().min(0),
    /** `static-html` en v1 ; `next`, `vite`… en v2 (§24). */
    adapter: z.string().default("static-html"),
  }),
  theme: themeSchema.default({ tokens: [], fonts: [] }),
  globals: z.array(globalGroupSchema).default([]),
  pages: z.array(pageSchema).default([]),
  locked: z.array(lockedNodeSchema).default([]),
  warnings: z.array(warningSchema).default([]),
});

/* ── Calque de libellés produit par l'IA, appliqué à chaud (risque 5) ──────── */

export const labelPatchSchema = z.object({
  blueprintVersion: z.string(),
  generatedAt: z.string(),
  /** `fieldId` | `blockId` | `collectionId` → libellé en français naturel. */
  labels: z.record(z.string(), z.string()),
});

/* ── Types inférés ─────────────────────────────────────────────────────────── */

export type FieldType = z.infer<typeof fieldTypeSchema>;
export type SourceRange = z.infer<typeof sourceRangeSchema>;
export type FieldMeta = z.infer<typeof fieldMetaSchema>;
export type ValueLocation = z.infer<typeof valueLocationSchema>;
export type FieldOverride = z.infer<typeof fieldOverrideSchema>;
export type Field = z.infer<typeof fieldSchema>;
export type TemplateField = z.infer<typeof templateFieldSchema>;
export type CollectionItem = z.infer<typeof collectionItemSchema>;
export type Collection = z.infer<typeof collectionSchema>;
export type BlockCapability = z.infer<typeof blockCapabilitySchema>;
export type Block = z.infer<typeof blockSchema>;
export type Seo = z.infer<typeof seoSchema>;
export type Page = z.infer<typeof pageSchema>;
export type TokenType = z.infer<typeof tokenTypeSchema>;
export type ThemeToken = z.infer<typeof themeTokenSchema>;
export type ThemeFont = z.infer<typeof themeFontSchema>;
export type Theme = z.infer<typeof themeSchema>;
export type GlobalGroup = z.infer<typeof globalGroupSchema>;
export type LockReason = z.infer<typeof lockReasonSchema>;
export type LockedNode = z.infer<typeof lockedNodeSchema>;
export type WarningCode = z.infer<typeof warningCodeSchema>;
export type BlueprintWarning = z.infer<typeof warningSchema>;
export type Blueprint = z.infer<typeof blueprintSchema>;
export type LabelPatch = z.infer<typeof labelPatchSchema>;

/* ── Helpers de validation ─────────────────────────────────────────────────── */

export function parseBlueprint(input: unknown): Blueprint {
  return blueprintSchema.parse(input);
}

export function safeParseBlueprint(input: unknown) {
  return blueprintSchema.safeParse(input);
}
