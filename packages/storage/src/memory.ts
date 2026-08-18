import { ObjectNotFound, type ObjectStore, type StoredObject } from "./types";

/**
 * Stockage en mémoire, pour les tests.
 *
 * Il implémente le même contrat que R2, y compris le fait qu'une lecture d'une
 * clé absente lève : les appelants n'ont donc jamais de comportement différent
 * en test et en production.
 */
export function createMemoryStore(): ObjectStore & { size(): number } {
  const objets = new Map<string, Uint8Array>();

  return {
    id: "memory",

    async put(key, content) {
      objets.set(key, new Uint8Array(content));
    },

    async get(key) {
      const contenu = objets.get(key);
      if (contenu === undefined) throw new ObjectNotFound(key);
      return contenu;
    },

    async has(key) {
      return objets.has(key);
    },

    async list(prefix) {
      const resultat: StoredObject[] = [];
      for (const [key, contenu] of objets) {
        if (key.startsWith(prefix)) resultat.push({ key, size: contenu.byteLength });
      }
      return resultat.sort((a, b) => a.key.localeCompare(b.key));
    },

    async delete(key) {
      objets.delete(key);
    },

    async deletePrefix(prefix) {
      for (const key of [...objets.keys()]) {
        if (key.startsWith(prefix)) objets.delete(key);
      }
    },

    size() {
      return objets.size;
    },
  };
}
