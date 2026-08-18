/**
 * Surlignage au survol (§11) : contour de 2 px et badge du libellé, hors flux,
 * `pointer-events: none`.
 *
 * L'overlay est posé **à côté** du site, jamais dedans : ajouter une classe ou
 * un style sur l'élément survolé modifierait la mise en page de la page éditée
 * — c'est exactement ce qu'on promet de ne pas faire.
 */

const RACINE_ID = "calque-surlignage";

const CSS = `
#${RACINE_ID} {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 2147483000;
}
#${RACINE_ID} .cadre {
  position: absolute;
  border: 2px solid #2f5ce0;
  border-radius: 3px;
  box-shadow: 0 0 0 3px rgba(47, 92, 224, 0.16);
  transition: opacity 120ms ease;
}
#${RACINE_ID} .cadre[data-doux="true"] {
  border-color: rgba(47, 92, 224, 0.45);
  box-shadow: none;
}
#${RACINE_ID} .etiquette {
  position: absolute;
  transform: translateY(-100%);
  background: #2f5ce0;
  color: #fff;
  font: 500 11px/1.6 ui-sans-serif, system-ui, sans-serif;
  padding: 1px 6px;
  border-radius: 3px 3px 0 0;
  white-space: nowrap;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
}
`;

export class Highlighter {
  private readonly racine: HTMLElement;
  private readonly document_: Document;

  constructor(document_: Document = document) {
    this.document_ = document_;

    const feuille = document_.createElement("style");
    feuille.textContent = CSS;
    document_.head.appendChild(feuille);

    const existante = document_.getElementById(RACINE_ID);
    existante?.remove();

    this.racine = document_.createElement("div");
    this.racine.id = RACINE_ID;
    document_.body.appendChild(this.racine);
  }

  clear(): void {
    this.racine.replaceChildren();
  }

  /** Encadre un élément. `doux` sert à l'illumination de toutes les zones. */
  frame(element: Element, libelle?: string, doux = false): void {
    const boite = element.getBoundingClientRect();
    if (boite.width === 0 && boite.height === 0) return;

    const cadre = this.document_.createElement("div");
    cadre.className = "cadre";
    cadre.dataset["doux"] = String(doux);
    cadre.style.left = `${boite.left}px`;
    cadre.style.top = `${boite.top}px`;
    cadre.style.width = `${boite.width}px`;
    cadre.style.height = `${boite.height}px`;
    this.racine.appendChild(cadre);

    if (libelle !== undefined && libelle.length > 0 && !doux) {
      const etiquette = this.document_.createElement("div");
      etiquette.className = "etiquette";
      etiquette.textContent = libelle;
      etiquette.style.left = `${boite.left}px`;
      etiquette.style.top = `${boite.top}px`;
      this.racine.appendChild(etiquette);
    }
  }

  destroy(): void {
    this.racine.remove();
  }
}

export { RACINE_ID };
