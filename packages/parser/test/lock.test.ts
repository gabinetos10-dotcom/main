import { describe, expect, it } from "vitest";
import {
  carriesContent,
  isAnimatedCounter,
  isCustomElement,
  lockDecision,
} from "../src/lock";
import { compileSimpleSelector } from "../src/simple-selector";
import { findFirst, parseHtml, tagName, type Element } from "../src/tree";

/**
 * Verrouillage automatique du §9.2.
 *
 * Un faux positif destructeur — un élément structurel présenté comme éditable —
 * est la seule erreur du parser qui casse le site du client. Ces règles sont
 * donc volontairement du côté de la prudence.
 */

const SANS_SCRIPT = { dynamicMatchers: [] };

function premier(html: string, balise: string): Element {
  const document = parseHtml(`<!DOCTYPE html><html><body>${html}</body></html>`);
  const element = findFirst(document, (candidat) => tagName(candidat) === balise);
  if (element === null) throw new Error(`Aucun <${balise}>.`);
  return element;
}

describe("lockDecision", () => {
  it("verrouille les balises techniques et tout leur contenu", () => {
    for (const balise of ["script", "style", "noscript", "template"]) {
      const decision = lockDecision(
        premier(`<${balise}>x</${balise}>`, balise),
        SANS_SCRIPT,
      );
      expect(decision?.subtree, balise).toBe(true);
    }
  });

  it("verrouille les champs de saisie : le §9.2 n'ouvre que leurs libellés", () => {
    expect(
      lockDecision(premier('<input type="text">', "input"), SANS_SCRIPT)?.reason,
    ).toBe("structure-formulaire");
    expect(
      lockDecision(premier("<textarea></textarea>", "textarea"), SANS_SCRIPT)?.reason,
    ).toBe("structure-formulaire");
  });

  it("verrouille un élément décoratif annoncé comme tel", () => {
    expect(
      lockDecision(
        premier('<img src="l.svg" alt="" aria-hidden="true">', "img"),
        SANS_SCRIPT,
      )?.reason,
    ).toBe("decoratif");
  });

  it("verrouille un compteur animé, dont le HTML ne contient que « 0 »", () => {
    expect(
      lockDecision(premier('<p class="counter" data-count="27">0</p>', "p"), SANS_SCRIPT)
        ?.reason,
    ).toBe("compteur-anime");
  });

  it("verrouille un composant maison, dont le contenu vit dans un shadow root", () => {
    const decision = lockDecision(
      premier("<my-lightbox><span>x</span></my-lightbox>", "my-lightbox"),
      SANS_SCRIPT,
    );
    expect(decision?.reason).toBe("shadow-dom");
    expect(decision?.subtree).toBe(true);
  });

  it("verrouille un conteneur vide, mais pas une image", () => {
    expect(
      lockDecision(premier('<div class="voile"></div>', "div"), SANS_SCRIPT)?.reason,
    ).toBe("wrapper-vide");
    expect(
      lockDecision(premier('<img src="a.jpg" alt="A">', "img"), SANS_SCRIPT),
    ).toBeNull();
  });

  it("verrouille ce qu'un script réécrit au chargement", () => {
    const matcher = compileSimpleSelector("[data-annee]");
    expect(matcher).not.toBeNull();
    const decision = lockDecision(premier("<span data-annee>2026</span>", "span"), {
      dynamicMatchers: [matcher as never],
    });
    expect(decision?.reason).toBe("texte-dynamique");
  });

  it("laisse passer un titre ordinaire", () => {
    expect(lockDecision(premier("<h2>Nos services</h2>", "h2"), SANS_SCRIPT)).toBeNull();
  });
});

describe("prédicats", () => {
  it("compte une image comme du contenu, même sans texte", () => {
    expect(
      carriesContent(premier('<figure><img src="a.jpg" alt=""></figure>', "figure")),
    ).toBe(true);
    expect(carriesContent(premier("<div><div></div></div>", "div"))).toBe(false);
  });

  it("reconnaît un compteur par sa classe ou par son attribut", () => {
    expect(isAnimatedCounter(premier('<p class="compteur-defilement">0</p>', "p"))).toBe(
      true,
    );
    expect(isAnimatedCounter(premier('<p data-count="5">0</p>', "p"))).toBe(true);
    expect(isAnimatedCounter(premier("<p>27</p>", "p"))).toBe(false);
  });

  it("reconnaît un élément personnalisé à son tiret", () => {
    expect(isCustomElement(premier("<my-lightbox>x</my-lightbox>", "my-lightbox"))).toBe(
      true,
    );
    expect(isCustomElement(premier("<section>x</section>", "section"))).toBe(false);
  });
});
