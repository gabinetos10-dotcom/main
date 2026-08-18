import { describe, expect, it } from "vitest";
import { compileSimpleSelector } from "../src/simple-selector";
import { findFirst, parseHtml, tagName } from "../src/tree";

function element(html: string, balise: string) {
  const document = parseHtml(`<body>${html}</body>`);
  const trouve = findFirst(document, (candidat) => tagName(candidat) === balise);
  if (trouve === null) throw new Error(`Aucun <${balise}> dans la fixture de test.`);
  return trouve;
}

describe("compileSimpleSelector", () => {
  it("reconnaît une classe, un identifiant et une balise", () => {
    const p = element('<p id="a" class="counter grand">0</p>', "p");
    expect(compileSimpleSelector(".counter")?.(p)).toBe(true);
    expect(compileSimpleSelector("#a")?.(p)).toBe(true);
    expect(compileSimpleSelector("p.counter")?.(p)).toBe(true);
    expect(compileSimpleSelector(".autre")?.(p)).toBe(false);
  });

  it("reconnaît la présence et la valeur d'un attribut", () => {
    const p = element('<p data-count="27" data-role="stat">0</p>', "p");
    expect(compileSimpleSelector("[data-count]")?.(p)).toBe(true);
    expect(compileSimpleSelector('[data-role="stat"]')?.(p)).toBe(true);
    expect(compileSimpleSelector('[data-role="autre"]')?.(p)).toBe(false);
    expect(compileSimpleSelector('[data-role^="st"]')?.(p)).toBe(true);
  });

  /**
   * Ces sélecteurs viennent des scripts du site et décident d'un verrou. Un
   * sélecteur qu'on interpréterait mal verrouillerait des champs légitimes :
   * hors périmètre, on préfère ne rien faire.
   */
  it("renvoie null sur ce qu'il ne sait pas interpréter, plutôt que d'approximer", () => {
    expect(compileSimpleSelector("main section[id]")).toBeNull();
    expect(compileSimpleSelector("ul > li")).toBeNull();
    expect(compileSimpleSelector("a:hover")).toBeNull();
    expect(compileSimpleSelector(".a, .b")).toBeNull();
    expect(compileSimpleSelector("")).toBeNull();
  });
});
