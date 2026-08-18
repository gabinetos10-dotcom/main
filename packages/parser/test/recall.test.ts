import { describe, expect, it } from "vitest";
import { FIXTURE_NAMES, loadExpected } from "@calque/fixtures";
import { mesurer, mesurerToutes, rappel, rappelType } from "./harness";

/**
 * Critère d'acceptation du P2 (§9.3, §22) :
 *
 *   • **≥ 90 % de rappel** sur les champs annotés dans `expected.json`,
 *     les champs critiques comptant double ;
 *   • **zéro faux positif destructeur** — aucun élément listé dans
 *     `mustBeLocked` classé modifiable. Un seul suffit à faire échouer la phase.
 *
 * Ces deux seuils ne sont pas des indicateurs : ce sont les conditions de
 * passage. Le reste du fichier mesure la qualité au-delà du minimum.
 */

const SEUIL_RAPPEL = 0.9;

describe.each(FIXTURE_NAMES)("critère du §9.3 sur %s", (fixture) => {
  it("détecte au moins 90 % des champs attendus", async () => {
    const mesure = await mesurer(fixture);
    const detail = mesure.manques
      .map((manque) => `    ${manque.raison} — ${manque.selector}`)
      .join("\n");

    expect(
      rappel(mesure),
      `rappel ${(rappel(mesure) * 100).toFixed(1)} % (${mesure.poidsDetecte}/${mesure.poidsTotal})\n${detail}`,
    ).toBeGreaterThanOrEqual(SEUIL_RAPPEL);
  });

  it("ne classe modifiable aucun élément structurel", async () => {
    const mesure = await mesurer(fixture);
    const detail = mesure.fauxPositifs
      .map((faux) => `    ${faux.selector} — ${faux.raison}`)
      .join("\n");

    expect(mesure.fauxPositifs, `faux positifs destructeurs :\n${detail}`).toEqual([]);
  });

  it("trouve chaque collection annoncée, avec assez d'items et les bons emplacements", async () => {
    const mesure = await mesurer(fixture);
    const detail = mesure.collectionsManquantes
      .map((manque) => `    ${manque.selector} — ${manque.raison}`)
      .join("\n");

    expect(mesure.collectionsManquantes, `collections :\n${detail}`).toEqual([]);
  });

  it("donne le bon type à ce qu'il détecte", async () => {
    const mesure = await mesurer(fixture);
    const detail = mesure.typesDivergents
      .map((écart) => `    ${écart.selector} : ${écart.attendu} → ${écart.obtenu}`)
      .join("\n");

    expect(rappelType(mesure), `types divergents :\n${detail}`).toBeGreaterThanOrEqual(
      SEUIL_RAPPEL,
    );
  });

  it("remonte les avertissements que la fixture met à l'épreuve", async () => {
    const mesure = await mesurer(fixture);
    const attendu = await loadExpected(fixture);
    const produits = new Set(mesure.blueprint.warnings.map((a) => a.code));

    for (const code of attendu.expectedWarnings) {
      expect(produits, `avertissement absent : ${code}`).toContain(code);
    }
  });

  it("retrouve les jetons de thème et les polices annoncés", async () => {
    const mesure = await mesurer(fixture);
    const attendu = await loadExpected(fixture);

    const jetons = new Set(mesure.blueprint.theme.tokens.map((jeton) => jeton.cssVar));
    for (const cssVar of attendu.themeTokens) {
      expect(jetons, `jeton absent : ${cssVar}`).toContain(cssVar);
    }

    const familles = new Set(mesure.blueprint.theme.fonts.map((police) => police.family));
    for (const famille of attendu.themeFonts) {
      expect(familles, `police absente : ${famille}`).toContain(famille);
    }
  });

  it("remplit le SEO de chaque page décrite", async () => {
    const mesure = await mesurer(fixture);
    const attendu = await loadExpected(fixture);

    for (const page of attendu.pages) {
      const trouvee = mesure.blueprint.pages.find(
        (candidate) => candidate.path === page.path,
      );
      expect(trouvee, page.path).toBeDefined();
      if (page.seo.title) expect(trouvee?.seo.title.length, page.path).toBeGreaterThan(0);
      if (page.seo.description) {
        expect(trouvee?.seo.description.length, page.path).toBeGreaterThan(0);
      }
      if (page.seo.ogImage) expect(trouvee?.seo.ogImage, page.path).toBeDefined();
    }
  });
});

describe("bilan", () => {
  it("récapitule le rappel des trois fixtures", async () => {
    const mesures = await mesurerToutes();
    const lignes = mesures.map(
      (mesure) =>
        `${mesure.fixture.padEnd(28)} rappel ${(rappel(mesure) * 100).toFixed(1).padStart(5)} % · ` +
        `typé ${(rappelType(mesure) * 100).toFixed(1).padStart(5)} % · ` +
        `${String(mesure.poidsDetecte).padStart(3)}/${mesure.poidsTotal} points · ` +
        `${mesure.fauxPositifs.length} faux positif(s) destructeur(s)`,
    );
    console.log(`\n${lignes.join("\n")}\n`);

    const global =
      mesures.reduce((total, mesure) => total + mesure.poidsDetecte, 0) /
      mesures.reduce((total, mesure) => total + mesure.poidsTotal, 0);
    console.log(`  rappel global : ${(global * 100).toFixed(1)} %\n`);

    expect(global).toBeGreaterThanOrEqual(SEUIL_RAPPEL);
  });
});
