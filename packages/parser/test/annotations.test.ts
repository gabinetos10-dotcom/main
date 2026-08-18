import { describe, expect, it } from "vitest";
import { readAnnotation } from "../src/annotations";
import { analyzePage } from "../src/page";
import { findFirst, parseHtml, tagName, type Element } from "../src/tree";

/**
 * Annotations `data-calque` (§9.6) — la convention de vibe coding de l'agence.
 * Priorité : annotation explicite > surcharge admin > heuristique.
 */

function premier(html: string, balise: string): Element {
  const document = parseHtml(`<!DOCTYPE html><html><body>${html}</body></html>`);
  const element = findFirst(document, (candidat) => tagName(candidat) === balise);
  if (element === null) throw new Error(`Aucun <${balise}>.`);
  return element;
}

function analyser(corps: string) {
  return analyzePage({
    path: "index.html",
    html: `<!DOCTYPE html><html lang="fr"><head><title>T</title></head><body>${corps}</body></html>`,
    entry: "index.html",
    lockContext: { dynamicMatchers: [] },
    overrides: {},
    knownFiles: new Set(),
  });
}

function champs(corps: string) {
  return analyser(corps).entries.map((entree) => entree.field);
}

describe("readAnnotation", () => {
  it("lit le rôle, le libellé et les bornes", () => {
    const annotation = readAnnotation(
      premier(
        '<div data-calque="collection" data-calque-label="Nos services" data-calque-max="8"></div>',
        "div",
      ),
    );
    expect(annotation).toEqual({
      role: "collection",
      label: "Nos services",
      max: 8,
      min: undefined,
      ratio: undefined,
    });
  });

  it("ignore un rôle inconnu plutôt que de faire taire l'heuristique", () => {
    expect(
      readAnnotation(premier('<p data-calque="n-importe-quoi">x</p>', "p")),
    ).toBeNull();
  });

  it("ne voit rien sur un élément non annoté", () => {
    expect(readAnnotation(premier("<p>x</p>", "p"))).toBeNull();
  });
});

describe("effet des annotations sur l'analyse", () => {
  it("impose le libellé montré au client", () => {
    const [champ] = champs(
      '<section><h1 data-calque="text" data-calque-label="Titre de la page">Bonjour</h1></section>',
    );
    expect(champ?.label).toBe("Titre de la page");
  });

  it("impose une longueur maximale", () => {
    const [champ] = champs(
      '<section><h1 data-calque="text" data-calque-max="60">Bonjour</h1></section>',
    );
    expect(champ?.constraints).toMatchObject({ maxLength: 60 });
  });

  it("verrouille une section entière", () => {
    const resultat = analyser(
      '<section data-calque="lock"><h1>Bandeau légal</h1><p>Texte imposé</p></section>',
    );
    expect(resultat.entries).toEqual([]);
    expect(resultat.locked.map((verrou) => verrou.reason)).toContain("annotation");
  });

  it("change le type quand la forme de la valeur le permet", () => {
    const [champ] = champs(
      '<section><p data-calque="richtext">Un texte simple</p></section>',
    );
    expect(champ?.type).toBe("richtext");
  });

  it("refuse un changement de type impossible plutôt que de produire une valeur bancale", () => {
    const [champ] = champs('<section><p data-calque="image">Un texte</p></section>');
    expect(champ?.type).toBe("text");
  });

  it("fait d'un groupe annoté un bloc à part entière", () => {
    const resultat = analyser(
      '<section><h2>Section</h2><div data-calque="group" data-calque-label="Bloc horaires"><p>Lundi</p><h3>Titre</h3></div></section>',
    );
    expect(resultat.page.blocks.map((bloc) => bloc.label)).toContain("Bloc horaires");
  });
});

describe("surcharges admin", () => {
  const CORPS = "<section><h1>Bonjour</h1></section>";

  it("renomme un champ sans toucher au site", () => {
    const resultat = analyzePage({
      path: "index.html",
      html: `<!DOCTYPE html><html><head><title>T</title></head><body>${CORPS}</body></html>`,
      entry: "index.html",
      lockContext: { dynamicMatchers: [] },
      overrides: {},
      knownFiles: new Set(),
    });
    const identifiant = resultat.entries[0]?.field.id as string;

    const surcharge = analyzePage({
      path: "index.html",
      html: `<!DOCTYPE html><html><head><title>T</title></head><body>${CORPS}</body></html>`,
      entry: "index.html",
      lockContext: { dynamicMatchers: [] },
      overrides: { [identifiant]: { label: "Titre d'accueil", locked: true } },
      knownFiles: new Set(),
    });

    expect(surcharge.entries[0]?.field.label).toBe("Titre d'accueil");
    expect(surcharge.entries[0]?.field.locked).toBe(true);
  });

  it("cède le pas devant une annotation explicite (§9.6)", () => {
    const html = `<!DOCTYPE html><html><head><title>T</title></head><body><section><h1 data-calque-label="Depuis le code" data-calque="text">Bonjour</h1></section></body></html>`;
    const sans = analyzePage({
      path: "index.html",
      html,
      entry: "index.html",
      lockContext: { dynamicMatchers: [] },
      overrides: {},
      knownFiles: new Set(),
    });
    const identifiant = sans.entries[0]?.field.id as string;

    const avec = analyzePage({
      path: "index.html",
      html,
      entry: "index.html",
      lockContext: { dynamicMatchers: [] },
      overrides: { [identifiant]: { label: "Depuis la base" } },
      knownFiles: new Set(),
    });

    expect(avec.entries[0]?.field.label).toBe("Depuis le code");
  });
});
