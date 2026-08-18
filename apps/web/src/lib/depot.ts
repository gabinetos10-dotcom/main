import { randomUUID } from "node:crypto";
import { keys } from "@calque/storage";
import { presignR2Url } from "@calque/storage";
import { serverEnv } from "@/env";

/**
 * Cible de dépôt d'une archive.
 *
 * Le navigateur écrit **directement** dans le stockage : une archive fait
 * jusqu'à 100 Mo (§8) et la faire transiter par une fonction serverless la
 * ferait buter sur la limite de corps de requête de l'hébergeur.
 *
 * En développement, la cible est une route de l'application, protégée par la
 * session ; en production, une URL R2 signée pour cette seule clé, valable
 * quinze minutes.
 */

export interface UploadTarget {
  url: string;
  method: "PUT";
  /** Vrai quand l'URL est servie par l'application elle-même. */
  sameOrigin: boolean;
  versionId: string;
}

export function createUploadTarget(siteId: string): UploadTarget {
  const versionId = randomUUID();
  const env = serverEnv();
  const key = keys.archive(siteId, versionId);

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
      versionId,
    };
  }

  return {
    url: `/api/depot/${siteId}/${versionId}`,
    method: "PUT",
    sameOrigin: true,
    versionId,
  };
}
