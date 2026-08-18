import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { safeParseBlueprint } from "@calque/blueprint";
import { FIXTURE_NAMES, fixtureRoot, loadFixtureSnapshot } from "@calque/fixtures";
import { analyze, PARSER_VERSION } from "../src/index";

/**
 * Analyse complète d'un site, par l'interface `SiteAdapter` (§24) : un
 * `SourceSnapshot` entre, un blueprint sort. Le source n'est jamais touché — c'est
 * l'invariant central du produit (§5).
 */

const EPOCH = new Date("2026-01-01T00:00:00.000Z");

describe.each(FIXTURE_NAMES)("analyse de %s", (fixture) => {
  it("produit un blueprint conforme au schéma", async () => {
    const { blueprint } = await analyze(await loadFixtureSnapshot(fixture), {
      now: EPOCH,
    });
    const validation = safeParseBlueprint(blueprint);
    expect(validation.success, JSON.stringify(validation.error?.issues.slice(0, 3))).toBe(
      true,
    );
    expect(blueprint.parserVersion).toBe(PARSER_VERSION);
    expect(blueprint.site.adapter).toBe("static-html");
  });

  it("donne exactement le même blueprint deux fois de suite", async () => {
    const snapshot = await loadFixtureSnapshot(fixture);
    const premier = await analyze(snapshot, { now: EPOCH });
    const second = await analyze(snapshot, { now: EPOCH });
    expect(JSON.stringify(second.blueprint)).toBe(JSON.stringify(premier.blueprint));
  });

  /** §5, §21 : le parser lit, il ne modifie jamais les fichiers déposés. */
  it("laisse les fichiers du site rigoureusement inchangés", async () => {
    const snapshot = await loadFixtureSnapshot(fixture);
    const avant = new Map<string, string>();
    for (const fichier of snapshot.files) {
      avant.set(
        fichier.path,
        await readFile(join(fixtureRoot(fixture), fichier.path), "hex"),
      );
    }

    await analyze(snapshot, { now: EPOCH });

    for (const [chemin, empreinte] of avant) {
      expect(await readFile(join(fixtureRoot(fixture), chemin), "hex"), chemin).toBe(
        empreinte,
      );
    }
  });

  it("compte les pages réelles, sans les pages virtuelles", async () => {
    const { blueprint, stats } = await analyze(await loadFixtureSnapshot(fixture), {
      now: EPOCH,
    });
    const reelles = blueprint.pages.filter((page) => !page.virtual);
    expect(blueprint.site.pageCount).toBe(reelles.length);
    expect(stats.pages).toBe(reelles.length);
  });

  it("donne à chaque champ un identifiant unique et une trace vers le source", async () => {
    const { blueprint } = await analyze(await loadFixtureSnapshot(fixture), {
      now: EPOCH,
    });
    const identifiants = new Set<string>();

    for (const page of blueprint.pages) {
      for (const bloc of page.blocks) {
        for (const champ of bloc.fields) {
          expect(identifiants.has(champ.id), `${champ.id} en double`).toBe(false);
          identifiants.add(champ.id);
          expect(champ.id).toMatch(/^fld_[0-9a-f]{10}$/u);
          expect(champ.meta.fingerprint).toContain("|");
          expect(champ.meta.sourceRange?.endOffset).toBeGreaterThan(
            champ.meta.sourceRange?.startOffset ?? 0,
          );
        }
      }
    }
    expect(identifiants.size).toBeGreaterThan(10);
  });

  it("ne montre jamais de jargon au client dans les libellés", async () => {
    const { blueprint } = await analyze(await loadFixtureSnapshot(fixture), {
      now: EPOCH,
    });
    const libelles = blueprint.pages.flatMap((page) =>
      page.blocks.flatMap((bloc) => [
        bloc.label,
        ...bloc.fields.map((champ) => champ.label),
        ...bloc.collections.map((collection) => collection.label),
      ]),
    );

    for (const libelle of libelles) {
      expect(libelle, libelle).not.toMatch(/nth-of-type|domPath|div>|<[a-z]+>/u);
      expect(libelle.length).toBeGreaterThan(0);
    }
  });
});

