import { describe, expect, it } from "vitest";
import { emptyContent } from "@calque/blueprint";
import { creerStore } from "./store";

/**
 * État de l'éditeur (§4 : Zustand + Immer, undo/redo par patches, 50 niveaux).
 *
 * L'annulation rejoue des patches et non des états complets : sur un site de
 * plusieurs centaines de champs, cinquante copies du contenu coûteraient des
 * mégaoctets pour une fonctionnalité utilisée trois fois par session.
 */

function store() {
  return creerStore({ ...emptyContent(), fields: { a: "un", b: "deux" } });
}

describe("modifications", () => {
  it("applique une modification et retient ce qui a changé", () => {
    const s = store();
    s.getState().appliquer(
      "Titre",
      (brouillon) => {
        brouillon.fields["a"] = "modifié";
      },
      "a",
    );

    expect(s.getState().contenu.fields["a"]).toBe("modifié");
    expect(s.getState().modifies.has("a")).toBe(true);
    expect(s.getState().modifies.has("b")).toBe(false);
  });

  it("ignore une recette qui ne change rien", () => {
    const s = store();
    s.getState().appliquer("Titre", (brouillon) => {
      brouillon.fields["a"] = "un";
    });
    expect(s.getState().passes).toHaveLength(0);
  });

  it("ne mute pas l'état précédent", () => {
    const s = store();
    const avant = s.getState().contenu;
    s.getState().appliquer("Titre", (brouillon) => {
      brouillon.fields["a"] = "modifié";
    });
    expect(avant.fields["a"]).toBe("un");
  });
});

describe("annuler et rétablir", () => {
  it("remonte et redescend le fil", () => {
    const s = store();
    s.getState().appliquer("1", (b) => void (b.fields["a"] = "x"));
    s.getState().appliquer("2", (b) => void (b.fields["a"] = "y"));

    expect(s.getState().annuler()).toBe(true);
    expect(s.getState().contenu.fields["a"]).toBe("x");
    expect(s.getState().annuler()).toBe(true);
    expect(s.getState().contenu.fields["a"]).toBe("un");
    expect(s.getState().annuler()).toBe(false);

    expect(s.getState().refaireDernier()).toBe(true);
    expect(s.getState().contenu.fields["a"]).toBe("x");
    expect(s.getState().refaireDernier()).toBe(true);
    expect(s.getState().contenu.fields["a"]).toBe("y");
    expect(s.getState().refaireDernier()).toBe(false);
  });

  /**
   * Une nouvelle action après une annulation coupe la branche de rétablissement.
   * C'est le comportement de tous les éditeurs ; le contraire surprendrait.
   */
  it("coupe la branche de rétablissement dès qu'on repart d'ailleurs", () => {
    const s = store();
    s.getState().appliquer("1", (b) => void (b.fields["a"] = "x"));
    s.getState().annuler();
    s.getState().appliquer("2", (b) => void (b.fields["a"] = "z"));

    expect(s.getState().refaire).toHaveLength(0);
    expect(s.getState().refaireDernier()).toBe(false);
  });

  it("garde cinquante niveaux, pas davantage", () => {
    const s = store();
    for (let i = 0; i < 60; i += 1) {
      s.getState().appliquer(`pas ${i}`, (b) => void (b.fields["a"] = `v${i}`));
    }
    expect(s.getState().passes).toHaveLength(50);

    // Les dix plus anciens sont hors de portée : on remonte jusqu'à v9.
    for (let i = 0; i < 50; i += 1) s.getState().annuler();
    expect(s.getState().contenu.fields["a"]).toBe("v9");
    expect(s.getState().annuler()).toBe(false);
  });

  it("annule aussi un changement de thème ou de référencement", () => {
    const s = store();
    s.getState().appliquer(
      "Couleur",
      (b) => void (b.theme["tok_1"] = "#123456"),
      "tok_1",
    );
    s.getState().appliquer("SEO", (b) => void (b.seo["index.html"] = { title: "T" }));

    s.getState().annuler();
    expect(s.getState().contenu.seo["index.html"]).toBeUndefined();
    expect(s.getState().contenu.theme["tok_1"]).toBe("#123456");
  });
});

describe("sélection", () => {
  it("choisir un champ referme la section annexe ouverte", () => {
    const s = store();
    s.getState().ouvrirSection("theme");
    s.getState().choisir("fld_1");
    expect(s.getState().section).toBeNull();
    expect(s.getState().selection).toBe("fld_1");
  });

  /**
   * On ouvre la bibliothèque d'images **depuis** un champ image, pour y poser
   * une image. Effacer la sélection en chemin ferait perdre la destination.
   */
  it("ouvrir une section garde la sélection courante", () => {
    const s = store();
    s.getState().choisir("fld_image");
    s.getState().ouvrirSection("medias");
    expect(s.getState().selection).toBe("fld_image");
    expect(s.getState().section).toBe("medias");
  });
});
