/**
 * Poignées de réordonnancement dans l'aperçu (§13).
 *
 * Le §13 demande de pouvoir réordonner « dans le panneau **et** dans l'aperçu
 * (poignée au survol) ». L'aperçu ne réordonne rien lui-même : il n'a ni le
 * gabarit, ni les bornes, ni le contenu. Il *demande*, le panneau décide et
 * reconstruit — ce qui garde une seule source de vérité.
 */

export type OperationItem = "up" | "down" | "duplicate" | "remove";

const RACINE_ID = "calque-poignees";

const CSS = `
#${RACINE_ID} {
  position: fixed;
  display: none;
  gap: 2px;
  padding: 3px;
  background: #151a21;
  border-radius: 6px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, .28);
  z-index: 2147483001;
  font: 500 12px/1 ui-sans-serif, system-ui, sans-serif;
}
#${RACINE_ID}[data-visible="true"] { display: flex; }
#${RACINE_ID} button {
  all: unset;
  cursor: pointer;
  color: #faf8f4;
  padding: 5px 7px;
  border-radius: 4px;
  min-width: 14px;
  text-align: center;
}
#${RACINE_ID} button:hover { background: rgba(250, 248, 244, .16); }
#${RACINE_ID} button:focus-visible { outline: 2px solid #7ea0ff; outline-offset: 1px; }
`;

const BOUTONS: Array<{ op: OperationItem; signe: string }> = [
  { op: "up", signe: "↑" },
  { op: "down", signe: "↓" },
  { op: "duplicate", signe: "⧉" },
  { op: "remove", signe: "✕" },
];

export class Poignees {
  private readonly racine: HTMLElement;
  private collectionId = "";
  private itemId = "";

  /**
   * Les libellés viennent de la configuration, jamais du bundle.
   *
   * Le runtime n'embarque aucune phrase : il est servi tel quel à tous les
   * clients, quelle que soit la langue de leur panneau. Une opération sans
   * libellé n'obtient pas de bouton — un bouton sans nom accessible ne vaut
   * pas mieux qu'un bouton absent (§12).
   */
  constructor(
    document_: Document,
    libelles: Partial<Record<OperationItem, string>>,
    demander: (collectionId: string, itemId: string, op: OperationItem) => void,
  ) {
    const feuille = document_.createElement("style");
    feuille.textContent = CSS;
    document_.head.appendChild(feuille);

    document_.getElementById(RACINE_ID)?.remove();

    this.racine = document_.createElement("div");
    this.racine.id = RACINE_ID;
    this.racine.dataset["visible"] = "false";

    for (const bouton of BOUTONS) {
      const titre = libelles[bouton.op];
      if (titre === undefined) continue;

      const element = document_.createElement("button");
      element.type = "button";
      element.textContent = bouton.signe;
      element.title = titre;
      element.setAttribute("aria-label", titre);
      element.dataset["op"] = bouton.op;
      element.addEventListener("click", (evenement) => {
        evenement.preventDefault();
        evenement.stopPropagation();
        demander(this.collectionId, this.itemId, bouton.op);
      });
      this.racine.appendChild(element);
    }

    document_.body.appendChild(this.racine);
  }

  montrer(element: Element, collectionId: string, itemId: string): void {
    const boite = element.getBoundingClientRect();
    if (boite.width === 0 && boite.height === 0) return;

    this.collectionId = collectionId;
    this.itemId = itemId;
    this.racine.dataset["visible"] = "true";
    this.racine.style.left = `${Math.max(4, boite.right - 116)}px`;
    // Au-dessus de l'item quand il y a la place, à l'intérieur sinon : une
    // poignée hors écran ne sert à rien.
    this.racine.style.top = `${boite.top > 36 ? boite.top - 32 : boite.top + 4}px`;
  }

  cacher(): void {
    this.racine.dataset["visible"] = "false";
  }

  destroy(): void {
    this.racine.remove();
  }
}

export { RACINE_ID as POIGNEES_ID };
