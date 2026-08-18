import { describe, expect, it } from "vitest";
import { classify, backgroundImage, type FieldCandidate } from "../src/classify";
import { findFirst, parseHtml, tagName, type Element } from "../src/tree";

/**
 * Règles de classification du §9.2. Chaque cas est un morceau de HTML tel qu'on
 * en trouve dans un site livré, pas une abstraction.
 */

const CONTEXTE = { entry: "index.html", pagePath: "index.html", source: "" };

function premier(html: string, balise: string): { element: Element; source: string } {
  const source = `<!DOCTYPE html><html><body>${html}</body></html>`;
  const document = parseHtml(source);
  const element = findFirst(document, (candidat) => tagName(candidat) === balise);
  if (element === null) throw new Error(`Aucun <${balise}>.`);
  return { element, source };
}

function classer(html: string, balise: string): FieldCandidate | null {
  const { element, source } = premier(html, balise);
  return classify(element, { ...CONTEXTE, source });
}

describe("classification des textes", () => {
  it("reconnaît un titre comme texte simple", () => {
    const candidat = classer("<h1>Le bois massif</h1>", "h1");
    expect(candidat?.type).toBe("text");
    expect(candidat?.value).toBe("Le bois massif");
  });

  it("reconnaît un paragraphe avec de la mise en forme comme texte enrichi", () => {
    const candidat = classer("<p>Paru dans <em>Le Monde</em> et ailleurs.</p>", "p");
    expect(candidat?.type).toBe("richtext");
    expect(candidat?.value).toBe("Paru dans <em>Le Monde</em> et ailleurs.");
  });

  it("garde le <br> dans un texte enrichi plutôt que de le perdre", () => {
    const candidat = classer("<p>14 route des Creuses<br>74960 Annecy</p>", "p");
    expect(candidat?.type).toBe("richtext");
    expect(candidat?.value).toContain("<br>");
  });

  it("ignore un élément d'un seul caractère", () => {
    expect(classer("<span>·</span>", "span")).toBeNull();
  });

  it("ne classe pas un conteneur : il faut y descendre", () => {
    expect(classer("<div><h2>Titre</h2><p>Texte</p></div>", "div")).toBeNull();
  });
});

describe("classification des liens", () => {
  it("distingue un bouton d'un lien ordinaire par sa classe", () => {
    expect(classer('<a href="/devis" class="btn-primaire">Devis</a>', "a")?.type).toBe(
      "cta",
    );
    expect(classer('<a href="/devis" class="lien-carte">Devis</a>', "a")?.type).toBe(
      "link",
    );
  });

  it("reconnaît aussi les classes françaises de bouton", () => {
    expect(classer('<a href="/x" class="bouton-fantome">Voir</a>', "a")?.type).toBe(
      "cta",
    );
  });

  it("traite un téléphone et un courriel comme des coordonnées", () => {
    expect(classer('<a href="tel:+33450123456">04 50 12 34 56</a>', "a")?.type).toBe(
      "contact",
    );
    expect(classer('<a href="mailto:a@b.fr">a@b.fr</a>', "a")?.type).toBe("contact");
  });

  it("reconnaît un réseau social par son domaine", () => {
    const candidat = classer('<a href="https://www.instagram.com/x">Insta</a>', "a");
    expect(candidat?.type).toBe("social");
    expect(candidat?.value).toEqual({
      network: "instagram",
      href: "https://www.instagram.com/x",
    });
  });

  /**
   * Le lien de marque renvoie à l'accueil : sa destination ne change jamais, et
   * ce que le client veut modifier est le nom de son entreprise.
   */
  it("traite le lien de marque comme un texte, pas comme un lien", () => {
    const candidat = classer('<a href="index.html" class="marque">Le Comptoir</a>', "a");
    expect(candidat?.type).toBe("text");
    expect(candidat?.value).toBe("Le Comptoir");
  });

  it("descend dans un lien qui enveloppe un logo et un nom", () => {
    expect(
      classer('<a href="#a"><img src="l.svg" alt="L"><span>Nom</span></a>', "a"),
    ).toBeNull();
  });

  /**
   * `<li><a>La carte</a></li>` : sans cette règle, le `<li>` deviendrait un
   * « texte enrichi » qui avalerait la destination du lien.
   */
  it("ne laisse pas un parent sans texte propre avaler son lien", () => {
    expect(classer('<li><a href="menu.html">La carte</a></li>', "li")).toBeNull();
  });

  it("mais garde un lien inline dans une phrase", () => {
    const candidat = classer('<p>Voir <a href="/x">la carte</a> du jour.</p>', "p");
    expect(candidat?.type).toBe("richtext");
  });
});

