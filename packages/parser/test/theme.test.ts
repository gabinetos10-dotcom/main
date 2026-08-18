import { describe, expect, it } from "vitest";
import {
  analyzeTheme,
  familiesFromValue,
  googleFontFamilies,
  tokenType,
} from "../src/theme";

/** Jetons de design et polices (§9.4). Ce module ne fait que lire le CSS. */

describe("tokenType", () => {
  it("type par la valeur quand le nom ne dit rien", () => {
    expect(tokenType("--a", "#6d3b2c")).toBe("color");
    expect(tokenType("--a", "rgba(0,0,0,.1)")).toBe("color");
    expect(tokenType("--a", "3px")).toBe("length");
  });

  it("type par le nom quand la valeur est ambiguë", () => {
    expect(tokenType("--ombre-carte", "0 8px 30px rgba(0,0,0,.1)")).toBe("shadow");
    expect(tokenType("--rayon-large", "10px")).toBe("radius");
    expect(tokenType("--police-titre", '"Playfair Display", serif')).toBe("font-family");
  });
});

describe("analyzeTheme", () => {
  const CSS = `
    :root {
      --couleur-primaire: #6d3b2c;
      --police-titre: "Playfair Display", Georgia, serif;
      --rayon: 3px;
    }
    [data-theme="soir"] { --couleur-fond: #221a17; }
    body { font-family: var(--police-texte); background: var(--couleur-primaire); }
    h1, h2 { font-family: "Playfair Display", serif; }
    .carte { border-radius: var(--rayon); box-shadow: 0 1px 3px var(--couleur-primaire); }
  `;

  it("extrait les variables de :root et de [data-theme]", () => {
    const { theme, noCssVariables } = analyzeTheme([{ path: "a.css", css: CSS }]);
    expect(noCssVariables).toBe(false);
    expect(theme.tokens.map((jeton) => jeton.cssVar)).toEqual([
      "--couleur-primaire",
      "--police-titre",
      "--rayon",
      "--couleur-fond",
    ]);
  });

  it("compte les usages de chaque variable", () => {
    const { theme } = analyzeTheme([{ path: "a.css", css: CSS }]);
    const primaire = theme.tokens.find((jeton) => jeton.cssVar === "--couleur-primaire");
    expect(primaire?.usageCount).toBe(2);
  });

  it("nomme les jetons en français, sans les deux tirets", () => {
    const { theme } = analyzeTheme([{ path: "a.css", css: CSS }]);
    expect(theme.tokens.find((j) => j.cssVar === "--couleur-primaire")?.label).toBe(
      "Couleur primaire",
    );
  });

  it("déduit le rôle d'une police de son sélecteur", () => {
    const { theme } = analyzeTheme([{ path: "a.css", css: CSS }]);
    expect(theme.fonts.find((police) => police.family === "Playfair Display")?.role).toBe(
      "headings",
    );
  });

  it("lit les familles d'un @import Google Fonts", () => {
    const { theme } = analyzeTheme([
      {
        path: "b.css",
        css: `@import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=Inter:wght@400&display=swap");
              :root { --a: #fff; }`,
      },
    ]);
    expect(theme.fonts.map((police) => police.family)).toEqual([
      "Playfair Display",
      "Inter",
    ]);
    expect(theme.fonts[0]?.source).toBe("google");
  });

  /**
   * §9.4 : sans variable CSS, on compte les couleurs et on propose les six plus
   * fréquentes. Elles sont marquées `inferred` — le remplacement global reste un
   * choix explicite de l'admin, jamais activé par défaut.
   */
  it("déduit des couleurs quand le site n'a aucune variable", () => {
    const { theme, noCssVariables } = analyzeTheme([
      {
        path: "c.css",
        css: `.a { color: #c08b52; } .b { color: #c08b52; } .c { background: #3b2a1d; }`,
      },
    ]);
    expect(noCssVariables).toBe(true);
    expect(theme.tokens.every((jeton) => jeton.inferred)).toBe(true);
    expect(theme.tokens[0]?.value).toBe("#c08b52");
    expect(theme.tokens[0]?.usageCount).toBe(2);
    expect(theme.tokens[0]?.label).toBe("Couleur du site 1");
  });

  it("ne s'effondre pas sur une feuille illisible", () => {
    expect(() => analyzeTheme([{ path: "d.css", css: "@media { .a { " }])).not.toThrow();
  });
});

describe("lecture des valeurs", () => {
  it("découpe une pile de polices et écarte les familles génériques", () => {
    expect(familiesFromValue('"Playfair Display", Georgia, serif')).toEqual([
      "Playfair Display",
      "Georgia",
      "serif",
    ]);
  });

  it("décode les familles d'une URL Google Fonts", () => {
    expect(
      googleFontFamilies(
        "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400&display=swap",
      ),
    ).toEqual(["Open Sans"]);
  });
});
