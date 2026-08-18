import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FIXTURE_NAMES, fixtureRoot, loadFixtureSnapshot } from "@calque/fixtures";
import { analyze } from "@calque/parser";
import { build, initialContent } from "../src/index";

/**
 * L'invariant du §15, à écrire « avant toute autre chose dans P3 » :
 *
 *     build(source, blueprint, contenu_initial_extrait) ≡ source
 *
 * C'est le filet de sécurité de tout le système. Il tient parce qu'un champ dont
 * la valeur n'a pas changé n'est jamais réécrit — et parce que rien n'est
 * resérialisé : le builder remplace des intervalles d'octets, et seuls ceux-là.
 */

const EPOCH = new Date("2026-01-01T00:00:00.000Z");

describe.each(FIXTURE_NAMES)("identité byte-à-byte sur %s", (fixture) => {
  it("reproduit chaque fichier à l'octet près", async () => {
    const snapshot = await loadFixtureSnapshot(fixture);
    const { blueprint } = await analyze(snapshot, { now: EPOCH });
    const resultat = await build(snapshot, blueprint, initialContent(blueprint));

    const produits = new Map(
      resultat.files.map((fichier) => [fichier.path, fichier.content]),
    );

    for (const fichier of snapshot.files) {
      const attendu = await readFile(join(fixtureRoot(fixture), fichier.path));
      const obtenu = produits.get(fichier.path);
      expect(obtenu, `${fichier.path} absent de la sortie`).toBeDefined();
      expect(Buffer.from(obtenu as Uint8Array).equals(attendu), fichier.path).toBe(true);
    }
  });

  it("ne produit ni fichier en trop ni fichier en moins", async () => {
    const snapshot = await loadFixtureSnapshot(fixture);
    const { blueprint } = await analyze(snapshot, { now: EPOCH });
    const resultat = await build(snapshot, blueprint, initialContent(blueprint));

    expect(resultat.files.map((fichier) => fichier.path).sort()).toEqual(
      snapshot.files.map((fichier) => fichier.path).sort(),
    );
  });

  it("ne laisse aucun champ irrésolu", async () => {
    const snapshot = await loadFixtureSnapshot(fixture);
    const { blueprint } = await analyze(snapshot, { now: EPOCH });
    const resultat = await build(snapshot, blueprint, initialContent(blueprint));
    expect(resultat.unresolvedFieldIds).toEqual([]);
  });

  /**
   * Un contenu vide n'est pas la même chose qu'un contenu initial : il faut que
   * les deux donnent le source. Sans ce test, l'identité pourrait tenir
   * seulement parce qu'aucune valeur n'est comparée.
   */
  it("donne aussi le source avec un contenu vide", async () => {
    const snapshot = await loadFixtureSnapshot(fixture);
    const { blueprint } = await analyze(snapshot, { now: EPOCH });
    const resultat = await build(snapshot, blueprint, {
      fields: {},
      collections: {},
      blocks: {},
      theme: {},
      seo: {},
      globals: {},
    });

    for (const fichier of snapshot.files.filter((f) => f.kind === "page")) {
      const attendu = await readFile(join(fixtureRoot(fixture), fichier.path));
      const obtenu = resultat.files.find((f) => f.path === fichier.path)?.content;
      expect(Buffer.from(obtenu as Uint8Array).equals(attendu), fichier.path).toBe(true);
    }
  });

  it("est reproductible : deux builds identiques donnent les mêmes octets", async () => {
    const snapshot = await loadFixtureSnapshot(fixture);
    const { blueprint } = await analyze(snapshot, { now: EPOCH });
    const contenu = initialContent(blueprint);

    const premier = await build(snapshot, blueprint, contenu);
    const second = await build(snapshot, blueprint, contenu);

    for (const [index, fichier] of premier.files.entries()) {
      expect(
        Buffer.from(fichier.content).equals(
          Buffer.from(second.files[index]?.content as Uint8Array),
        ),
        fichier.path,
      ).toBe(true);
    }
  });
});
