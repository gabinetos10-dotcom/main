import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createFilesystemStore,
  createMemoryStore,
  ObjectNotFound,
  keys,
  type ObjectStore,
} from "../src/index";

/**
 * Les pilotes de stockage doivent être interchangeables : le même contrat, les
 * mêmes erreurs. Un test qui passerait en mémoire mais pas sur disque cacherait
 * un bug jusqu'à la production.
 */

let dossier: string;
const pilotes: Array<[string, () => ObjectStore]> = [];

beforeAll(async () => {
  dossier = await mkdtemp(join(tmpdir(), "calque-store-"));
  pilotes.push(["mémoire", () => createMemoryStore()]);
  pilotes.push(["disque", () => createFilesystemStore(dossier)]);
});

afterAll(async () => {
  await rm(dossier, { recursive: true, force: true });
});

describe("contrat commun", () => {
  it("pose, relit, liste et supprime", async () => {
    for (const [nom, fabrique] of pilotes) {
      const store = fabrique();
      const contenu = new TextEncoder().encode("<h1>Bonjour</h1>");

      await store.put("sites/a/sources/v1/index.html", contenu);
      expect(await store.has("sites/a/sources/v1/index.html"), nom).toBe(true);
      expect(await store.get("sites/a/sources/v1/index.html"), nom).toEqual(contenu);

      await store.put("sites/a/sources/v1/style.css", new TextEncoder().encode("body{}"));
      const listés = await store.list("sites/a/sources/v1/");
      expect(
        listés.map((objet) => objet.key),
        nom,
      ).toEqual(["sites/a/sources/v1/index.html", "sites/a/sources/v1/style.css"]);

      await store.delete("sites/a/sources/v1/index.html");
      expect(await store.has("sites/a/sources/v1/index.html"), nom).toBe(false);

      await store.deletePrefix("sites/a/");
      expect(await store.list("sites/a/"), nom).toEqual([]);
    }
  });

  it("lève la même erreur sur une clé absente", async () => {
    for (const [nom, fabrique] of pilotes) {
      await expect(fabrique().get("absent"), nom).rejects.toThrow(ObjectNotFound);
    }
  });
});

describe("stockage sur disque", () => {
  it("refuse une clé qui sortirait du dossier racine", async () => {
    const store = createFilesystemStore(dossier);
    await expect(store.put("../evasion", new Uint8Array([1]))).rejects.toThrow(
      /Clé de stockage invalide/u,
    );
  });
});

describe("clés du produit", () => {
  it("range chaque chose à sa place", () => {
    expect(keys.source("s1", "v1", "assets/a.jpg")).toBe(
      "sites/s1/sources/v1/assets/a.jpg",
    );
    expect(keys.build("s1", "d1", "index.html")).toBe("sites/s1/builds/d1/index.html");
    expect(keys.archive("s1", "v1")).toBe("sites/s1/archives/v1.zip");
    // Les préfixes doivent se terminer par un séparateur, sinon `list` déborde
    // sur une version dont l'identifiant commence pareil.
    expect(keys.sourcePrefix("s1", "v1").endsWith("/")).toBe(true);
    expect(keys.buildPrefix("s1", "d1").endsWith("/")).toBe(true);
  });
});
