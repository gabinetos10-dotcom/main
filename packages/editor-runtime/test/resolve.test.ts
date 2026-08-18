import { beforeEach, describe, expect, it } from "vitest";
import { fingerprintOf, hashRapide, resolveField, shapeDescriptor } from "../src/resolve";

/**
 * Résolution d'un champ dans le DOM **vivant** (§11).
 *
 * Ce n'est pas le même DOM que celui analysé par le parser : les scripts du site
 * ont tourné entre-temps. D'où les trois voies de résolution.
 */

beforeEach(() => {
  document.body.replaceChildren();
});

describe("resolveField", () => {
  it("trouve par l'attribut posé au build, même si le chemin a bougé", () => {
    document.body.innerHTML = `
      <section><p>Intrus</p><h1 data-calque-field="fld_1">Titre</h1></section>`;

    const resolution = resolveField(document, {
      fieldId: "fld_1",
      domPath: "body > section:nth-of-type(1) > h1:nth-of-type(1)",
      type: "text",
    });

    expect(resolution?.via).toBe("attribut");
    expect(resolution?.element.textContent).toBe("Titre");
  });

  it("retombe sur le chemin DOM quand l'attribut manque", () => {
    document.body.innerHTML = "<section><h1>Titre</h1></section>";

    const resolution = resolveField(document, {
      fieldId: "fld_1",
      domPath: "body > section:nth-of-type(1) > h1:nth-of-type(1)",
      type: "text",
    });

    expect(resolution?.via).toBe("domPath");
  });

  /**
   * Le cas qui compte : un script a déplacé l'élément après le chargement. Le
   * chemin ne vaut plus rien, l'empreinte si.
   */
  it("retombe sur l'empreinte quand le chemin ne désigne plus rien", () => {
    document.body.innerHTML = `
      <main><article class="carte"><h3>Cuisines</h3></article></main>`;

    const cible = document.querySelector("article") as HTMLElement;
    const resolution = resolveField(document, {
      fieldId: "fld_1",
      domPath: "body > section:nth-of-type(9) > article:nth-of-type(1)",
      type: "text",
      fingerprint: fingerprintOf(cible),
    });

    expect(resolution?.via).toBe("empreinte");
    expect(resolution?.element).toBe(cible);
  });

  it("départage deux candidats de même empreinte par leur contenu", () => {
    document.body.innerHTML = `
      <div><p class="a">Premier</p><p class="a">Second</p></div>`;

    const second = document.querySelectorAll("p")[1] as HTMLElement;
    const resolution = resolveField(document, {
      fieldId: "fld_1",
      domPath: "introuvable",
      type: "text",
      fingerprint: fingerprintOf(second),
      contentHash: hashRapide("Second"),
    });

    expect(resolution?.element).toBe(second);
  });

  it("renonce plutôt que de désigner le mauvais élément", () => {
    document.body.innerHTML = `<div><p class="a">X</p><p class="a">X</p></div>`;

    expect(
      resolveField(document, {
        fieldId: "fld_1",
        domPath: "introuvable",
        type: "text",
        fingerprint: fingerprintOf(document.querySelector("p") as HTMLElement),
        contentHash: hashRapide("X"),
      }),
    ).toBeNull();
  });

  it("ne s'effondre pas sur un chemin syntaxiquement invalide", () => {
    document.body.innerHTML = "<h1>Titre</h1>";
    expect(() =>
      resolveField(document, { fieldId: "f", domPath: "body > :::", type: "text" }),
    ).not.toThrow();
  });
});

describe("empreinte côté navigateur", () => {
  it("décrit la forme sur deux niveaux, comme le parser", () => {
    document.body.innerHTML =
      '<article class="carte"><img><div><h3>T</h3><p>D</p></div></article>';
    const article = document.querySelector("article") as HTMLElement;
    expect(shapeDescriptor(article)).toBe("img+div(h3+p)");
    expect(fingerprintOf(article)).toBe("article|carte|img+div(h3+p)");
  });

  it("trie les classes, comme le parser", () => {
    document.body.innerHTML = '<div class="b a c"></div>';
    expect(fingerprintOf(document.querySelector("div") as HTMLElement)).toBe(
      "div|a.b.c|",
    );
  });

  it("ignore les différences d'espacement dans le hachage de contenu", () => {
    expect(hashRapide("  Nos   services ")).toBe(hashRapide("Nos services"));
    expect(hashRapide("Nos services")).not.toBe(hashRapide("Nos projets"));
  });
});
