import { describe, expect, it } from "vitest";
import { FIXTURE_NAMES } from "@calque/fixtures";
import { createMemoryStore, keys } from "@calque/storage";
import { ingestArchive, IngestError } from "../src/index";
import { zipFixture, zipOf } from "./helpers";

/**
 * Job INGEST de bout en bout (§8) : archive → source immuable + blueprint.
 *
 * Critère d'acceptation du §22 P4 : « dépôt d'un ZIP → blueprint + rapport en
 * moins de 60 s ». Les fixtures s'ingèrent en quelques centaines de
 * millisecondes ; le test le vérifie plutôt que de le supposer.
 */

const EPOCH = new Date("2026-01-01T00:00:00.000Z");

describe.each(FIXTURE_NAMES)("ingestion de %s", (fixture) => {
  it("produit un blueprint et un rapport en bien moins de 60 secondes", async () => {
    const store = createMemoryStore();
    const resultat = await ingestArchive({
      archive: await zipFixture(fixture),
      siteId: "site_1",
      versionId: "ver_1",
      store,
      now: EPOCH,
    });

    expect(resultat.blueprint.pages.length).toBeGreaterThan(0);
    expect(resultat.report.durationMs).toBeLessThan(60_000);
    expect(resultat.report.detected.fields).toBeGreaterThan(20);
  });

  it("écrit chaque fichier du site dans le stockage, sous la version déposée", async () => {
    const store = createMemoryStore();
    const resultat = await ingestArchive({
      archive: await zipFixture(fixture),
      siteId: "site_1",
      versionId: "ver_1",
      store,
      now: EPOCH,
    });

    const stockes = await store.list(keys.sourcePrefix("site_1", "ver_1"));
    expect(stockes.length).toBe(resultat.report.files.total);
    expect(await store.has(keys.archive("site_1", "ver_1"))).toBe(true);
  });

  it("permet de relire un binaire à la demande, sans l'avoir gardé en mémoire", async () => {
    const store = createMemoryStore();
    const { snapshot } = await ingestArchive({
      archive: await zipFixture(fixture),
      siteId: "site_1",
      versionId: "ver_1",
      store,
      now: EPOCH,
    });

    const image = snapshot.files.find((fichier) => fichier.kind === "asset");
    expect(image?.content).toBeUndefined();
    const octets = await snapshot.read(image?.path as string);
    expect(octets.byteLength).toBe(image?.bytes);
  });

  it("deux dépôts successifs coexistent sans se recouvrir", async () => {
    const store = createMemoryStore();
    const archive = await zipFixture(fixture);

    await ingestArchive({
      archive,
      siteId: "site_1",
      versionId: "ver_1",
      store,
      now: EPOCH,
    });
    await ingestArchive({
      archive,
      siteId: "site_1",
      versionId: "ver_2",
      store,
      now: EPOCH,
    });

    expect(
      (await store.list(keys.sourcePrefix("site_1", "ver_1"))).length,
    ).toBeGreaterThan(0);
    expect(
      (await store.list(keys.sourcePrefix("site_1", "ver_2"))).length,
    ).toBeGreaterThan(0);
  });
});

describe("cas de dépôt", () => {
  it("déplie un dossier racine ajouté par le Finder", async () => {
    const store = createMemoryStore();
    const { report } = await ingestArchive({
      archive: await zipFixture("01-artisan-landing", { prefix: "menuiserie-v2-final/" }),
      siteId: "site_1",
      versionId: "ver_1",
      store,
      now: EPOCH,
    });

    expect(report.entry).toBe("menuiserie-v2-final/index.html");
    expect(await store.has(keys.source("site_1", "ver_1", "index.html"))).toBe(true);
  });

  it("choisit la page la plus haute quand il n'y a pas d'index à la racine", async () => {
    const store = createMemoryStore();
    const { snapshot } = await ingestArchive({
      archive: zipOf({
        "accueil.html": "<html><body><h1>Accueil du site</h1></body></html>",
        "pages/contact.html": "<html><body><h1>Nous contacter</h1></body></html>",
        "css/style.css": "body{margin:0}",
      }),
      siteId: "site_1",
      versionId: "ver_1",
      store,
      now: EPOCH,
    });

    expect(snapshot.entry).toBe("accueil.html");
  });

  /**
   * Une archive faite depuis le Finder enveloppe tout dans un dossier au nom du
   * projet. Sans dépliage, chaque URL publiée porterait ce dossier.
   */
  it("ne déplie pas un dossier quand il n'est pas la racine commune", async () => {
    const store = createMemoryStore();
    const { snapshot } = await ingestArchive({
      archive: zipOf({
        "site/index.html": "<html><body><h1>Accueil</h1></body></html>",
        "lisez-moi.txt": "Livré le 3 mars",
      }),
      siteId: "site_1",
      versionId: "ver_1",
      store,
      now: EPOCH,
    });

    expect(snapshot.entry).toBe("site/index.html");
  });

  it("refuse une archive sans la moindre page HTML", async () => {
    const store = createMemoryStore();
    await expect(
      ingestArchive({
        archive: zipOf({ "notes.txt": "rien à voir" }),
        siteId: "site_1",
        versionId: "ver_1",
        store,
        now: EPOCH,
      }),
    ).rejects.toThrow(IngestError);
  });

  it("liste les entrées écartées dans le rapport destiné à l'admin", async () => {
    const store = createMemoryStore();
    const { report } = await ingestArchive({
      archive: await zipFixture("01-artisan-landing", {
        extra: {
          "deploy.sh": new TextEncoder().encode("#!/bin/sh\nrsync -a . prod:/"),
          ".DS_Store": new Uint8Array([0]),
        },
      }),
      siteId: "site_1",
      versionId: "ver_1",
      store,
      now: EPOCH,
    });

    expect(report.rejections.map((r) => r.path).sort()).toEqual([
      ".DS_Store",
      "deploy.sh",
    ]);
    for (const rejet of report.rejections) {
      expect(rejet.message).not.toMatch(/regex|parse|nodeName|undefined/iu);
    }
  });

  it("remonte dans le rapport les avertissements du parser", async () => {
    const store = createMemoryStore();
    const { report } = await ingestArchive({
      archive: await zipFixture("03-portfolio-onepage-gsap"),
      siteId: "site_1",
      versionId: "ver_1",
      store,
      now: EPOCH,
    });

    expect(report.warnings.map((a) => a.code)).toContain("ANIM_LIB_DETECTED");
    expect(report.detected.virtualPages).toBeGreaterThan(0);
  });
});
