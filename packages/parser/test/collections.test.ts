import { describe, expect, it } from "vitest";
import {
  DEFAULT_COLLECTION_SHAPE_FLOOR,
  DEFAULT_COLLECTION_SIMILARITY_THRESHOLD,
  computeFingerprint,
  fingerprintShapeSimilarity,
  fingerprintSimilarity,
} from "@calque/blueprint/ids";
import { analyzePage } from "../src/page";

/**
 * Détection des collections répétables (§9.3) — « c'est ce qui permet au client
 * d'ajouter des éléments ».
 *
 * Ce fichier gèle la calibration du seuil et du plancher : chaque cas limite
 * vient d'une des trois fixtures. Modifier `DEFAULT_COLLECTION_*` sans regarder
 * ces cas casserait soit le regroupement des collections hétérogènes, soit la
 * séparation des mises en page à deux colonnes.
 */

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

function collections(corps: string) {
  return analyser(corps).page.blocks.flatMap((bloc) => bloc.collections);
}

const empreinte = (tagName: string, classes: string[], shapeHash: string): string =>
  computeFingerprint({ tagName, classes, shapeHash });

describe("calibration du regroupement", () => {
  /** Fixture 01 : trois cartes dont une porte un badge et une n'a pas d'image. */
  it("regroupe les cartes de service inégales de la fixture 01", () => {
    const carte = empreinte("article", ["carte"], "img+div(h3+p+a)");
    const avecBadge = empreinte(
      "article",
      ["carte", "carte--populaire"],
      "span+img+div(h3+p+a)",
    );
    const sansImage = empreinte("article", ["carte"], "div(h3+p+a)");

    for (const autre of [avecBadge, sansImage]) {
      expect(fingerprintSimilarity(carte, autre)).toBeGreaterThanOrEqual(
        DEFAULT_COLLECTION_SIMILARITY_THRESHOLD,
      );
      expect(fingerprintShapeSimilarity(carte, autre)).toBeGreaterThanOrEqual(
        DEFAULT_COLLECTION_SHAPE_FLOOR,
      );
    }
  });

  /** Fixture 02 : trois `<picture>` et un `<img>` nu dans la même galerie. */
  it("regroupe une galerie où un item se passe de <picture>", () => {
    const avecPicture = empreinte("figure", [], "picture(source+img)+figcaption");
    const avecImg = empreinte("figure", [], "img+figcaption");
    expect(fingerprintSimilarity(avecPicture, avecImg)).toBeGreaterThanOrEqual(
      DEFAULT_COLLECTION_SIMILARITY_THRESHOLD,
    );
  });

  /**
   * Le contre-exemple qui fixe le plancher : deux colonnes de mise en page n'ont
   * ni l'une ni l'autre de classe, donc une similarité de classes parfaite.
   */
  it("ne regroupe pas deux colonnes d'une mise en page", () => {
    const gauche = empreinte("div", [], "h2+dl(div+div+div+div)");
    const droite = empreinte("div", [], "h2+p(br)+p(a+br+a)");
    expect(fingerprintSimilarity(gauche, droite)).toBeLessThan(
      DEFAULT_COLLECTION_SIMILARITY_THRESHOLD,
    );
  });

  it("ne regroupe pas un paragraphe d'adresse avec un paragraphe de liens", () => {
    const adresse = empreinte("p", [], "br");
    const liens = empreinte("p", [], "a+br+a");
    expect(fingerprintShapeSimilarity(adresse, liens)).toBeLessThan(
      DEFAULT_COLLECTION_SHAPE_FLOOR,
    );
  });
});