describe("pages virtuelles (§8)", () => {
  it("présente les sections d'un one-page comme des pages, sans dupliquer le contenu", async () => {
    const { blueprint } = await analyze(
      await loadFixtureSnapshot("03-portfolio-onepage-gsap"),
      { now: EPOCH },
    );
    const virtuelles = blueprint.pages.filter((page) => page.virtual);

    expect(virtuelles.length).toBeGreaterThanOrEqual(4);
    for (const page of virtuelles) {
      expect(page.path).toMatch(/^index\.html#/u);
      expect(page.blocks).toEqual([]);
      expect(page.anchorBlockId).toBeDefined();
    }

    const blocs = new Set(
      blueprint.pages.flatMap((page) => page.blocks.map((bloc) => bloc.id)),
    );
    for (const page of virtuelles) {
      expect(blocs.has(page.anchorBlockId as string)).toBe(true);
    }
  });

  it("ne fabrique pas de pages virtuelles sur un site multi-pages", async () => {
    const { blueprint } = await analyze(
      await loadFixtureSnapshot("02-restaurant-multipage"),
      { now: EPOCH },
    );
    expect(blueprint.pages.filter((page) => page.virtual)).toEqual([]);
  });
});

describe("groupes globaux (§9.2)", () => {
  it("réunit le téléphone répété sur plusieurs pages en un seul champ", async () => {
    const { blueprint } = await analyze(
      await loadFixtureSnapshot("02-restaurant-multipage"),
      { now: EPOCH },
    );

    const contact = blueprint.globals.find((groupe) => groupe.id === "grp_contact");
    expect(contact?.label).toBe("Informations de contact");

    const telephone = contact?.fields.find((champ) =>
      String(champ.value).includes("04 78 62 04 11"),
    );
    expect(telephone).toBeDefined();
    expect(telephone?.occurrences.length).toBeGreaterThan(1);
    // Le panneau global commande les champs de page : sans eux, l'édition
    // n'aurait aucun effet sur le site publié.
    expect(telephone?.fieldIds.length).toBeGreaterThanOrEqual(
      telephone?.occurrences.length ?? 0,
    );
  });

  it("regroupe les réseaux sociaux par réseau", async () => {
    const { blueprint } = await analyze(await loadFixtureSnapshot("01-artisan-landing"), {
      now: EPOCH,
    });
    const reseaux = blueprint.globals.find((groupe) => groupe.id === "grp_reseaux");
    expect(
      reseaux?.fields.map((champ) => (champ.value as { network: string }).network).sort(),
    ).toEqual(["facebook", "instagram"]);
  });
});

describe("avertissements du §8", () => {
  it("signale une image référencée mais absente du dépôt", async () => {
    const snapshot = await loadFixtureSnapshot("01-artisan-landing");
    const ampute = {
      ...snapshot,
      files: snapshot.files.filter((fichier) => fichier.path !== "assets/hero.jpg"),
    };
    const { blueprint } = await analyze(ampute, { now: EPOCH });
    expect(blueprint.warnings.map((a) => a.code)).toContain("IMAGE_MANQUANTE");
  });

  it("signale un formulaire sans destination", async () => {
    const snapshot = await loadFixtureSnapshot("01-artisan-landing");
    const encodeur = new TextEncoder();
    const decodeur = new TextDecoder();
    const modifie = {
      ...snapshot,
      files: snapshot.files.map((fichier) =>
        fichier.path === "index.html" && fichier.content !== undefined
          ? {
              ...fichier,
              content: encodeur.encode(
                decodeur
                  .decode(fichier.content)
                  .replace('action="https://formspree.io/f/xnqkldvz"', ""),
              ),
            }
          : fichier,
      ),
    };
    const { blueprint } = await analyze(modifie, { now: EPOCH });
    expect(blueprint.warnings.map((a) => a.code)).toContain("FORM_SANS_ENDPOINT");
  });
});
