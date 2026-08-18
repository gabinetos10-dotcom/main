import { and, desc, eq } from "drizzle-orm";
import type { Blueprint, ContentData } from "@calque/blueprint";
import type { DbHandle } from "../client";
import { withTenant } from "../tenant";
import {
  blueprints,
  contentDrafts,
  siteVersions,
  sites,
  type BlueprintStats,
  type SourceManifest,
} from "../schema/sites";
import { auditLogs } from "../schema/tenancy";

/**
 * Sites, versions de source et blueprints.
 *
 * Toutes les lectures et écritures passent par `withTenant` : c'est la barrière 2
 * du §16. Aucune méthode n'accepte d'`orgId` autre que celui du dépôt, pour
 * qu'un appelant ne puisse pas, par erreur de paramètre, lire le site d'un autre.
 */

export interface SiteRow {
  id: string;
  name: string;
  slug: string;
  status: (typeof sites.$inferSelect)["status"];
  previewSubdomain: string | null;
  liveUrl: string | null;
  currentVersionId: string | null;
  updatedAt: Date;
}

export interface IngestedVersion {
  siteVersionId: string;
  blueprintId: string;
}

export function sitesRepository(handle: DbHandle, orgId: string) {
  const dans = <T>(fn: Parameters<typeof withTenant<T>>[2]): Promise<T> =>
    withTenant(handle, orgId, fn);

  return {
    async list(): Promise<SiteRow[]> {
      return dans(async (db) =>
        db
          .select({
            id: sites.id,
            name: sites.name,
            slug: sites.slug,
            status: sites.status,
            previewSubdomain: sites.previewSubdomain,
            liveUrl: sites.liveUrl,
            currentVersionId: sites.currentVersionId,
            updatedAt: sites.updatedAt,
          })
          .from(sites)
          .where(eq(sites.orgId, orgId))
          .orderBy(desc(sites.updatedAt)),
      );
    },

    async bySlug(slug: string): Promise<SiteRow | null> {
      return dans(async (db) => {
        const lignes = await db
          .select({
            id: sites.id,
            name: sites.name,
            slug: sites.slug,
            status: sites.status,
            previewSubdomain: sites.previewSubdomain,
            liveUrl: sites.liveUrl,
            currentVersionId: sites.currentVersionId,
            updatedAt: sites.updatedAt,
          })
          .from(sites)
          .where(and(eq(sites.orgId, orgId), eq(sites.slug, slug)))
          .limit(1);
        return lignes[0] ?? null;
      });
    },

    async create(input: { name: string; slug: string }): Promise<SiteRow> {
      return dans(async (db) => {
        const [ligne] = await db
          .insert(sites)
          .values({
            orgId,
            name: input.name,
            slug: input.slug,
            status: "ingestion",
            previewSubdomain: `${input.slug}-${Math.random().toString(36).slice(2, 8)}`,
          })
          .returning();
        if (ligne === undefined) throw new Error("Création du site impossible.");
        return {
          id: ligne.id,
          name: ligne.name,
          slug: ligne.slug,
          status: ligne.status,
          previewSubdomain: ligne.previewSubdomain,
          liveUrl: ligne.liveUrl,
          currentVersionId: ligne.currentVersionId,
          updatedAt: ligne.updatedAt,
        };
      });
    },

    async setStatus(
      siteId: string,
      status: (typeof sites.$inferSelect)["status"],
    ): Promise<void> {
      await dans(async (db) => {
        await db
          .update(sites)
          .set({ status, updatedAt: new Date() })
          .where(and(eq(sites.id, siteId), eq(sites.orgId, orgId)));
      });
    },

    /**
     * Enregistre une livraison : le manifeste du source, le blueprint, et le
     * brouillon initial. En une transaction — un blueprint sans brouillon
     * laisserait l'éditeur devant un site vide.
     */
    /**
     * L'identifiant de version est **imposé par l'appelant**, pas généré ici.
     *
     * C'est le même que celui sous lequel les fichiers ont été écrits dans le
     * stockage : `sites/{siteId}/sources/{versionId}/…`. Laisser la base en
     * générer un autre obligerait à tenir une table de correspondance, et une
     * clé de stockage qu'on ne peut pas dériver d'une ligne est une clé perdue.
     */
    async recordIngestion(input: {
      siteId: string;
      siteVersionId: string;
      label: string;
      manifest: SourceManifest;
      blueprint: Blueprint;
      stats: BlueprintStats;
      initialContent: ContentData;
      createdBy: string | null;
    }): Promise<IngestedVersion> {
      return dans(async (db) => {
        const [version] = await db
          .insert(siteVersions)
          .values({
            id: input.siteVersionId,
            siteId: input.siteId,
            label: input.label,
            sourceManifest: input.manifest,
            createdBy: input.createdBy,
          })
          .returning({ id: siteVersions.id });
        if (version === undefined)
          throw new Error("Enregistrement de la version impossible.");

        const [plan] = await db
          .insert(blueprints)
          .values({
            siteId: input.siteId,
            siteVersionId: version.id,
            blueprint: input.blueprint,
            parserVersion: input.blueprint.parserVersion,
            stats: input.stats,
            warnings: input.blueprint.warnings,
          })
          .returning({ id: blueprints.id });
        if (plan === undefined)
          throw new Error("Enregistrement du blueprint impossible.");

        await db
          .insert(contentDrafts)
          .values({
            siteId: input.siteId,
            data: input.initialContent,
            updatedBy: input.createdBy,
          })
          .onConflictDoUpdate({
            target: contentDrafts.siteId,
            set: { data: input.initialContent, updatedAt: new Date() },
          });

        await db
          .update(sites)
          .set({ status: "pret", updatedAt: new Date() })
          .where(eq(sites.id, input.siteId));

        await db.insert(auditLogs).values({
          orgId,
          siteId: input.siteId,
          actorId: input.createdBy,
          action: "site.ingest",
          target: version.id,
          metadata: { pages: input.stats.pages, fields: input.stats.fields },
        });

        return { siteVersionId: version.id, blueprintId: plan.id };
      });
    },

    async latestBlueprint(siteId: string): Promise<{
      blueprint: Blueprint;
      siteVersionId: string;
      manifest: SourceManifest;
    } | null> {
      return dans(async (db) => {
        const lignes = await db
          .select({
            blueprint: blueprints.blueprint,
            siteVersionId: blueprints.siteVersionId,
            manifest: siteVersions.sourceManifest,
          })
          .from(blueprints)
          .innerJoin(siteVersions, eq(blueprints.siteVersionId, siteVersions.id))
          .where(and(eq(blueprints.siteId, siteId), eq(siteVersions.siteId, siteId)))
          .orderBy(desc(blueprints.createdAt))
          .limit(1);
        return lignes[0] ?? null;
      });
    },
  };
}