describe("formation des collections", () => {
  const CARTES = `
    <section>
      <h2>Nos services</h2>
      <div class="grille">
        <article class="carte"><img src="a.jpg" alt="A"><h3>Un</h3><p>Texte un</p></article>
        <article class="carte"><img src="b.jpg" alt="B"><h3>Deux</h3><p>Texte deux</p></article>
        <article class="carte"><img src="c.jpg" alt="C"><h3>Trois</h3><p>Texte trois</p></article>
      </div>
    </section>`;

  it("forme une collection à partir de trois cartes consécutives", () => {
    const [collection] = collections(CARTES);
    expect(collection?.items).toHaveLength(3);
    expect(collection?.itemTemplate.fields.map((champ) => champ.type)).toEqual([
      "image",
      "text",
      "text",
    ]);
  });

  it("borne l'ajout selon le §9.3.6", () => {
    const [collection] = collections(CARTES);
    expect(collection?.min).toBe(1);
    expect(collection?.max).toBe(12);
  });

  it("découpe le gabarit dans le source, marqueurs posés et valeurs vidées", () => {
    const [collection] = collections(CARTES);
    const gabarit = collection?.itemTemplate.html ?? "";
    expect(gabarit).toContain('class="carte"');
    expect(gabarit).toContain('data-f="f1"');
    expect(gabarit).toContain('src=""');
    expect(gabarit).not.toContain("Texte un");
  });

  it("conserve où chaque valeur a été prise, pour que le builder sache où écrire", () => {
    const [collection] = collections(CARTES);
    const premier = collection?.items[0];
    expect(premier?.values["f2"]).toBe("Un");
    expect(premier?.valueMeta["f2"]?.domPath).toContain("article:nth-of-type(1)");
    expect(premier?.valueMeta["f2"]?.valueRanges?.["text"]).toBeDefined();
  });

  /**
   * Sans alignement dans l'ordre, un item portant un élément en plus décalerait
   * toutes les valeurs suivantes d'un cran : le titre atterrirait dans
   * l'emplacement du badge.
   */
  it("aligne les valeurs dans l'ordre quand un item porte un élément en plus", () => {
    const [collection] = collections(`
      <section>
        <h2>Services</h2>
        <div class="grille">
          <article class="carte"><img src="a.jpg" alt="A"><h3>Un</h3><p>Texte un</p></article>
          <article class="carte carte--populaire"><span class="badge">Populaire</span><img src="b.jpg" alt="B"><h3>Deux</h3><p>Texte deux</p></article>
          <article class="carte"><img src="c.jpg" alt="C"><h3>Trois</h3><p>Texte trois</p></article>
        </div>
      </section>`);

    const gabarit = collection?.itemTemplate.fields ?? [];
    expect(gabarit.map((champ) => champ.type)).toEqual(["text", "image", "text", "text"]);

    // La carte sans badge laisse l'emplacement `f1` vide et garde le reste en place.
    const sansBadge = collection?.items[0];
    expect(sansBadge?.values["f1"]).toBeUndefined();
    expect(sansBadge?.values["f3"]).toBe("Un");
    expect(collection?.items[1]?.values["f1"]).toBe("Populaire");
    expect(collection?.cohesion).toBeLessThan(1);
  });

  it("refuse de faire une collection de deux paragraphes de prose", () => {
    expect(
      collections(`
        <section>
          <h2>À propos</h2>
          <div>
            <p>Premier paragraphe, assez long pour être du contenu véritable.</p>
            <p>Second paragraphe, tout aussi long et tout aussi peu répétable.</p>
          </div>
        </section>`),
    ).toEqual([]);
  });

  it("refuse une collection dont un membre ne porte rien d'éditable", () => {
    expect(
      collections(`
        <section>
          <h2>Grille</h2>
          <div><div><p>Texte</p></div><div><div></div></div></div>
        </section>`),
    ).toEqual([]);
  });
});

describe("faux positifs destructeurs (§9.3.7)", () => {
  it("ne fait pas du menu de navigation une collection modifiable", () => {
    const resultat = analyser(`
      <header>
        <nav aria-label="Navigation principale">
          <ul>
            <li><a href="index.html">Accueil</a></li>
            <li><a href="menu.html">La carte</a></li>
            <li><a href="contact.html">Réserver</a></li>
          </ul>
        </nav>
      </header>`);

    expect(resultat.page.blocks.flatMap((bloc) => bloc.collections)).toEqual([]);
    expect(resultat.locked.some((verrou) => verrou.reason === "navigation")).toBe(true);
  });

  it("verrouille la destination des liens de menu, mais laisse les coordonnées ouvertes", () => {
    const resultat = analyser(`
      <footer>
        <ul>
          <li><a href="mentions.html">Mentions légales</a></li>
          <li><a href="cgv.html">Conditions</a></li>
        </ul>
        <ul>
          <li><a href="tel:+33450123456">04 50 12 34 56</a></li>
          <li><a href="https://www.instagram.com/x">Instagram</a></li>
        </ul>
      </footer>`);

    const parType = new Map(
      resultat.entries.map((entree) => [entree.field.type, entree.field.locked]),
    );
    expect(parType.get("link")).toBe(true);
    expect(parType.get("contact")).toBe(false);
    expect(parType.get("social")).toBe(false);
  });

  it("ne fait pas des sections d'une page une collection", () => {
    const resultat = analyser(`
      <main>
        <section class="s"><h2>Un</h2><p>Texte un</p></section>
        <section class="s"><h2>Deux</h2><p>Texte deux</p></section>
      </main>`);
    expect(resultat.page.blocks.flatMap((bloc) => bloc.collections)).toEqual([]);
    expect(resultat.page.blocks).toHaveLength(2);
  });

  it("ne fait pas des lignes d'un formulaire une collection", () => {
    const resultat = analyser(`
      <section>
        <form action="/envoi">
          <p><label for="a">Nom</label><input id="a"></p>
          <p><label for="b">Email</label><input id="b"></p>
          <p><label for="c">Message</label><input id="c"></p>
        </form>
      </section>`);
    expect(resultat.page.blocks.flatMap((bloc) => bloc.collections)).toEqual([]);
  });
});
