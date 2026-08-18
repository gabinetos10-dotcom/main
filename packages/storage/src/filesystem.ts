import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { ObjectNotFound, type ObjectStore, type StoredObject } from "./types";

/**
 * Stockage sur disque, pour le développement local et les tests de bout en bout.
 *
 * Les clés sont des chemins relatifs : elles ne peuvent pas contenir `..`, et
 * une clé qui sortirait du dossier racine est refusée. Sans cette vérification,
 * une clé fabriquée à partir d'une entrée utilisateur écrirait n'importe où.
 */
export function createFilesystemStore(racine: string): ObjectStore {
  const resoudre = (key: string): string => {
    const complet = join(racine, key);
    const relatif = relative(racine, complet);
    if (relatif.startsWith("..") || relatif.startsWith(sep) || relatif.length === 0) {
      throw new Error(`Clé de stockage invalide : ${key}`);
    }
    return complet;
  };

  return {
    id: "filesystem",

    async put(key, content) {
      const chemin = resoudre(key);
      await mkdir(dirname(chemin), { recursive: true });
      await writeFile(chemin, content);
    },

    async get(key) {
      try {
        return new Uint8Array(await readFile(resoudre(key)));
      } catch {
        throw new ObjectNotFound(key);
      }
    },

    async has(key) {
      try {
        await stat(resoudre(key));
        return true;
      } catch {
        return false;
      }
    },

    async list(prefix) {
      const resultat: StoredObject[] = [];

      const parcourir = async (dossier: string): Promise<void> => {
        let entrees;
        try {
          entrees = await readdir(dossier, { withFileTypes: true });
        } catch {
          return;
        }
        for (const entree of entrees) {
          const complet = join(dossier, entree.name);
          if (entree.isDirectory()) {
            await parcourir(complet);
            continue;
          }
          const key = relative(racine, complet).split(sep).join("/");
          if (!key.startsWith(prefix)) continue;
          resultat.push({ key, size: (await stat(complet)).size });
        }
      };

      await parcourir(racine);
      return resultat.sort((a, b) => a.key.localeCompare(b.key));
    },

    async delete(key) {
      await rm(resoudre(key), { force: true });
    },

    async deletePrefix(prefix) {
      for (const objet of await this.list(prefix)) {
        await rm(resoudre(objet.key), { force: true });
      }
    },
  };
}
