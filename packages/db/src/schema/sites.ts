import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  Blueprint,
  BlueprintWarning,
  ContentData,
  ContentDiff,
} from "@calque/blueprint";
import { deploymentStatusEnum, hostProviderEnum, siteStatusEnum } from "./enums";
import { organizations } from "./tenancy";
import { users } from "./auth";

/** Manifeste du snapshot source immuable (§8, étape 3). */
export interface SourceManifest {
  entry: string;
  totalBytes: number;
  files: Array<{
    path: string;
    kind: string;
    bytes: number;
    sha256: string;
    /** Clé R2 : `sites/{siteId}/sources/{versionId}/{path}`. */
    key: string;
  }>;
}

export interface BlueprintStats {
  pages: number;
  fields: number;
  images: number;
  collections: number;
  lockedNodes: number;
  durationMs: number;
}

/** Variantes générées par sharp (§14) : `webp`/`avif` en 400/800/1200/1600. */
export interface MediaVariants {
  widths: number[];
  formats: Array<"webp" | "avif" | "jpeg" | "png">;
  keys: Record<string, string>;
}

export const sites = pgTable(
  "sites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: siteStatusEnum("status").notNull().default("ingestion"),
    /** Sous-domaine d'aperçu sur `*.calque-preview.site` (eTLD+1 distinct, §11). */
    previewSubdomain: text("preview_subdomain").unique(),
    liveUrl: text("live_url"),
    hostProvider: hostProviderEnum("host_provider").default("cloudflare"),
    hostProjectId: text("host_project_id"),
    customDomain: text("custom_domain"),
    /**
     * Dernière version de contenu publiée. Sans clé étrangère : la référence
     * inverse (`content_versions.site_id`) existe déjà et une contrainte
     * circulaire compliquerait la création initiale d'un site sans rien apporter.
     */
    currentVersionId: uuid("current_version_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("sites_org_slug_uq").on(t.orgId, t.slug),
    index("sites_slug_idx").on(t.slug),
    index("sites_org_id_idx").on(t.orgId),
  ],
);

/** Snapshot immuable des fichiers déposés par l'agence. Jamais muté (§5). */
export const siteVersions = pgTable(
  "site_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    label: text("label").notNull().default("Livraison initiale"),
    sourceManifest: jsonb("source_manifest_json").$type<SourceManifest>().notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("site_versions_site_id_idx").on(t.siteId)],
);

export const blueprints = pgTable(
  "blueprints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    siteVersionId: uuid("site_version_id")
      .notNull()
      .references(() => siteVersions.id, { onDelete: "cascade" }),
    blueprint: jsonb("blueprint_json").$type<Blueprint>().notNull(),
    parserVersion: text("parser_version").notNull(),
    stats: jsonb("stats_json").$type<BlueprintStats>().notNull(),
    warnings: jsonb("warnings_json").$type<BlueprintWarning[]>().notNull().default([]),
    /**
     * Les libellés produits par l'IA arrivent après coup, hors du chemin critique
     * des 60 secondes (§7). Nul tant que le calque n'est pas prêt.
     */
    labelsAppliedAt: timestamp("labels_applied_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("blueprints_site_id_idx").on(t.siteId),
    index("blueprints_site_version_id_idx").on(t.siteVersionId),
  ],
);

/** Surcharges admin : priorité annotation > override > heuristique (§9.6). */
export const fieldOverrides = pgTable(
  "field_overrides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    fieldId: text("field_id").notNull(),
    label: text("label"),
    editable: boolean("editable").notNull().default(true),
    hidden: boolean("hidden").notNull().default(false),
    constraints: jsonb("constraints_json")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("field_overrides_site_field_uq").on(t.siteId, t.fieldId)],
);

/** Un seul brouillon actif par site (§10). Le verrou d'édition vit ici. */
export const contentDrafts = pgTable(
  "content_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" })
      .unique(),
    data: jsonb("data_json").$type<ContentData>().notNull(),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    /** Verrou coopératif, rafraîchi toutes les 30 s par un heartbeat (§10). */
    lockHolder: uuid("lock_holder").references(() => users.id, { onDelete: "set null" }),
    lockExpiresAt: timestamp("lock_expires_at", { withTimezone: true }),
  },
  (t) => [index("content_drafts_site_id_idx").on(t.siteId)],
);

/** Snapshot immuable publié. Un rollback crée une nouvelle version, n'en supprime aucune. */
export const contentVersions = pgTable(
  "content_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    data: jsonb("data_json").$type<ContentData>().notNull(),
    diff: jsonb("diff_json").$type<ContentDiff>().notNull().default({
      fields: [],
      summary: "",
    }),
    /** Renseigné quand la version naît d'un retour arrière (§10). */
    rolledBackFrom: uuid("rolled_back_from"),
    publishedBy: uuid("published_by").references(() => users.id, {
      onDelete: "set null",
    }),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("content_versions_site_number_uq").on(t.siteId, t.number),
    index("content_versions_site_id_idx").on(t.siteId),
  ],
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    mime: text("mime").notNull(),
    bytes: bigint("bytes", { mode: "number" }).notNull(),
    width: integer("width"),
    height: integer("height"),
    /** SHA-256 du binaire original : sert au dédoublonnage (§14). */
    hash: text("hash").notNull(),
    alt: text("alt").notNull().default(""),
    variants: jsonb("variants_json").$type<MediaVariants>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("media_assets_site_hash_uq").on(t.siteId, t.hash),
    index("media_assets_site_id_idx").on(t.siteId),
  ],
);

export const deployments = pgTable(
  "deployments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    contentVersionId: uuid("content_version_id").references(() => contentVersions.id, {
      onDelete: "set null",
    }),
    status: deploymentStatusEnum("status").notNull().default("en_attente"),
    providerDeployId: text("provider_deploy_id"),
    buildArtifactKey: text("build_artifact_key"),
    log: text("log"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [index("deployments_site_id_started_at_idx").on(t.siteId, t.startedAt)],
);
