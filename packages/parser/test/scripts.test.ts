import { describe, expect, it } from "vitest";
import { analyzeScripts } from "../src/scripts";

/**
 * Analyse des scripts (§8). La question qui compte : quels éléments voient leur
 * texte écrit au chargement ? Les proposer à l'édition afficherait au client une
 * valeur aussitôt écrasée.
 *
 * La réponse se lit sur l'arbre syntaxique, jamais par recherche de texte : il
 * faut relier `element.textContent = …` au sélecteur qui a produit `element`.
 */

function analyser(code: string) {
  return analyzeScripts([{ path: "script.js", code }]);
}

describe("détection du texte écrit au runtime", () => {
  it("relie une variable à son sélecteur", () => {
    const resultat = analyser(`
      var annee = document.querySelector('[data-annee]');
      if (annee) { annee.textContent = new Date().getFullYear().toString(); }
    `);
    expect(resultat.dynamic.map((trouvaille) => trouvaille.selector)).toEqual([
      "[data-annee]",
    ]);
  });

  it("suit le paramètre d'un forEach sur querySelectorAll", () => {
    const resultat = analyser(`
      document.querySelectorAll('.counter').forEach(function (element) {
        element.textContent = '42';
      });
    `);
    expect(resultat.dynamic.map((t) => t.selector)).toEqual([".counter"]);
  });

  it("traduit getElementById en sélecteur d'identifiant", () => {
    const resultat = analyser(`
      var titre = document.getElementById('titre');
      titre.innerHTML = '<b>x</b>';
    `);
    expect(resultat.dynamic.map((t) => t.selector)).toEqual(["#titre"]);
  });

  /**
   * Le cas qui compte le plus : une boucle qui *lit* les éléments sans écrire
   * leur contenu. Les signaler verrouillerait, sur la fixture 01, tous les liens
   * d'ancrage de la page.
   */
  it("ignore une boucle qui n'écrit aucun contenu", () => {
    const resultat = analyser(`
      document.querySelectorAll('a[href^="#"]').forEach(function (lien) {
        lien.addEventListener('click', function (e) { e.preventDefault(); });
      });
    `);
    expect(resultat.dynamic).toEqual([]);
  });

  it("ignore un sélecteur construit dynamiquement, qu'on ne peut pas résoudre", () => {
    const resultat = analyser(`
      var lien = document.querySelector('[href="#' + section.id + '"]');
      lien.textContent = 'x';
    `);
    expect(resultat.dynamic).toEqual([]);
  });

  it("ne s'effondre pas sur un script illisible", () => {
    expect(() => analyser("function ( { ]]] invalide")).not.toThrow();
    expect(analyser("function ( { ]]] invalide").dynamic).toEqual([]);
  });
});

describe("détection des bibliothèques", () => {
  it("reconnaît GSAP et son découpeur de texte", () => {
    const resultat = analyser(`
      gsap.registerPlugin(ScrollTrigger, SplitText);
      var d = new SplitText('h1', { type: 'chars' });
    `);
    expect(resultat.animationLibrary).toBe("GSAP ScrollTrigger");
    expect(resultat.textSplitter).toBe("SplitText");
  });

  it("reconnaît un shadow root et la fabrication d'éléments", () => {
    const resultat = analyser(`
      class L extends HTMLElement {
        connectedCallback() { this.attachShadow({ mode: 'open' }); }
      }
      document.body.appendChild(document.createElement('div'));
    `);
    expect(resultat.shadowDom).toBe(true);
    expect(resultat.domMutated).toBe(true);
  });

  /**
   * Un site servi par le CDN Tailwind n'a ni `@font-face` ni `@import` : sa
   * typographie est écrite en JavaScript. Sans cette lecture, le panneau de
   * thème s'ouvrirait vide sur le cas le plus courant du vibe coding.
   */
  it("lit les polices d'une configuration Tailwind inline", () => {
    const resultat = analyser(`
      tailwind.config = {
        theme: { extend: { fontFamily: { titre: ['Georgia', 'serif'] } } }
      }
    `);
    expect(resultat.configuredFonts).toEqual(["Georgia"]);
  });

  it("ne voit rien là où il n'y a rien", () => {
    const resultat = analyser("var x = 1;");
    expect(resultat.animationLibrary).toBeNull();
    expect(resultat.textSplitter).toBeNull();
    expect(resultat.shadowDom).toBe(false);
  });
});
