import { describe, expect, it } from "vitest";
import type { Blueprint, ContentData, Field } from "@calque/blueprint";
import { loadFixtureSnapshot } from "@calque/fixtures";
import { analyze } from "@calque/parser";
import { build, initialContent } from "../src/index";

/**
 * Application des patches (§15, étape 3).
 *
 * La règle qui gouverne tout : le builder n'écrit que ce qui a changé, et
 * n'écrit que l'intervalle qui porte la valeur. Un site publié après une
 * modification d'un titre ne diffère du source que par ce titre.
 */

const EPOCH = new Date("2026-01-01T00:00:00.000Z");
const decodeur = new TextDecoder();

async function preparer(fixture: "01-artisan-landing" | "02-restaurant-multipage") {
  const snapshot = await loadFixtureSnapshot(fixture);
  const { blueprint } = await analyze(snapshot, { now: EPOCH });
  return { snapshot, blueprint, contenu: initialContent(blueprint) };
}

function tousLesChamps(blueprint: Blueprint): Field[] {
  return blueprint.pages.flatMap((page) => page.blocks.flatMap((bloc) => bloc.fields));
}

function champ(blueprint: Blueprint, predicat: (champ: Field) => boolean): Field {
  const trouve = tousLesChamps(blueprint).find(predicat);
  if (trouve === undefined)
    throw new Error("Champ introuvable dans le blueprint de test.");
  return trouve;
}

function page(
  resultat: { files: readonly { path: string; content: Uint8Array }[] },
  chemin: string,
): string {
  const fichier = resultat.files.find((candidat) => candidat.path === chemin);
  if (fichier === undefined) throw new Error(`${chemin} absent de la sortie.`);
  return decodeur.decode(fichier.content);
}

function avec(contenu: ContentData, fields: Record<string, unknown>): ContentData {
  return { ...contenu, fields: { ...contenu.fields, ...fields } };
}

describe("écriture d'une valeur", () => {
  it("remplace un titre et ne touche à rien d'autre", async () => {
    const { snapshot, blueprint, contenu } = await preparer("01-artisan-landing");
    const titre = champ(
      blueprint,
      (c) => c.value === "Le bois massif, façonné pour durer",
    );

    const avant = page(await build(snapshot, blueprint, contenu), "index.html");
    const apres = page(
      await build(
        snapshot,
        blueprint,
        avec(contenu, { [titre.id]: "Le chêne, pour la vie" }),
      ),
      "index.html",
    );

    expect(apres).toContain(
      '<h1 class="font-titre text-4xl md:text-6xl text-creme leading-tight max-w-2xl">Le chêne, pour la vie</h1>',
    );
    expect(apres.length).toBe(
      avant.length -
        "Le bois massif, façonné pour durer".length +
        "Le chêne, pour la vie".length,
    );
  });

  it("écrit la source et le texte alternatif d'une image", async () => {
    const { snapshot, blueprint, contenu } = await preparer("01-artisan-landing");
    const image = champ(
      blueprint,
      (c) => c.type === "image" && (c.value as { src: string }).src === "assets/hero.jpg",
    );

    const html = page(
      await build(
        snapshot,
        blueprint,
        avec(contenu, {
          [image.id]: {
            src: "assets/nouveau.jpg",
            alt: "Nouvelle photo",
            width: 1600,
            height: 900,
          },
        }),
      ),
      "index.html",
    );

    expect(html).toContain('src="assets/nouveau.jpg"');
    expect(html).toContain('alt="Nouvelle photo"');
    expect(html).not.toContain("assets/hero.jpg");
  });

  it("écrit le libellé et la destination d'un bouton", async () => {
    const { snapshot, blueprint, contenu } = await preparer("01-artisan-landing");
    const bouton = champ(
      blueprint,
      (c) =>
        c.type === "cta" && (c.value as { label: string }).label === "Demander un devis",
    );

    const html = page(
      await build(
        snapshot,
        blueprint,
        avec(contenu, {
          [bouton.id]: { label: "Nous écrire", href: "contact.html", target: "_self" },
        }),
      ),
      "index.html",
    );

    expect(html).toContain('href="contact.html" class="btn-primaire">Nous écrire</a>');
  });

  /**
   * Une valeur de champ est une donnée, jamais du balisage. Sans échappement, un
   * client qui colle un morceau de code dans son titre injecterait un script dans
   * sa propre page.
   */
  it("échappe ce que le client saisit", async () => {
    const { snapshot, blueprint, contenu } = await preparer("01-artisan-landing");
    const titre = champ(
      blueprint,
      (c) => c.value === "Le bois massif, façonné pour durer",
    );

    const html = page(
      await build(
        snapshot,
        blueprint,
        avec(contenu, { [titre.id]: '<script>alert("x")</script> & co' }),
      ),
      "index.html",
    );

    expect(html).not.toContain("<script>alert");
    expect(html).toContain('&lt;script&gt;alert("x")&lt;/script&gt; &amp; co');
  });

  it("refuse une destination en javascript:", async () => {
    const { snapshot, blueprint, contenu } = await preparer("01-artisan-landing");
    const bouton = champ(blueprint, (c) => c.type === "cta");

    const html = page(
      await build(
        snapshot,
        blueprint,
        avec(contenu, {
          [bouton.id]: { label: "Cliquez", href: "javascript:alert(1)", target: "_self" },
        }),
      ),
      "index.html",
    );

    expect(html).not.toContain("javascript:");
  });

  it("assainit un texte enrichi contre la liste blanche", async () => {
    const { snapshot, blueprint, contenu } = await preparer("01-artisan-landing");
    const riche = champ(blueprint, (c) => c.type === "richtext");

    const html = page(
      await build(
        snapshot,
        blueprint,
        avec(contenu, {
          [riche.id]:
            '14 route<br><b>des Creuses</b><iframe src="x"></iframe><em onclick="x()">74960</em>',
        }),
      ),
      "index.html",
    );

    expect(html).toContain("<b>des Creuses</b>");
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("onclick");
  });

  it("reconstruit l'URL d'un plan à partir de l'adresse saisie", async () => {
    const { snapshot, blueprint, contenu } = await preparer("02-restaurant-multipage");
    const plan = champ(blueprint, (c) => c.type === "map-embed");

    const html = page(
      await build(
        snapshot,
        blueprint,
        avec(contenu, {
          [plan.id]: { address: "12 rue de la Paix, Paris", src: "" },
        }),
      ),
      "contact.html",
    );

    expect(html).toContain(
      "google.com/maps?q=12%20rue%20de%20la%20Paix%2C%20Paris&amp;output=embed",
    );
  });

  it("ne touche pas à un champ verrouillé", async () => {
    const { snapshot, blueprint, contenu } = await preparer("02-restaurant-multipage");
    const menu = champ(blueprint, (c) => c.locked && c.type === "link");

    const html = page(
      await build(
        snapshot,
        blueprint,
        avec(contenu, {
          [menu.id]: { label: "Piraté", href: "https://ailleurs.fr", target: "_self" },
        }),
      ),
      "index.html",
    );

    expect(html).not.toContain("Piraté");
    expect(html).not.toContain("ailleurs.fr");
  });
});

