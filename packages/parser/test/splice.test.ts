import { describe, expect, it } from "vitest";
import { applySplices } from "../src/splice";

describe("applySplices", () => {
  it("remplace du plus loin vers le plus proche, sans décaler les suivants", () => {
    const source = "<p>Bonjour</p><p>Monde</p>";
    const resultat = applySplices(source, [
      { startOffset: 3, endOffset: 10, replacement: "Salut" },
      { startOffset: 17, endOffset: 22, replacement: "Terre" },
    ]);
    expect(resultat).toBe("<p>Salut</p><p>Terre</p>");
  });

  it("accepte deux insertions au même point", () => {
    expect(
      applySplices("<a></a>", [
        { startOffset: 2, endOffset: 2, replacement: ' data-f="f1"' },
      ]),
    ).toBe('<a data-f="f1"></a>');
  });

  it("refuse des remplacements qui se chevauchent plutôt que de produire du HTML faux", () => {
    expect(() =>
      applySplices("0123456789", [
        { startOffset: 2, endOffset: 6, replacement: "x" },
        { startOffset: 4, endOffset: 8, replacement: "y" },
      ]),
    ).toThrow(/chevauchants/u);
  });

  it("laisse le source intact sans remplacement", () => {
    expect(applySplices("<b>x</b>", [])).toBe("<b>x</b>");
  });
});
