import { beforeEach, describe, expect, it } from "vitest";
import {
  FEUILLE_ID,
  installStaticMode,
  installStaticStylesheet,
  removeStaticStylesheet,
} from "../src/static-mode";

/**
 * Mode d'édition statique (§11) — « ne surtout pas négliger ».
 *
 * Sur la majorité des sites vibe-codés, les éléments sont à `opacity: 0` et
 * attendent un défilement. Dans une iframe d'édition, personne ne défile : la
 * page est vide, et l'édition impossible.
 */

beforeEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
});

describe("feuille de style d'édition", () => {
  it("force l'état final des éléments qui attendent un défilement", () => {
    installStaticStylesheet(document);
    const feuille = document.getElementById(FEUILLE_ID);
    expect(feuille).not.toBeNull();
    expect(feuille?.textContent).toContain(".reveal");
    expect(feuille?.textContent).toContain("opacity: 1 !important");
    expect(feuille?.textContent).toContain("[data-aos]");
  });

  it("est idempotente", () => {
    installStaticStylesheet(document);
    installStaticStylesheet(document);
    expect(document.querySelectorAll(`#${FEUILLE_ID}`)).toHaveLength(1);
  });

  it("se retire quand on repasse en aperçu réel", () => {
    installStaticStylesheet(document);
    removeStaticStylesheet(document);
    expect(document.getElementById(FEUILLE_ID)).toBeNull();
  });
});

describe("bouchons de bibliothèques", () => {
  it("neutralise GSAP, ScrollTrigger et les découpeurs de texte", () => {
    const fenetre = {} as Window & Record<string, unknown>;
    const resultat = installStaticMode(fenetre);

    expect(resultat.libraries).toEqual(
      expect.arrayContaining(["GSAP", "ScrollTrigger", "SplitText", "AOS"]),
    );
  });

  /**
   * `SplitText` démonte un titre en dizaines de `<span>` : le champ disparaît du
   * DOM au moment précis où l'utilisateur veut cliquer dessus. Le bouchon rend
   * l'élément intact.
   */
  it("le bouchon SplitText laisse le titre entier", () => {
    document.body.innerHTML = "<h1 data-split>Regarder longtemps</h1>";
    const fenetre = {} as Window & Record<string, unknown>;
    installStaticMode(fenetre);

    const Decoupeur = fenetre["SplitText"] as new (cible: unknown) => {
      chars: Element[];
      revert(): void;
    };
    const titre = document.querySelector("h1") as HTMLElement;
    const decoupe = new Decoupeur(titre);

    expect(titre.textContent).toBe("Regarder longtemps");
    expect(titre.querySelectorAll("span")).toHaveLength(0);
    expect(decoupe.chars).toEqual([titre]);
    expect(() => decoupe.revert()).not.toThrow();
  });

  it("le bouchon GSAP absorbe les appels sans rien animer", () => {
    document.body.innerHTML = '<div class="reveal">Texte</div>';
    const fenetre = {} as Window & Record<string, unknown>;
    installStaticMode(fenetre);

    const gsap = fenetre["gsap"] as Record<string, (...args: unknown[]) => unknown> & {
      utils: { toArray: (cible: unknown) => unknown[] };
    };

    expect(() => gsap["to"]?.(".reveal", { opacity: 1 })).not.toThrow();
    expect(() => gsap["from"]?.(".reveal", { y: 40 })).not.toThrow();
    expect(gsap.utils.toArray(".reveal")).toHaveLength(1);

    const scrollTrigger = fenetre["ScrollTrigger"] as Record<string, () => unknown>;
    expect(() => scrollTrigger["create"]?.()).not.toThrow();
    expect(scrollTrigger["getAll"]?.()).toEqual([]);
  });

  /**
   * Un script du site qui réassignerait `window.gsap` reprendrait la main et
   * remettrait tout à `opacity: 0`.
   */
  it("les bouchons ne peuvent pas être réécrits par le site", () => {
    const fenetre = {} as Window & Record<string, unknown>;
    installStaticMode(fenetre);
    const avant = fenetre["gsap"];
    try {
      fenetre["gsap"] = { to: () => "piraté" };
    } catch {
      /* en mode strict, l'écriture lève : c'est le comportement voulu */
    }
    expect(fenetre["gsap"]).toBe(avant);
  });
});
