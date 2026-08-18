import { describe, expect, it } from "vitest";
import { humanize, labelForBlock, labelForField, truncate } from "../src/labels";
import { findFirst, parseHtml, tagName, type Element } from "../src/tree";

/**
 * Libellés lisibles (§9.2) — « critique pour l'UX ».
 *
 * Le client final ne doit jamais voir `h2:nth-of-type(3)` ni un nom de classe
 * utilitaire : le §21 interdit le jargon dans son interface.
 */

function premier(html: string, balise: string): Element {
  const document = parseHtml(`<!DOCTYPE html><html><body>${html}</body></html>`);
  const element = findFirst(document, (candidat) => tagName(candidat) === balise);
  if (element === null) throw new Error(`Aucun <${balise}>.`);
  return element;
}

describe("humanize", () => {
  it("rend lisible un nom technique", () => {
    expect(humanize("couleur-primaire")).toBe("Couleur primaire");
    expect(humanize("bloc__entete")).toBe("Bloc entete");
    expect(humanize("plat_prix")).toBe("Plat prix");
  });
});

describe("truncate", () => {
  it("coupe à quarante caractères et pose une ellipse", () => {
    const long = "Un titre qui dépasse largement la limite des quarante caractères";
    expect(truncate(long)).toHaveLength(40);
    expect(truncate(long).endsWith("…")).toBe(true);
  });

  it("laisse un texte court intact et compacte les espaces", () => {
    expect(truncate("  Nos   services ")).toBe("Nos services");
  });
});

describe("labelForField", () => {
  it("préfère aria-label à tout le reste", () => {
    const element = premier('<a href="/x" aria-label="Aller au contact">→</a>', "a");
    expect(labelForField(element, "link", "→")).toBe("Aller au contact");
  });

  it("prend le texte alternatif d'une image", () => {
    const element = premier('<img src="a.jpg" alt="Atelier de menuiserie">', "img");
    expect(labelForField(element, "image", "")).toBe("Atelier de menuiserie");
  });

  /**
   * Écart assumé à l'ordre du §9.2, qui place la classe avant le texte : sur un
   * site Tailwind, la classe donne « Mt 3 » ou « Btn primaire ». Le texte visible
   * est ce que le client reconnaît.
   */
  it("nomme un champ par son texte plutôt que par ses classes utilitaires", () => {
    const element = premier(
      '<h1 class="font-titre text-4xl md:text-6xl leading-tight">Le bois massif</h1>',
      "h1",
    );
    expect(labelForField(element, "text", "Le bois massif")).toBe("Le bois massif");
  });

  it("retombe sur un libellé de type quand il n'y a ni texte ni attribut", () => {
    const element = premier(
      '<iframe src="https://maps.google.com/x"></iframe>',
      "iframe",
    );
    expect(labelForField(element, "map-embed", "")).toBe("Adresse affichée sur le plan");
  });

  it("n'emploie jamais un nom de classe utilitaire comme libellé", () => {
    const element = premier('<div class="mt-3 md:grid-cols-4 text-sm"></div>', "div");
    expect(labelForField(element, "text", "")).not.toMatch(/mt-3|grid|text-sm/u);
  });
});

describe("labelForBlock", () => {
  it("nomme une section par son titre", () => {
    const element = premier(
      '<section id="services"><h2>Ce que nous faisons</h2></section>',
      "section",
    );
    expect(labelForBlock(element, "Ce que nous faisons")).toBe("Ce que nous faisons");
  });

  it("retombe sur l'identifiant quand la section n'a pas de titre", () => {
    const element = premier('<section id="galerie"></section>', "section");
    expect(labelForBlock(element, null)).toBe("Galerie");
  });

  it("nomme l'en-tête et le pied de page en français", () => {
    expect(labelForBlock(premier("<header></header>", "header"), null)).toBe("En-tête");
    expect(labelForBlock(premier("<footer></footer>", "footer"), null)).toBe(
      "Pied de page",
    );
  });
});
