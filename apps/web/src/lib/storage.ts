import { createFilesystemStore, createR2Store, type ObjectStore } from "@calque/storage";
import { serverEnv } from "@/env";

/**
 * Stockage objet de l'application (§3).
 *
 * Un seul point de résolution, côté serveur uniquement : les clés R2 ne doivent
 * jamais approcher d'un bundle client (§4). Le pilote disque sert au
 * développement et aux tests de bout en bout ; l'environnement refuse de démarrer
 * en production sans R2.
 */
let cache: ObjectStore | undefined;

export function objectStore(): ObjectStore {
  if (cache !== undefined) return cache;
  const env = serverEnv();

  cache =
    env.STORAGE_DRIVER === "r2"
      ? createR2Store({
          accountId: env.R2_ACCOUNT_ID,
          bucket: env.R2_BUCKET,
          accessKeyId: env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        })
      : createFilesystemStore(env.STORAGE_DIR);

  return cache;
}
