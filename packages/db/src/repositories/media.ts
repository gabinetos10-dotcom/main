import { and, desc, eq } from "drizzle-orm";
import type { DbHandle } from "../client";
import { withTenant } from "../tenant";
import { mediaAssets, sites, type MediaVariants } from "../schema/sites";

/**
 * Bibliothèque de médias d'un site (§14).
 *
 * Le dédoublonnage se fait par empreinte : redéposer le même fichier met à jour
 * la ligne existante au lieu d'en créer une seconde. Une agence redépose souvent
 * le même logo, et deux entrées identiques dans la bibliothèque du client sont
 * une source de confusion, pas de choix.
 */

export interface MediaRow {
  id: string;
  path: string;
  mime: string;
  bytes: number;
  width: number | null;
  height: number | null;
  hash: string;
  alt: string;
  variants: MediaVariants | null;
  createdAt: Date;
}

export function mediaRepository(handle: DbHandle, orgId: string) {
  const dans = <T>(fn: Parameters<typeof withTenant<T>>[2]): Promise<T> =>
    withTenant(handle, orgId, fn);

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
    async list(siteId: string): Promise<MediaRow[]> {
      return dans(async (db) => {
        await verifierSite(db, siteId);
        return db
          .select({
            id: mediaAssets.id,
            path: mediaAssets.path,
            mime: mediaAssets.mime,
            bytes: mediaAssets.bytes,
            width: mediaAssets.width,
            height: mediaAssets.height,
            hash: mediaAssets.hash,
            alt: mediaAssets.alt,
            variants: mediaAssets.variants,
            createdAt: mediaAssets.createdAt,
          })
          .from(mediaAssets)
          .where(eq(mediaAssets.siteId, siteId))
          .orderBy(desc(mediaAssets.createdAt));
      });
    },

    async upsert(input: {
      siteId: string;
      path: string;
      mime: string;
      bytes: number;
      width: number | null;
      height: number | null;
      hash: string;
      alt: string;
      variants: MediaVariants | null;
    }): Promise<MediaRow> {
      return dans(async (db) => {
        await verifierSite(db, input.siteId);
        const [ligne] = await db
          .insert(mediaAssets)
          .values(input)
          .onConflictDoUpdate({
            target: [mediaAssets.siteId, mediaAssets.hash],
            set: {
              path: input.path,
              bytes: input.bytes,
              width: input.width,
              height: input.height,
              variants: input.variants,
            },
          })
          .returning({
            id: mediaAssets.id,
            path: mediaAssets.path,
            mime: mediaAssets.mime,
            bytes: mediaAssets.bytes,
            width: mediaAssets.width,
            height: mediaAssets.height,
            hash: mediaAssets.hash,
            alt: mediaAssets.alt,
            variants: mediaAssets.variants,
            createdAt: mediaAssets.createdAt,
          });
        if (ligne === undefined) throw new Error("Enregistrement du média impossible.");
        return ligne;
      });
    },

    /** Le texte alternatif est obligatoire (§14) : il se corrige, il ne se vide pas. */
    async setAlt(input: { siteId: string; mediaId: string; alt: string }): Promise<void> {
      await dans(async (db) => {
        await verifierSite(db, input.siteId);
        await db
          .update(mediaAssets)
          .set({ alt: input.alt })
          .where(
            and(eq(mediaAssets.id, input.mediaId), eq(mediaAssets.siteId, input.siteId)),
          );
      });
    },

    /** Octets consommés par le site, pour le quota de stockage du plan (§16). */
    async totalBytes(siteId: string): Promise<number> {
      return dans(async (db) => {
        await verifierSite(db, siteId);
        const lignes = await db
          .select({ bytes: mediaAssets.bytes })
          .from(mediaAssets)
          .where(eq(mediaAssets.siteId, siteId));
        return lignes.reduce((total, ligne) => total + ligne.bytes, 0);
      });
    },
  };
}