describe("classification des médias", () => {
  it("lit la source, le texte alternatif et les dimensions d'une image", () => {
    const candidat = classer(
      '<img src="assets/hero.jpg" alt="Atelier" width="1600" height="900">',
      "img",
    );
    expect(candidat?.type).toBe("image");
    expect(candidat?.value).toEqual({
      src: "assets/hero.jpg",
      alt: "Atelier",
      width: 1600,
      height: 900,
    });
  });

  it("prend le <img> d'un <picture> et laisse les <source> au builder", () => {
    const candidat = classer(
      '<picture><source srcset="g.jpg" media="(min-width:900px)"><img src="p.jpg" alt="P"></picture>',
      "picture",
    );
    expect(candidat?.type).toBe("image");
    expect((candidat?.value as { src: string }).src).toBe("p.jpg");
  });

  it("reconnaît une image de fond en style inline, sans cesser de descendre", () => {
    const candidat = classer(
      `<section style="background-image: url('assets/cover.jpg');"><h1>T</h1></section>`,
      "section",
    );
    expect(candidat?.type).toBe("image");
    expect((candidat?.value as { src: string }).src).toBe("assets/cover.jpg");
    expect(candidat?.descend).toBe(true);
  });

  it("distingue un plan d'une vidéo", () => {
    expect(
      classer('<iframe src="https://www.google.com/maps/embed?pb=1"></iframe>', "iframe")
        ?.type,
    ).toBe("map-embed");
    expect(
      classer('<iframe src="https://www.youtube.com/embed/x"></iframe>', "iframe")?.type,
    ).toBe("video-embed");
  });

  it("laisse une iframe inconnue hors du périmètre éditable", () => {
    expect(classer('<iframe src="https://exemple.fr/x"></iframe>', "iframe")).toBeNull();
  });
});

describe("classification des formulaires", () => {
  it("n'expose que la destination du formulaire, et continue vers les libellés", () => {
    const candidat = classer(
      '<form action="https://formspree.io/f/x" method="POST"><label for="n">Nom</label></form>',
      "form",
    );
    expect(candidat?.type).toBe("form-endpoint");
    expect(candidat?.value).toEqual({
      action: "https://formspree.io/f/x",
      method: "POST",
    });
    expect(candidat?.descend).toBe(true);
  });

  /**
   * Un bouton d'envoi n'a pas de destination. Le classer `cta` obligerait à
   * inventer un `href` vide, que le client pourrait ensuite « modifier ».
   */
  it("traite un bouton d'envoi comme un simple texte", () => {
    const candidat = classer(
      '<button type="submit" class="btn">Envoyer</button>',
      "button",
    );
    expect(candidat?.type).toBe("text");
    expect(candidat?.value).toBe("Envoyer");
  });
});

describe("backgroundImage", () => {
  it("trouve l'URL et son étendue exacte dans l'attribut style", () => {
    const { element, source } = premier(
      `<div style="background-image: url('a/b.jpg'); color: red"></div>`,
      "div",
    );
    const fond = backgroundImage(element, source);
    expect(fond?.url).toBe("a/b.jpg");
    expect(source.slice(fond?.range?.startOffset ?? 0, fond?.range?.endOffset ?? 0)).toBe(
      "a/b.jpg",
    );
  });

  it("accepte la forme raccourcie et l'absence de guillemets", () => {
    const { element, source } = premier(
      `<div style="background: #000 url(a.jpg) no-repeat"></div>`,
      "div",
    );
    expect(backgroundImage(element, source)?.url).toBe("a.jpg");
  });

  it("ne trouve rien là où il n'y a pas d'image", () => {
    const { element, source } = premier(`<div style="color: red"></div>`, "div");
    expect(backgroundImage(element, source)).toBeNull();
  });
});
