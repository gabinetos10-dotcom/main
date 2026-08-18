import { describe, expect, it } from "vitest";
import type { Blueprint, Collection, ContentData } from "@calque/blueprint";
import { addedItemId, duplicatedFieldId } from "@calque/blueprint/ids";
import { loadFixtureSnapshot } from "@calque/fixtures";
import { analyze } from "@calque/parser";
import {
  build,
  initialContent,
  itemValueKey,
  OVERRIDES_PATH,
  renderOverrides,
} from "../src/index";

/**
 * Collections et blocs (§13, §15 étapes 4 et 5).
 *
 * Le HTML source n'est jamais amputé : masquer un bloc passe par la feuille de
 * surcharge, supprimer un item ne touche qu'à la sortie du build.
 */

const EPOCH = new Date("2026-01-01T00:00:00.000Z");
const decodeur = new TextDecoder();

async function preparer() {
  const snapshot = await loadFixtureSnapshot("01-artisan-landing");
  const { blueprint } = await analyze(snapshot, { now: EPOCH });
  return { snapshot, blueprint, contenu: initialContent(blueprint) };
}

function collections(blueprint: Blueprint): Collection[] {
  return blueprint.pages.flatMap((page) =>
    page.blocks.flatMap((bloc) => bloc.collections),
  );
}

function services(blueprint: Blueprint): Collection {
  const trouvee = collections(blueprint).find(
    (c) => c.items.length === 3 && c.itemTemplate.fields.some((f) => f.type === "image"),
  );
  if (trouvee === undefined) throw new Error("Collection de services introuvable.");
  return trouvee;
}

function html(
  fichiers: readonly { path: string; content: Uint8Array }[],
  chemin: string,
): string {
  const fichier = fichiers.find((candidat) => candidat.path === chemin);
  if (fichier === undefined) throw new Error(`${chemin} absent.`);
  return decodeur.decode(fichier.content);
}

function avecCollection(
  contenu: ContentData,
  id: string,
  etat: Partial<ContentData["collections"][string]>,
): ContentData {
  const actuel = contenu.collections[id] ?? { order: [], added: {}, removed: [] };
  return {
    ...contenu,
    collections: { ...contenu.collections, [id]: { ...actuel, ...etat } },
  };
}

