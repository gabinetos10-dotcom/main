import { describe, expect, it } from "vitest";
import { FIXTURE_NAMES, loadFixtureSnapshot } from "@calque/fixtures";
import { analyze } from "../src/index";
import { renderReport } from "../src/report";

/**
 * Rapport d'ingestion (§8.5) — troisième critère d'acceptation du P2.
 *
 * Il s'adresse à l'admin d'agence, mais reste écrit sans jargon : c'est un
 * document qu'on lit à voix haute devant un client.
 */

const EPOCH = new Date("2026-01-01T00:00:00.000Z");

describe.each(FIXTURE_NAMES)("rapport de %s", (fixture) => {
  it("dit ce qui est modifiable, ce qui est verrouillé et ce qui mérite attention", async () => {
    const resultat = await analyze(await loadFixtureSnapshot(fixture), { now: EPOCH });
    const rapport = renderReport(resultat, { siteName: fixture });

    expect(rapport).toContain("Ce que le client pourra modifier");
    expect(rapport).toContain("Page par page");
    expect(rapport).toContain("Ce qui reste verrouillé");
    expect(rapport.split("\n").length).toBeGreaterThan(20);
  });

  it("n'emploie ni chemin DOM, ni code technique, ni balise (§21)", async () => {
    const resultat = await analyze(await loadFixtureSnapshot(fixture), { now: EPOCH });
    const rapport = renderReport(resultat, { siteName: fixture });

    expect(rapport).not.toMatch(/nth-of-type/u);
    expect(rapport).not.toMatch(/domPath|fingerprint|blueprint/iu);
    expect(rapport).not.toMatch(/DYNAMIC_TEXT|ANIM_LIB_DETECTED|NO_CSS_VARIABLES/u);
  });
});

describe("rapport de la fixture GSAP", () => {
  it("prévient que l'aperçu passera en édition statique", async () => {
    const resultat = await analyze(
      await loadFixtureSnapshot("03-portfolio-onepage-gsap"),
      { now: EPOCH },
    );
    const rapport = renderReport(resultat);

    expect(rapport).toContain("Animations au défilement");
    expect(rapport).toContain("Titres découpés à l'affichage");
    expect(rapport).toContain("Composant fermé");
  });

  it("annonce les sections présentées comme des pages", async () => {
    const resultat = await analyze(
      await loadFixtureSnapshot("03-portfolio-onepage-gsap"),
      { now: EPOCH },
    );
    expect(renderReport(resultat)).toContain("une seule page");
  });
});
