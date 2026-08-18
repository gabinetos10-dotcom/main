import { describe, expect, it } from "vitest";
import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import { computeDomPath } from "../src/dom-path";
import { domPathOf, findAll, findFirst, parseHtml, tagName } from "../src/tree";
import { cheerioTree } from "./harness";

const PAGE = `<!DOCTYPE html>
<html lang="fr"><head><title>T</title></head>
<body>
  <main>
    <section><h2>Un</h2></section>
    <section>
      <h2>Deux</h2>
      <table><tr><td>Cellule</td></tr></table>
    </section>
  </main>
</body></html>`;

describe("computeDomPath", () => {
  it("écrit un chemin lisible, indicé même à un seul élément", () => {
    const document = parseHtml(PAGE);
    const titre = findFirst(document, (element) => tagName(element) === "h2");
    expect(titre).not.toBeNull();
    expect(domPathOf(titre as never)).toBe(
      "body > main:nth-of-type(1) > section:nth-of-type(1) > h2:nth-of-type(1)",
    );
  });

  it("distingue deux sections de même balise par leur rang", () => {
    const document = parseHtml(PAGE);
    const titres = findAll(document, (element) => tagName(element) === "h2");
    expect(titres).toHaveLength(2);
    expect(domPathOf(titres[0] as never)).toContain("section:nth-of-type(1)");
    expect(domPathOf(titres[1] as never)).toContain("section:nth-of-type(2)");
  });

  /**
   * Le banc de mesure du rappel résout des sélecteurs CSS avec cheerio, puis
   * compare des `domPath`. Si les deux arbres ne s'accordaient pas — sur un
   * `<tbody>` implicite, par exemple — la mesure serait fausse sans que rien
   * n'échoue. Ce test gèle l'accord.
   */
  it("donne le même chemin sur l'arbre parse5 et sur l'arbre cheerio", () => {
    const $ = cheerio.load(PAGE);
    const cellule = $("td").toArray()[0];
    expect(cellule).toBeDefined();
    const parCheerio = computeDomPath(cellule as AnyNode, cheerioTree);

    const document = parseHtml(PAGE);
    const parParse5 = domPathOf(
      findFirst(document, (element) => tagName(element) === "td") as never,
    );

    expect(parCheerio).toBe(parParse5);
    // Les deux insèrent le <tbody> que le HTML ne contient pas.
    expect(parCheerio).toContain("tbody:nth-of-type(1)");
  });
});
