import { and, eq } from "drizzle-orm";
import type { ContentData, ContentPatch } from "@calque/blueprint";
import type { DbHandle } from "../client";
import { withTenant } from "../tenant";
import { contentDrafts, sites } from "../schema/sites";

/**
 * Brouillon de contenu — un seul par site (§10).
 *
 * Le brouillon est écrasé à chaque autosave, jamais versionné : l'historique
 * naît à la publication, sous forme de `content_versions` immuables. Garder
 * l'historique de chaque frappe coûterait cher pour une information que
 * personne ne consulte.
 */

export interface DraftRow {
  siteId: string;
  data: ContentData;
  updatedAt: Date;
  lockHolder: string | null;
  lockExpiresAt: Date | null;
}

/** Durée du verrou d'édition coopératif, rafraîchi par un heartbeat (§10). */
export const DUREE_VERROU_MS = 90_000;

export function draftsRepository(handle: DbHandle, orgId: string) {
  const dans = <T>(fn: Parameters<typeof withTenant<T>>[2]): Promise<T> =>
    withTenant(handle, orgId, fn);

  /** Le site doit appartenir à l'organisation : jamais de confiance à l'appelant. */
  const verifierSite = async (
    db: Parameters<Parameters<typeof withTenant<unknown>>[2]>[0],
    siteId: string,
  ): Promise<void> => {
    const lignes = await db
      .select({ id: sites.id })
      .from(sites)
      .where(and(eq(sites.id, siteId), eq(sites.orgId, orgId)))
      .limit(1);
    if (lignes.length === 0) throw new Error("Site inconnu pour cette organisation.");
  };

  return {
    async get(siteId: string): Promise<DraftRow | null> {
      return dans(async (db) => {
        await verifierSite(db, siteId);
        const lignes = await db
          .select({
            siteId: contentDrafts.siteId,
            data: contentDrafts.data,
            updatedAt: contentDrafts.updatedAt,
            lockHolder: contentDrafts.lockHolder,
            lockExpiresAt: contentDrafts.lockExpiresAt,
          })
          .from(contentDrafts)
          .where(eq(contentDrafts.siteId, siteId))
          .limit(1);
        return lignes[0] ?? null;
      });
    },

    /**
     * Fusionne un patch dans le brouillon (§10, autosave).
     *
     * La fusion se fait dans la transaction, à partir de l'état relu : deux
     * onglets ouverts sur le même site n'écrasent pas mutuellement l'intégralité
     * du contenu, seulement les mêmes champs.
     */
    async merge(input: {
      siteId: string;
      patch: ContentPatch;
      userId: string;
    }): Promise<ContentData> {
      return dans(async (db) => {
        await verifierSite(db, input.siteId);

        const lignes = await db
          .select({ data: contentDrafts.data })
          .from(contentDrafts)
          .where(eq(contentDrafts.siteId, input.siteId))
          .limit(1);

        const actuel = lignes[0]?.data;
        if (actuel === undefined) throw new Error("Aucun brouillon pour ce site.");

        const fusionne: ContentData = {
          fields: { ...actuel.fields, ...input.patch.fields },
          collections: { ...actuel.collections, ...input.patch.collections },
          blocks: { ...actuel.blocks, ...input.patch.blocks },
          theme: { ...actuel.theme, ...input.patch.theme },
          seo: { ...actuel.seo, ...input.patch.seo },
          globals: { ...actuel.globals, ...input.patch.globals },
        };

        await db
          .update(contentDrafts)
          .set({ data: fusionne, updatedBy: input.userId, updatedAt: new Date() })
          .where(eq(contentDrafts.siteId, input.siteId));

        return fusionne;
      });
    },

    async replace(input: {
      siteId: string;
      data: ContentData;
      userId: string;
    }): Promise<void> {
      await dans(async (db) => {
        await verifierSite(db, input.siteId);
        await db
          .update(contentDrafts)
          .set({ data: input.data, updatedBy: input.userId, updatedAt: new Date() })
          .where(eq(contentDrafts.siteId, input.siteId));
      });
    },

    /**
     * Verrou d'édition coopératif (§10).
     *
     * Coopératif et non exclusif : il sert à afficher « Marie est en train
     * d'éditer », pas à empêcher. Un verrou dur laisserait un site bloqué
     * derrière un onglet fermé sans déconnexion.
     */
    async acquireLock(input: {
      siteId: string;
      userId: string;
      now?: Date;
    }): Promise<{ acquired: boolean; holder: string | null }> {
      return dans(async (db) => {
        await verifierSite(db, input.siteId);
        const maintenant = input.now ?? new Date();

        const lignes = await db
          .select({
            lockHolder: contentDrafts.lockHolder,
            lockExpiresAt: contentDrafts.lockExpiresAt,
          })
          .from(contentDrafts)
          .where(eq(contentDrafts.siteId, input.siteId))
          .limit(1);

        const actuel = lignes[0];
        const encoreValide =
          actuel?.lockExpiresAt !== null &&
          actuel?.lockExpiresAt !== undefined &&
          actuel.lockExpiresAt > maintenant;

        if (
          encoreValide &&
          actuel?.lockHolder !== null &&
          actuel?.lockHolder !== input.userId
        ) {
          return { acquired: false, holder: actuel?.lockHolder ?? null };
        }

        await db
          .update(contentDrafts)
          .set({
            lockHolder: input.userId,
            lockExpiresAt: new Date(maintenant.getTime() + DUREE_VERROU_MS),
          })
          .where(eq(contentDrafts.siteId, input.siteId));

        return { acquired: true, holder: input.userId };
      });
    },
  };
}
