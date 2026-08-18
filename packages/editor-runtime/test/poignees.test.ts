import { beforeEach, describe, expect, it, vi } from "vitest";
import { POIGNEES_ID, Poignees, type OperationItem } from "../src/poignees";

/**
 * Poignées de réordonnancement dans l'aperçu (§13).
 *
 * L'aperçu ne réordonne rien : il *demande*. Ces tests vérifient la seule chose
 * qui compte ici — que le clic produise la bonne demande, pour le bon item.
 */

const LIBELLES: Record<OperationItem, string> = {
  up: "Monter d'un rang",
  down: "Descendre d'un rang",
  duplicate: "Dupliquer cet élément",
  remove: "Supprimer cet élément",
};

beforeEach(() => {
  document.body.replaceChildren();
  document.head.replaceChildren();
  document.getElementById(POIGNEES_ID)?.remove();
});

function racine(): HTMLElement {
  const element = document.getElementById(POIGNEES_ID);
  if (element === null) throw new Error("Poignées absentes du document.");
  return element;
}

function bouton(op: OperationItem): HTMLButtonElement | null {
  return racine().querySelector<HTMLButtonElement>(`button[data-op="${op}"]`);
}

describe("Poignees", () => {
  it("reste cachée tant qu'aucun item n'est survolé", () => {
    new Poignees(document, LIBELLES, vi.fn());
    expect(racine().dataset["visible"]).toBe("false");
  });

  it("émet la demande pour l'item survolé, avec l'opération cliquée", () => {
    // La page d'abord, les poignées ensuite : c'est l'ordre réel — le runtime
    // s'installe dans un document déjà rendu.
    document.body.innerHTML = '<article id="carte">Cuisine</article>';
    const demander = vi.fn();
    const poignees = new Poignees(document, LIBELLES, demander);

    const carte = document.getElementById("carte") as HTMLElement;
    // happy-dom ne fait pas de mise en page : sans boîte, `montrer` renonce.
    carte.getBoundingClientRect = () =>
      ({ top: 120, right: 400, width: 300, height: 200 }) as DOMRect;

    poignees.montrer(carte, "col_1", "itm_002");
    expect(racine().dataset["visible"]).toBe("true");

    bouton("duplicate")?.click();
    expect(demander).toHaveBeenCalledWith("col_1", "itm_002", "duplicate");

    bouton("remove")?.click();
    expect(demander).toHaveBeenLastCalledWith("col_1", "itm_002", "remove");
  });

  it("suit l'item survolé : la demande porte toujours sur le dernier", () => {
    document.body.innerHTML = "<article id=a></article><article id=b></article>";
    const demander = vi.fn();
    const poignees = new Poignees(document, LIBELLES, demander);

    for (const id of ["a", "b"]) {
      const element = document.getElementById(id) as HTMLElement;
      element.getBoundingClientRect = () =>
        ({ top: 40, right: 300, width: 200, height: 120 }) as DOMRect;
    }

    poignees.montrer(document.getElementById("a") as HTMLElement, "col", "itm_a");
    poignees.montrer(document.getElementById("b") as HTMLElement, "col", "itm_b");
    bouton("up")?.click();
    expect(demander).toHaveBeenCalledWith("col", "itm_b", "up");
  });

  it("ignore un élément sans boîte : une poignée hors écran ne sert à rien", () => {
    document.body.innerHTML = '<article id="c"></article>';
    const poignees = new Poignees(document, LIBELLES, vi.fn());
    const carte = document.getElementById("c") as HTMLElement;
    carte.getBoundingClientRect = () =>
      ({ top: 0, right: 0, width: 0, height: 0 }) as DOMRect;

    poignees.montrer(carte, "col", "itm");
    expect(racine().dataset["visible"]).toBe("false");
  });

  it("nomme chaque bouton avec le libellé fourni par le panneau", () => {
    new Poignees(document, LIBELLES, vi.fn());
    expect(bouton("up")?.getAttribute("aria-label")).toBe("Monter d'un rang");
    expect(bouton("remove")?.getAttribute("aria-label")).toBe("Supprimer cet élément");
  });

  /**
   * Le runtime n'embarque aucune phrase : il est servi tel quel quelle que soit
   * la langue du panneau. Plutôt qu'un bouton sans nom accessible — un carré
   * muet pour un lecteur d'écran —, on n'affiche pas le bouton.
   */
  it("n'affiche pas un bouton dont le libellé manque", () => {
    new Poignees(document, { up: "Monter", down: "Descendre" }, vi.fn());
    expect(bouton("up")).not.toBeNull();
    expect(bouton("duplicate")).toBeNull();
    expect(bouton("remove")).toBeNull();
  });

  it("se retire du document", () => {
    const poignees = new Poignees(document, LIBELLES, vi.fn());
    poignees.destroy();
    expect(document.getElementById(POIGNEES_ID)).toBeNull();
  });
});
