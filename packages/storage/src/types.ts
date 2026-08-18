/**
 * Stockage objet (§3 : Cloudflare R2, S3-compatible).
 *
 * L'interface est volontairement pauvre : poser, lire, lister, supprimer. Tout
 * ce que le produit stocke est immuable — sources déposées, médias, builds
 * archivés — donc rien n'a besoin d'être modifié en place.
 */

export interface PutOptions {
  contentType?: string;
  /** Immuable par défaut : ces objets ne changent jamais sous une même clé. */
  cacheControl?: string;
}

export interface StoredObject {
  key: string;
  size: number;
}

export interface ObjectStore {
  readonly id: string;
  put(key: string, content: Uint8Array, options?: PutOptions): Promise<void>;
  get(key: string): Promise<Uint8Array>;
  has(key: string): Promise<boolean>;
  list(prefix: string): Promise<StoredObject[]>;
  delete(key: string): Promise<void>;
  deletePrefix(prefix: string): Promise<void>;
}

export class ObjectNotFound extends Error {
  constructor(readonly key: string) {
    super(`Objet introuvable : ${key}`);
    this.name = "ObjectNotFound";
  }
}

/**
 * Clés du produit. Regroupées ici pour qu'on puisse lire, d'un coup d'œil, tout
 * ce que le stockage contient — et pour qu'aucun module ne fabrique une clé
 * dans son coin.
 */
export const keys = {
  source: (siteId: string, versionId: string, path: string): string =>
    `sites/${siteId}/sources/${versionId}/${path}`,
  sourcePrefix: (siteId: string, versionId: string): string =>
    `sites/${siteId}/sources/${versionId}/`,
  archive: (siteId: string, versionId: string): string =>
    `sites/${siteId}/archives/${versionId}.zip`,
  build: (siteId: string, deploymentId: string, path: string): string =>
    `sites/${siteId}/builds/${deploymentId}/${path}`,
  buildPrefix: (siteId: string, deploymentId: string): string =>
    `sites/${siteId}/builds/${deploymentId}/`,
  media: (siteId: string, hash: string, variant: string): string =>
    `sites/${siteId}/medias/${hash}/${variant}`,
  mediaPrefix: (siteId: string): string => `sites/${siteId}/medias/`,
} as const;