describe("items de collection", () => {
  it("supprime un item sans toucher au HTML source", async () => {
    const { snapshot, blueprint, contenu } = await preparer();
    const collection = services(blueprint);
    const retire = collection.items[1]?.itemId as string;

    const resultat = await build(
      snapshot,
      blueprint,
      avecCollection(contenu, collection.id, { removed: [retire] }),
    );
    const sortie = html(resultat.files, "index.html");

    expect(sortie).not.toContain("Le plus demandé");
    expect(sortie).toContain("Cuisines sur mesure");
    expect(sortie).toContain("Bibliothèques et rangements");
    // Le fichier déposé est intact : seule la sortie du build change.
    const source = decodeur.decode(
      snapshot.files.find((f) => f.path === "index.html")?.content as Uint8Array,
    );
    expect(source).toContain("Le plus demandé");
  });

  it("réordonne les items dans l'ordre demandé", async () => {
    const { snapshot, blueprint, contenu } = await preparer();
    const collection = services(blueprint);
    const ordre = [...collection.items.map((item) => item.itemId)].reverse();

    const sortie = html(
      (
        await build(
          snapshot,
          blueprint,
          avecCollection(contenu, collection.id, { order: ordre }),
        )
      ).files,
      "index.html",
    );

    expect(sortie.indexOf("Bibliothèques et rangements")).toBeLessThan(
      sortie.indexOf("Cuisines sur mesure"),
    );
  });

  /** §22 P7 : « ajout d'une 4ᵉ carte service depuis l'UI, correctement stylée ». */
  it("ajoute un item à partir du gabarit, avec les mêmes classes que ses voisins", async () => {
    const { snapshot, blueprint, contenu } = await preparer();
    const collection = services(blueprint);
    const nouvel = addedItemId(collection.id, "1");

    const clefs = collection.itemTemplate.fields;
    const valeurs: Record<string, unknown> = {};
    for (const gabarit of clefs) {
      if (gabarit.type === "image") {
        valeurs[gabarit.key] = { src: "assets/atelier.jpg", alt: "Terrasses" };
      } else if (gabarit.type === "link" || gabarit.type === "cta") {
        valeurs[gabarit.key] = { label: "Demander un devis", href: "#contact" };
      } else {
        valeurs[gabarit.key] = "Terrasses et bardages";
      }
    }

    const sortie = html(
      (
        await build(
          snapshot,
          blueprint,
          avecCollection(contenu, collection.id, {
            order: [...collection.items.map((item) => item.itemId), nouvel],
            added: { [nouvel]: valeurs },
          }),
        )
      ).files,
      "index.html",
    );

    expect(sortie).toContain("Terrasses et bardages");
    expect(sortie).toContain('class="carte carte--populaire"');
    // Les marqueurs du gabarit ne survivent pas au build.
    expect(sortie).not.toContain("data-f=");
  });

  /**
   * Régression : l'instanciation repérait les emplacements à l'index dans la
   * chaîne, et prenait la balise ouvrante du conteneur pour celle du champ.
   * Écrire le titre effaçait alors tout le corps de la carte, et l'image
   * recevait un second `src` au lieu de voir le sien réécrit.
   */
  it("instancie une carte entière, sans confondre les balises imbriquées", async () => {
    const { snapshot, blueprint, contenu } = await preparer();
    const collection = services(blueprint);
    const nouvel = addedItemId(collection.id, "2");

    const valeurs: Record<string, unknown> = {};
    for (const gabarit of collection.itemTemplate.fields) {
      if (gabarit.type === "image") {
        valeurs[gabarit.key] = { src: "assets/atelier.jpg", alt: "Atelier" };
      } else if (gabarit.type === "link" || gabarit.type === "cta") {
        valeurs[gabarit.key] = { label: "Nous écrire", href: "#contact" };
      } else {
        valeurs[gabarit.key] = "Terrasses";
      }
    }

    const sortie = html(
      (
        await build(
          snapshot,
          blueprint,
          avecCollection(contenu, collection.id, {
            order: [...collection.items.map((item) => item.itemId), nouvel],
            added: { [nouvel]: valeurs },
          }),
        )
      ).files,
      "index.html",
    );

    const cartes = [
      ...sortie.matchAll(/<article class="carte[^"]*">[\s\S]*?<\/article>/gu),
    ];
    const ajoutee = cartes.at(-1)?.[0] as string;

    // La carte est complète : titre, texte et lien, chacun une seule fois.
    expect(ajoutee).toContain("<h3");
    expect(ajoutee).toContain("</h3>");
    expect(ajoutee.match(/<p /gu)).toHaveLength(1);
    expect(ajoutee.match(/<a /gu)).toHaveLength(1);
    expect(ajoutee).toContain("Nous écrire");

    // Et aucun attribut n'y figure deux fois.
    expect(ajoutee.match(/ src="/gu)).toHaveLength(1);
    expect(ajoutee.match(/ alt="/gu)).toHaveLength(1);
    expect(ajoutee.match(/ href="/gu)).toHaveLength(1);
    expect(ajoutee).toContain('src="assets/atelier.jpg"');
    expect(ajoutee).toContain('href="#contact"');
  });

  /**
   * L'aperçu doit pouvoir désigner un item **après** un réordonnancement.
   *
   * Un chemin DOM désigne une position, pas un item : après un échange, il
   * pointe sur le voisin. Le marquage est donc posé sur tous les items en mode
   * aperçu — y compris ceux des collections que le client n'a pas touchées,
   * dont le HTML sort tel quel de la source.
   */
  it("marque tous les items en mode aperçu, même sans modification", async () => {
    const { snapshot, blueprint, contenu } = await preparer();
    const collection = services(blueprint);

    const sortie = html(
      (
        await build(snapshot, blueprint, contenu, {
          injectEditorRuntime: true,
          editorRuntimeUrl: "/runtime.js",
          editorConfig: { fields: [], parentOrigin: "https://exemple.fr", labels: {} },
        })
      ).files,
      "index.html",
    );

    for (const item of collection.items) {
      expect(sortie).toContain(`data-calque-item="${item.itemId}"`);
    }
  });

  it("garde le marquage aligné sur l'ordre demandé", async () => {
    const { snapshot, blueprint, contenu } = await preparer();
    const collection = services(blueprint);
    const ordre = [...collection.items].reverse().map((item) => item.itemId);

    const sortie = html(
      (
        await build(
          snapshot,
          blueprint,
          avecCollection(contenu, collection.id, { order: ordre }),
          {
            injectEditorRuntime: true,
            editorRuntimeUrl: "/runtime.js",
            editorConfig: { fields: [], parentOrigin: "https://exemple.fr", labels: {} },
          },
        )
      ).files,
      "index.html",
    );

    // La page porte d'autres listes : on ne regarde que celle qu'on a réordonnée.
    const marques = [...sortie.matchAll(/data-calque-item="([^"]+)"/gu)]
      .map((trouve) => trouve[1] as string)
      .filter((itemId) => ordre.includes(itemId));
    expect(marques).toEqual(ordre);
  });

  /** Le site publié ne porte aucune trace de l'outil (§15 étape 9). */
  it("ne marque rien hors du mode aperçu", async () => {
    const { snapshot, blueprint, contenu } = await preparer();
    const collection = services(blueprint);
    const ordre = [...collection.items].reverse().map((item) => item.itemId);

    const sortie = html(
      (
        await build(
          snapshot,
          blueprint,
          avecCollection(contenu, collection.id, { order: ordre }),
        )
      ).files,
      "index.html",
    );
    expect(sortie).not.toContain("data-calque-item");
  });

  it("modifie la valeur d'un item sans réécrire la collection", async () => {
    const { snapshot, blueprint, contenu } = await preparer();
    const collection = services(blueprint);
    const item = collection.items[0];
    const titre = collection.itemTemplate.fields.find(
      (f) => f.type === "text" && item?.valueMeta[f.key] !== undefined,
    );
    const clef = itemValueKey(item?.itemId as string, titre?.key as string);

    const sortie = html(
      (
        await build(snapshot, blueprint, {
          ...contenu,
          fields: { ...contenu.fields, [clef]: "Cuisines et arrière-cuisines" },
        })
      ).files,
      "index.html",
    );

    expect(sortie).toContain("Cuisines et arrière-cuisines");
    expect(sortie).toContain("Escaliers");
  });
});

describe("blocs", () => {
  it("masque un bloc par la feuille de surcharge, sans supprimer le HTML", async () => {
    const { snapshot, blueprint, contenu } = await preparer();
    const bloc = blueprint.pages[0]?.blocks.find(
      (candidat) => candidat.label === "L'atelier",
    );
    expect(bloc).toBeDefined();

    const resultat = await build(snapshot, blueprint, {
      ...contenu,
      blocks: { [bloc?.id as string]: { hidden: true, duplicates: [] } },
    });

    const css = decodeur.decode(
      resultat.files.find((f) => f.path === OVERRIDES_PATH)?.content as Uint8Array,
    );
    expect(css).toContain(`${bloc?.domPath} { display: none !important; }`);
    expect(html(resultat.files, "index.html")).toContain("L'atelier");
    expect(html(resultat.files, "index.html")).toContain(OVERRIDES_PATH);
  });

  it("duplique un bloc entier après le bloc source", async () => {
    const { snapshot, blueprint, contenu } = await preparer();
    const bloc = blueprint.pages[0]?.blocks.find(
      (candidat) => candidat.label === "Ce qu'en disent nos clients",
    );
    expect(bloc).toBeDefined();

    const sortie = html(
      (
        await build(snapshot, blueprint, {
          ...contenu,
          blocks: { [bloc?.id as string]: { hidden: false, duplicates: ["a"] } },
        })
      ).files,
      "index.html",
    );

    const occurrences = sortie.split("Ce qu'en disent nos clients").length - 1;
    expect(occurrences).toBe(2);
  });

  /**
   * La copie partage chemin DOM et empreinte avec son bloc source : sans
   * marquage propre, cliquer dans la copie modifierait l'original.
   */
  it("donne à la copie ses propres identifiants de champ en aperçu", async () => {
    const { snapshot, blueprint, contenu } = await preparer();
    const bloc = blueprint.pages[0]?.blocks.find(
      (candidat) => candidat.label === "Ce qu'en disent nos clients",
    );
    const champ = bloc?.fields.find((candidat) => !candidat.locked);
    expect(champ).toBeDefined();

    const avecCopie = {
      ...contenu,
      blocks: { [bloc?.id as string]: { hidden: false, duplicates: ["a"] } },
    };

    const apercu = html(
      (
        await build(snapshot, blueprint, avecCopie, {
          injectEditorRuntime: true,
          editorRuntimeUrl: "/runtime.js",
          editorConfig: { fields: [], parentOrigin: "https://exemple.fr", labels: {} },
        })
      ).files,
      "index.html",
    );

    const copie = duplicatedFieldId(champ?.id as string, "a");
    expect(apercu).toContain(`data-calque-field="${champ?.id as string}"`);
    expect(apercu).toContain(`data-calque-field="${copie}"`);

    // Et la valeur écrite sur la copie ne touche pas l'original.
    const modifie = html(
      (
        await build(snapshot, blueprint, {
          ...avecCopie,
          fields: { ...avecCopie.fields, [copie]: "Un autre avis" },
        })
      ).files,
      "index.html",
    );
    expect(modifie).toContain("Un autre avis");
    expect(modifie).not.toContain("data-calque-field");
  });
});

describe("masquage et duplication ensemble", () => {
  it("masque le bloc visé, pas la copie du bloc précédent", async () => {
    const { blueprint, contenu } = await preparer();
    const page = blueprint.pages[0];
    const services = page?.blocks.find(
      (candidat) => candidat.label === "Ce que nous fabriquons",
    );
    const avis = page?.blocks.find(
      (candidat) => candidat.label === "Ce qu'en disent nos clients",
    );
    expect(services).toBeDefined();
    expect(avis).toBeDefined();

    const { css } = renderOverrides(blueprint, {
      ...contenu,
      blocks: {
        [services?.id as string]: { hidden: false, duplicates: ["a"] },
        [avis?.id as string]: { hidden: true, duplicates: [] },
      },
    });

    // Le rang du bloc masqué a glissé d'un cran dans le document construit :
    // le sélecteur doit suivre, sinon c'est la copie qui disparaît.
    const rangSource = /nth-of-type\((\d+)\)$/u.exec(avis?.domPath as string);
    const rangSorti = /nth-of-type\((\d+)\)[^)]*\{/u.exec(css);
    expect(rangSource).not.toBeNull();
    expect(rangSorti).not.toBeNull();
    expect(Number(rangSorti?.[1])).toBe(Number(rangSource?.[1]) + 1);
  });

  it("laisse le sélecteur intact quand rien n'est dupliqué", async () => {
    const { blueprint, contenu } = await preparer();
    const avis = blueprint.pages[0]?.blocks.find(
      (candidat) => candidat.label === "Ce qu'en disent nos clients",
    );

    const { css } = renderOverrides(blueprint, {
      ...contenu,
      blocks: { [avis?.id as string]: { hidden: true, duplicates: [] } },
    });
    expect(css).toContain(`${avis?.domPath as string} { display: none !important; }`);
  });
});

describe("thème", () => {
  it("écrit les jetons modifiés dans une feuille chargée en dernier", async () => {
    const snapshot = await loadFixtureSnapshot("02-restaurant-multipage");
    const { blueprint } = await analyze(snapshot, { now: EPOCH });
    const contenu = initialContent(blueprint);
    const jeton = blueprint.theme.tokens.find((t) => t.cssVar === "--couleur-primaire");

    const resultat = await build(snapshot, blueprint, {
      ...contenu,
      theme: { ...contenu.theme, [jeton?.id as string]: "#123456" },
    });

    const css = decodeur.decode(
      resultat.files.find((f) => f.path === OVERRIDES_PATH)?.content as Uint8Array,
    );
    expect(css).toContain("--couleur-primaire: #123456;");

    // Le CSS d'origine n'est jamais modifié (§9.4).
    const variables = decodeur.decode(
      resultat.files.find((f) => f.path === "css/variables.css")?.content as Uint8Array,
    );
    expect(variables).toContain("--couleur-primaire: #6d3b2c;");

    // La surcharge est chargée après les feuilles du site.
    const page = html(resultat.files, "index.html");
    expect(page.indexOf(OVERRIDES_PATH)).toBeGreaterThan(page.indexOf("css/layout.css"));
  });

  it("refuse une valeur de jeton qui tenterait de fermer la règle", async () => {
    const snapshot = await loadFixtureSnapshot("02-restaurant-multipage");
    const { blueprint } = await analyze(snapshot, { now: EPOCH });
    const contenu = initialContent(blueprint);
    const jeton = blueprint.theme.tokens[0];

    const resultat = await build(snapshot, blueprint, {
      ...contenu,
      theme: { ...contenu.theme, [jeton?.id as string]: "red} body{display:none" },
    });

    const css = decodeur.decode(
      resultat.files.find((f) => f.path === OVERRIDES_PATH)?.content as Uint8Array,
    );
    expect(css).not.toContain("display:none");
  });
});

describe("SEO et fichiers du site", () => {
  it("réécrit le titre et la description d'une page", async () => {
    const { snapshot, blueprint, contenu } = await preparer();

    const sortie = html(
      (
        await build(snapshot, blueprint, {
          ...contenu,
          seo: {
            "index.html": {
              title: "Menuiserie Rousseau — Escaliers sur mesure",
              description: "Une description entièrement neuve.",
            },
          },
        })
      ).files,
      "index.html",
    );

    expect(sortie).toContain("<title>Menuiserie Rousseau — Escaliers sur mesure</title>");
    expect(sortie).toContain('content="Une description entièrement neuve."');
  });

  it("génère sitemap.xml et robots.txt quand l'URL du site est connue", async () => {
    const snapshot = await loadFixtureSnapshot("02-restaurant-multipage");
    const { blueprint } = await analyze(snapshot, { now: EPOCH });
    const resultat = await build(snapshot, blueprint, initialContent(blueprint), {
      siteUrl: "https://comptoir-des-halles.fr",
    });

    const sitemap = decodeur.decode(
      resultat.files.find((f) => f.path === "sitemap.xml")?.content as Uint8Array,
    );
    expect(sitemap).toContain("<loc>https://comptoir-des-halles.fr/</loc>");
    expect(sitemap).toContain("<loc>https://comptoir-des-halles.fr/menu.html</loc>");
    expect(sitemap).not.toContain("#");

    const robots = decodeur.decode(
      resultat.files.find((f) => f.path === "robots.txt")?.content as Uint8Array,
    );
    expect(robots).toContain("Sitemap: https://comptoir-des-halles.fr/sitemap.xml");
  });
});

describe("annotations et runtime d'édition", () => {
  const SOURCE = `<!DOCTYPE html><html lang="fr"><head><title>T</title></head><body><section><h1 data-calque="text" data-calque-label="Titre">Bonjour</h1></section></body></html>`;

  async function analyserFragment() {
    const snapshot = {
      entry: "index.html",
      files: [
        {
          path: "index.html",
          kind: "page" as const,
          bytes: SOURCE.length,
          sha256: "0",
          content: new TextEncoder().encode(SOURCE),
        },
      ],
      read: async () => new TextEncoder().encode(SOURCE),
    };
    const { blueprint } = await analyze(snapshot, { now: EPOCH });
    return { snapshot, blueprint, contenu: initialContent(blueprint) };
  }

  it("retire les attributs data-calque du site publié (§15 étape 9)", async () => {
    const { snapshot, blueprint, contenu } = await analyserFragment();
    const sortie = html((await build(snapshot, blueprint, contenu)).files, "index.html");

    expect(sortie).not.toContain("data-calque");
    expect(sortie).toContain("<h1>Bonjour</h1>");
  });

  it("sérialise la configuration du runtime sans pouvoir fermer sa balise", async () => {
    const { snapshot, blueprint, contenu } = await analyserFragment();
    const sortie = html(
      (
        await build(snapshot, blueprint, contenu, {
          injectEditorRuntime: true,
          editorRuntimeUrl: "/runtime.js",
          editorConfig: { labels: { a: "</script><img src=x onerror=alert(1)>" } },
        })
      ).files,
      "index.html",
    );

    expect(sortie).toContain('id="calque-config"');
    expect(sortie).not.toContain("</script><img");
    expect(sortie).toContain("\\u003c/script\\u003e");
  });

  it("marque les champs et injecte le runtime en mode aperçu", async () => {
    const { snapshot, blueprint, contenu } = await analyserFragment();
    const sortie = html(
      (
        await build(snapshot, blueprint, contenu, {
          injectEditorRuntime: true,
          editorRuntimeUrl: "/runtime.js",
          editorConfig: {
            fields: [],
            parentOrigin: "https://app.calque.studio",
            labels: {},
          },
        })
      ).files,
      "index.html",
    );

    expect(sortie).toMatch(/data-calque-field="fld_[0-9a-f]{10}"/u);
    // Le runtime est en tête du <head>, avant les scripts du site : c'est le
    // seul instant où il peut neutraliser une bibliothèque d'animation (§11).
    expect(sortie).toContain('<script src="/runtime.js"></script>');
    expect(sortie.indexOf("/runtime.js")).toBeLessThan(sortie.indexOf("<title>"));
  });
});
