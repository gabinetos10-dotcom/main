/**
 * Mode d'édition statique (§11) — « ne surtout pas négliger ».
 *
 * Sur la majorité des sites vibe-codés, les éléments sont à `opacity: 0` et
 * attendent un défilement pour apparaître. Dans une iframe d'édition, personne
 * ne défile : la page est vide, et l'édition impossible.
 *
 * Deux gestes, dans cet ordre, **avant** que les scripts du site s'exécutent :
 *
 *  1. poser une feuille de style qui force l'état final ;
 *  2. remplacer les API d'animation par des bouchons inertes, pour qu'elles ne
 *     remettent pas les éléments dans leur état initial.
 */

const FEUILLE_ID = "calque-edition-statique";

/**
 * Sélecteurs d'apparition au défilement, par convention de bibliothèque.
 *
 * On force l'état final au lieu de supprimer les règles : le CSS du site n'est
 * jamais modifié (§5), on empile seulement une feuille plus spécifique.
 */
const CSS_STATIQUE = `
[data-aos], .reveal, .fade-in, .fade-up, .animate, .animated,
[data-scroll], [data-splitting], .gs_reveal, .sr-only-anim {
  opacity: 1 !important;
  transform: none !important;
  visibility: visible !important;
  clip-path: none !important;
  filter: none !important;
  transition: none !important;
  animation: none !important;
}
html { scroll-behavior: auto !important; }
[style*="background-attachment: fixed"], [style*="background-attachment:fixed"] {
  background-attachment: scroll !important;
}
`;

export interface Neutralisation {
  /** Bibliothèques effectivement neutralisées, pour l'expliquer au client. */
  libraries: string[];
}

function bouchonGsap(): unknown {
  const rien = (): unknown => bouchon;
  const bouchon: Record<string, unknown> = {};
  for (const nom of [
    "to",
    "from",
    "fromTo",
    "set",
    "timeline",
    "registerPlugin",
    "killTweensOf",
    "getProperty",
    "delayedCall",
  ]) {
    bouchon[nom] = rien;
  }
  bouchon["utils"] = {
    toArray: (cible: unknown): unknown[] =>
      typeof cible === "string"
        ? Array.from(document.querySelectorAll(cible))
        : Array.isArray(cible)
          ? cible
          : [cible],
    selector: () => (): unknown[] => [],
  };
  bouchon["core"] = { globals: rien };
  return bouchon;
}

function bouchonScrollTrigger(): unknown {
  const rien = (): unknown => ({ kill: () => undefined });
  return {
    create: rien,
    refresh: rien,
    update: rien,
    getAll: (): unknown[] => [],
    killAll: rien,
    register: rien,
    batch: rien,
    matchMedia: rien,
    defaults: rien,
  };
}

/**
 * Bouchon de découpeur de texte.
 *
 * `SplitText` démonte un titre en dizaines de `<span>`, ce qui fait disparaître
 * le champ du DOM au moment précis où l'utilisateur veut cliquer dessus. Le
 * bouchon rend l'élément intact et une liste vide de caractères : les animations
 * qui l'utilisent ne font rien, et le titre reste un titre.
 */
function bouchonSplitText(): unknown {
  return class {
    lines: Element[] = [];
    words: Element[] = [];
    chars: Element[] = [];
    constructor(cible: unknown) {
      const elements =
        typeof cible === "string"
          ? Array.from(document.querySelectorAll(cible))
          : cible instanceof Element
            ? [cible]
            : [];
      this.lines = elements;
      this.words = elements;
      this.chars = elements;
    }
    revert(): void {
      /* rien à défaire : rien n'a été découpé */
    }
    split(): this {
      return this;
    }
  };
}

type Fenetre = Window & Record<string, unknown>;

/**
 * Installe les bouchons **avant** les scripts du site.
 *
 * Les propriétés sont définies non configurables : un script qui écrirait
 * `window.gsap = …` échouerait silencieusement plutôt que de reprendre la main.
 */
export function installStaticMode(fenetre: Window = window): Neutralisation {
  const cible = fenetre as Fenetre;
  const neutralisees: string[] = [];

  const poser = (nom: string, valeur: unknown, libelle: string): void => {
    try {
      Object.defineProperty(cible, nom, {
        value: valeur,
        writable: false,
        configurable: false,
        enumerable: true,
      });
      neutralisees.push(libelle);
    } catch {
      /* déjà défini et verrouillé : on n'insiste pas */
    }
  };

  poser("gsap", bouchonGsap(), "GSAP");
  poser("ScrollTrigger", bouchonScrollTrigger(), "ScrollTrigger");
  poser("SplitText", bouchonSplitText(), "SplitText");
  poser("SplitType", bouchonSplitText(), "SplitType");
  poser("AOS", { init: () => undefined, refresh: () => undefined }, "AOS");
  poser(
    "LocomotiveScroll",
    class {
      init(): void {}
      destroy(): void {}
      update(): void {}
    },
    "Locomotive Scroll",
  );
  poser(
    "Lenis",
    class {
      raf(): void {}
      destroy(): void {}
      scrollTo(): void {}
    },
    "Lenis",
  );
  poser("Splitting", () => [], "Splitting.js");

  return { libraries: neutralisees };
}

/** Pose la feuille de style d'édition. Idempotent. */
export function installStaticStylesheet(document_: Document = document): void {
  if (document_.getElementById(FEUILLE_ID) !== null) return;
  const feuille = document_.createElement("style");
  feuille.id = FEUILLE_ID;
  feuille.textContent = CSS_STATIQUE;
  document_.head.appendChild(feuille);
}

export function removeStaticStylesheet(document_: Document = document): void {
  document_.getElementById(FEUILLE_ID)?.remove();
}

export { CSS_STATIQUE, FEUILLE_ID };
