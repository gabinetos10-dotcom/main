import { describe, expect, it } from "vitest";
import { extractZip } from "../src/zip";
import { IngestError, inspectEntry, normalizeEntryPath } from "../src/security";
import { zipOf } from "./helpers";

/**
 * Sécurité du dépôt (§8.1).
 *
 * Une archive vient de l'extérieur. Chaque test ici correspond à une façon
 * connue de sortir du dossier d'extraction, de saturer la machine, ou de faire
 * exécuter du code par l'hébergeur qui servira le site.
 */

describe("normalizeEntryPath", () => {
  it("refuse ce qui sort de l'archive", () => {
    expect(normalizeEntryPath("../secret")).toBeNull();
    expect(normalizeEntryPath("a/../../etc/passwd")).toBeNull();
    expect(normalizeEntryPath("/etc/passwd")).toBeNull();
    expect(normalizeEntryPath("C:\\Windows\\x")).toBeNull();
    expect(normalizeEntryPath("a\0b")).toBeNull();
  });

  it("normalise les séparateurs et les segments inutiles", () => {
    expect(normalizeEntryPath("a\\b\\c.html")).toBe("a/b/c.html");
    expect(normalizeEntryPath("./a//b.css")).toBe("a/b.css");
  });
});

describe("inspectEntry", () => {
  const petit = { compressed: 100, uncompressed: 200 };

  it("écarte les extensions que l'hébergeur exécuterait", () => {
    for (const chemin of ["shell.php", "a/b.asp", "config.env", "dump.sql", "x.sh"]) {
      expect(inspectEntry(chemin, petit).rejection?.code, chemin).toBe(
        "extension-serveur",
      );
    }
  });

  it("écarte les dossiers techniques", () => {
    expect(inspectEntry(".git/config", petit).rejection?.code).toBe("dossier-exclu");
    expect(inspectEntry("node_modules/x/y.js", petit).rejection?.code).toBe(
      "dossier-exclu",
    );
    expect(inspectEntry("__MACOSX/._index.html", petit).rejection?.code).toBe(
      "dossier-exclu",
    );
  });

  it("écarte les fichiers système sans rien dire de plus", () => {
    expect(inspectEntry(".DS_Store", petit).rejection?.code).toBe("fichier-cache");
  });

  it("laisse passer un site ordinaire", () => {
    expect(inspectEntry("index.html", petit).path).toBe("index.html");
    expect(inspectEntry("assets/hero.jpg", petit).path).toBe("assets/hero.jpg");
  });

  it("repère une bombe de décompression", () => {
    const bombe = { compressed: 1024, uncompressed: 400 * 1024 * 1024 };
    expect(inspectEntry("bombe.txt", bombe).rejection?.code).toBe("fichier-trop-gros");

    const ratio = { compressed: 10_000, uncompressed: 5 * 1024 * 1024 };
    expect(inspectEntry("ratio.txt", ratio).rejection?.code).toBe("taux-de-compression");
  });
});

describe("extractZip", () => {
  it("extrait un site ordinaire et trie les chemins", async () => {
    const resultat = await extractZip(
      zipOf({
        "index.html": "<!DOCTYPE html><html><body><h1>Bonjour</h1></body></html>",
        "styles.css": "body{margin:0}",
      }),
    );
    expect(resultat.files.map((f) => f.path)).toEqual(["index.html", "styles.css"]);
    expect(resultat.rejections).toEqual([]);
  });

  /**
   * Le dépôt ne doit pas échouer pour un `.DS_Store` : les entrées douteuses
   * sont écartées et listées, le reste est ingéré.
   */
  it("écarte les entrées douteuses sans faire échouer le dépôt", async () => {
    const resultat = await extractZip(
      zipOf({
        "index.html": "<html><body>ok</body></html>",
        ".DS_Store": "x",
        "shell.php": "<?php system($_GET['c']); ?>",
        ".git/config": "[core]",
        "../evasion.html": "<html></html>",
      }),
    );

    expect(resultat.files.map((f) => f.path)).toEqual(["index.html"]);
    expect(resultat.rejections.map((r) => r.code).sort()).toEqual([
      "chemin-hors-archive",
      "dossier-exclu",
      "extension-serveur",
      "fichier-cache",
    ]);
  });

  it("refuse une archive au-delà de la limite de taille", async () => {
    const enorme = new Uint8Array(101 * 1024 * 1024);
    await expect(extractZip(enorme)).rejects.toThrow(IngestError);
  });

  it("refuse une archive illisible plutôt que de produire des fichiers vides", async () => {
    await expect(extractZip(new Uint8Array([1, 2, 3, 4]))).rejects.toThrow(
      /n'a pas pu être ouverte/u,
    );
  });
});
