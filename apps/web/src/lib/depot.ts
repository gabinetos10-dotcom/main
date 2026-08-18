import { keys, presignR2Url } from "@calque/storage";
import { serverEnv } from "@/env";

/**
 * Cible d'écriture directe dans le stockage.
 *
 * Le navigateur écrit lui-même : une archive fait jusqu'à 100 Mo (§8), une image
 * jusqu'à 10 (§14), et faire transiter cela par une fonction serverless la ferait
 * buter sur la limite de corps de requête de l'hébergeur.
 *
 * En développement, la cible est une route de l'application protégée par la
 * session ; en production, une URL R2 signée pour cette seule clé, valable
 * quinze minutes.
 */

export interface UploadTarget {
  url: string;
  method: "PUT";
  /** Vrai quand l'URL est servie par l'application elle-même. */
  sameOrigin: boolean;
  key: string;
}

export function createUploadTarget(siteId: string, key: string): UploadTarget {
  // La clé doit rester dans l'espace du site : elle finit dans un chemin de
  // stockage, et une clé venue d'ailleurs écrirait chez un autre client.
  if (!key.startsWith(`sites/${siteId}/`)) {
    throw new Error("Clé de dépôt hors du périmètre du site.");
  }

  const env = serverEnv();

  if (env.STORAGE_DRIVER === "r2") {
    return {
      url: presignR2Url(
        {
          accountId: env.R2_ACCOUNT_ID,
          bucket: env.R2_BUCKET,
          accessKeyId: env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        },
        { key, method: "PUT", expiresInSeconds: 900 },
      ),
      method: "PUT",
      sameOrigin: false,
      key,
    };
  }

  return {
    url: `/api/depot/${siteId}?cle=${encodeURIComponent(key)}`,
    method: "PUT",
    sameOrigin: true,
    key,
  };
}

export function cleArchive(siteId: string, versionId: string): string {
  return keys.archive(siteId, versionId);
}

/** Emplacement temporaire d'un média avant traitement par sharp (§14). */
export function cleDepotMedia(siteId: string, jeton: string): string {
  return `sites/${siteId}/depots/${jeton}`;
}
