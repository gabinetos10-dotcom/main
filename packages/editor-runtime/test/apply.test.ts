import { beforeEach, describe, expect, it } from "vitest";
import { appliquerValeur, assainirEnPlace, estEditableEnLigne } from "../src/apply";

/**
 * Application d'une valeur dans le DOM vivant (§11) : ce que le client voit
 * changer immédiatement, sans rechargement.
 */

beforeEach(() => {
  document.body.replaceChildren();
});

function premier<T extends Element>(selecteur: string): T {
  const element = document.querySelector<T>(selecteur);
  if (element === null) throw new Error(`Aucun ${selecteur}`);
  return element;
}

describe("appliquerValeur", () => {
  it("écrit un texte", () => {
    document.body.innerHTML = "<h1>Avant</h1>";
    expect(appliquerValeur(premier("h1"), "text", "Après")).toBe(true);
    expect(premier("h1").textContent).toBe("Après");
  });

  it("n'interprète jamais un texte comme du balisage", () => {
    document.body.innerHTML = "<h1>Avant</h1>";
    appliquerValeur(premier("h1"), "text", "<img src=x onerror=alert(1)>");
    expect(premier("h1").querySelector("img")).toBeNull();
    expect(premier("h1").textContent).toContain("<img");
  });

  it("écrit une image et retire le srcset devenu faux", () => {
    document.body.innerHTML = '<img src="a.jpg" srcset="a-2x.jpg 2x" alt="A">';
    appliquerValeur(premier("img"), "image", { src: "b.jpg", alt: "B" });

    const image = premier<HTMLImageElement>("img");
    expect(image.getAttribute("src")).toBe("b.jpg");
    expect(image.alt).toBe("B");
    expect(image.hasAttribute("srcset")).toBe(false);
  });

  it("écrit une image de fond sur un élément qui n'est pas une balise img", () => {
    document.body.innerHTML = '<section id="hero"></section>';
    appliquerValeur(premier("#hero"), "image", { src: "cover.jpg" });
    expect(premier<HTMLElement>("#hero").style.backgroundImage).toContain("cover.jpg");
  });

  it("écrit le libellé et la destination d'un lien", () => {
    document.body.innerHTML = '<a href="/a">Avant</a>';
    appliquerValeur(premier("a"), "cta", { label: "Après", href: "/b" });
    expect(premier("a").textContent).toBe("Après");
    expect(premier("a").getAttribute("href")).toBe("/b");
  });

  it("refuse une destination en javascript:", () => {
    document.body.innerHTML = '<a href="/a">L</a>';
    appliquerValeur(premier("a"), "link", { label: "L", href: "javascript:alert(1)" });
    expect(premier("a").getAttribute("href")).toBe("#");
  });

  it("reconstruit l'URL d'un plan à partir de l'adresse", () => {
    document.body.innerHTML = '<iframe src="https://exemple.fr"></iframe>';
    appliquerValeur(premier("iframe"), "map-embed", { address: "12 rue de la Paix" });
    expect(premier<HTMLIFrameElement>("iframe").src).toContain(
      "maps?q=12%20rue%20de%20la%20Paix",
    );
  });

  it("renvoie faux pour un type qu'il ne sait pas écrire", () => {
    document.body.innerHTML = "<span></span>";
    expect(appliquerValeur(premier("span"), "icon", {})).toBe(false);
  });
});

describe("assainirEnPlace", () => {
  /** §11 : « sanitisation à la frappe (aucun HTML collé) ». */
  it("garde la mise en forme reconnue et déballe le reste", () => {
    // Le conteneur est un `div` et non un `p` : un analyseur HTML referme un
    // `p` devant un `div`, et la fixture ne testerait alors pas ce qu'on croit.
    document.body.innerHTML =
      '<div id="riche"><b>Gras</b><span style="color:red">Rouge</span><iframe src="x"></iframe><div>Bloc</div></div>';
    assainirEnPlace(premier("#riche"));

    const riche = premier("#riche");
    expect(riche.querySelector("b")).not.toBeNull();
    expect(riche.querySelector("iframe")).toBeNull();
    expect(riche.querySelector("div")).toBeNull();
    // Le contenu déballé survit : le client ne perd pas ce qu'il croyait écrire.
    expect(riche.textContent).toContain("Bloc");
    expect(riche.textContent).toContain("Rouge");
  });

  it("retire les attributs de style et les gestionnaires d'événement", () => {
    document.body.innerHTML = '<p><b style="color:red" onclick="x()">G</b></p>';
    assainirEnPlace(premier("p"));
    const b = premier("b");
    expect(b.hasAttribute("style")).toBe(false);
    expect(b.hasAttribute("onclick")).toBe(false);
  });

  it("garde un href sûr, écarte un href exécutable", () => {
    document.body.innerHTML =
      '<p><a href="/ok">A</a><a href="javascript:alert(1)">B</a></p>';
    assainirEnPlace(premier("p"));
    const liens = document.querySelectorAll("a");
    expect(liens[0]?.getAttribute("href")).toBe("/ok");
    expect(liens[1]?.hasAttribute("href")).toBe(false);
  });
});

describe("estEditableEnLigne", () => {
  it("n'ouvre l'édition en place que pour ce qui est du texte", () => {
    expect(estEditableEnLigne("text")).toBe(true);
    expect(estEditableEnLigne("richtext")).toBe(true);
    expect(estEditableEnLigne("contact")).toBe(true);
    expect(estEditableEnLigne("image")).toBe(false);
    expect(estEditableEnLigne("cta")).toBe(false);
  });
});