describe("aller-retour", () => {
  it("réanalyser la sortie retrouve la valeur écrite", async () => {
    const { snapshot, blueprint, contenu } = await preparer("01-artisan-landing");
    const titre = champ(
      blueprint,
      (c) => c.value === "Le bois massif, façonné pour durer",
    );

    const resultat = await build(
      snapshot,
      blueprint,
      avec(contenu, { [titre.id]: "Un titre entièrement neuf" }),
    );

    const republie = {
      ...snapshot,
      files: snapshot.files.map((fichier) => {
        const produit = resultat.files.find((candidat) => candidat.path === fichier.path);
        return produit === undefined ? fichier : { ...fichier, content: produit.content };
      }),
    };

    const { blueprint: relu } = await analyze(republie, { now: EPOCH });
    const memeChamp = tousLesChamps(relu).find((c) => c.id === titre.id);
    expect(memeChamp?.value).toBe("Un titre entièrement neuf");
  });
});

describe("champs irrésolus", () => {
  it("signale un champ absent du source au lieu d'écrire au hasard", async () => {
    const { snapshot, blueprint, contenu } = await preparer("01-artisan-landing");
    const fantome: Field = {
      ...champ(blueprint, (c) => c.type === "text"),
      id: "fld_fantome00",
      domPath: "body > main:nth-of-type(1) > section:nth-of-type(99) > h2:nth-of-type(1)",
      meta: { fingerprint: "h2|inexistante|", contentHash: "0000" },
    };

    const modifie: Blueprint = {
      ...blueprint,
      pages: blueprint.pages.map((page_, index) =>
        index === 0
          ? {
              ...page_,
              blocks: page_.blocks.map((bloc, rang) =>
                rang === 0 ? { ...bloc, fields: [...bloc.fields, fantome] } : bloc,
              ),
            }
          : page_,
      ),
    };

    const resultat = await build(
      snapshot,
      modifie,
      avec(contenu, { [fantome.id]: "Valeur pour un champ qui n'existe plus" }),
    );

    expect(resultat.unresolvedFieldIds).toContain("fld_fantome00");
    expect(page(resultat, "index.html")).not.toContain(
      "Valeur pour un champ qui n'existe plus",
    );
  });
});
