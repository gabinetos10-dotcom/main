import {
  message,
  readToPreview,
  type EditorMode,
  type FromPreview,
} from "@calque/protocol";
import { appliquerValeur, assainirEnPlace, estEditableEnLigne } from "./apply";
import { Highlighter } from "./highlight";
import { neutraliserInteractions, type Neutraliseur } from "./neutralize";
import { Poignees } from "./poignees";
import { resolveField, type FieldDescriptor } from "./resolve";
import {
  installStaticMode,
  installStaticStylesheet,
  removeStaticStylesheet,
} from "./static-mode";

/**
 * Runtime d'édition (§11), injecté **uniquement en mode aperçu**.
 *
 * Il ne connaît ni la base, ni l'authentification, ni le contenu publié : il
 * reçoit une liste de champs, les retrouve dans le DOM, et parle au panneau par
 * `postMessage`. C'est ce qui permet de le servir depuis un autre domaine, dans
 * une iframe en bac à sable, sans lui confier le moindre jeton.
 */

interface ItemDescriptor {
  itemId: string;
  domPath: string;
}

interface CollectionDescriptor {
  collectionId: string;
  items: ItemDescriptor[];
  /** Faux quand la liste est verrouillée : aucune poignée n'est proposée. */
  editable: boolean;
}

interface Configuration {
  fields: FieldDescriptor[];
  collections: CollectionDescriptor[];
  /** Origine du panneau. Tout message venant d'ailleurs est ignoré. */
  parentOrigin: string;
  labels: Record<string, string>;
  /** Libellés des poignées de liste, fournis par le panneau (§12 : pas de jargon). */
  actions: Partial<Record<"up" | "down" | "duplicate" | "remove", string>>;
}

function lireConfiguration(): Configuration | null {
  const balise = document.getElementById("calque-config");
  if (balise === null) return null;
  try {
    const brut: unknown = JSON.parse(balise.textContent ?? "{}");
    const objet = brut as Partial<Configuration>;
    if (!Array.isArray(objet.fields) || typeof objet.parentOrigin !== "string") {
      return null;
    }
    return {
      fields: objet.fields,
      collections: Array.isArray(objet.collections) ? objet.collections : [],
      parentOrigin: objet.parentOrigin,
      labels: objet.labels ?? {},
      actions: objet.actions ?? {},
    };
  } catch {
    return null;
  }
}

/**
 * Les bouchons sont posés **au chargement du script**, pas à `DOMContentLoaded`.
 *
 * Le runtime est injecté en tête du `<head>`, avant les balises `<script>` du
 * site : c'est le seul instant où `window.gsap` peut être défini avant que le
 * CDN ne le définisse lui-même. Attendre le DOM, c'est arriver après la
 * bibliothèque, et l'aperçu reste une page vide.
 */
const NEUTRALISATION = installStaticMode();
installStaticStylesheet();

export function demarrer(configuration: Configuration): void {
  const neutralisation = NEUTRALISATION;

  const resolus = new Map<string, HTMLElement>();
  const parElement = new WeakMap<HTMLElement, FieldDescriptor>();
  const irresolus: string[] = [];

  for (const champ of configuration.fields) {
    const resolution = resolveField(document, champ);
    if (resolution === null) {
      irresolus.push(champ.fieldId);
      continue;
    }
    resolus.set(champ.fieldId, resolution.element);
    parElement.set(resolution.element, champ);
  }

  /* ── Items de liste : poignées de réordonnancement (§13) ─────────────────── */

  const items = new Map<HTMLElement, { collectionId: string; itemId: string }>();
  for (const collection of configuration.collections) {
    if (!collection.editable) continue;
    for (const item of collection.items) {
      // Par l'attribut d'abord : après un réordonnancement, le chemin DOM
      // désigne l'élément qui occupe *maintenant* cette position, pas cet item.
      const element =
        document.querySelector<HTMLElement>(
          `[data-calque-item="${CSS.escape(item.itemId)}"]`,
        ) ?? document.querySelector<HTMLElement>(item.domPath);
      if (element !== null) {
        items.set(element, {
          collectionId: collection.collectionId,
          itemId: item.itemId,
        });
      }
    }
  }

  const surligneur = new Highlighter();
  const poignees = new Poignees(
    document,
    configuration.actions,
    (collectionId, itemId, op) => {
      envoyer(message("COLLECTION_REQUEST", { collectionId, itemId, op }));
    },
  );
  let mode: EditorMode = "edition";
  let neutraliseur: Neutraliseur | null = neutraliserInteractions();
  let survole: string | null = null;
  let selectionne: string | null = null;
  let toutesLesZones = false;

  const envoyer = (msg: FromPreview): void => {
    window.parent.postMessage(msg, configuration.parentOrigin);
  };

  const itemDe = (
    cible: EventTarget | null,
  ): { element: HTMLElement; collectionId: string; itemId: string } | null => {
    if (!(cible instanceof Element)) return null;
    let courant: Element | null = cible;
    while (courant !== null) {
      if (courant instanceof HTMLElement) {
        const item = items.get(courant);
        if (item !== undefined) return { element: courant, ...item };
      }
      courant = courant.parentElement;
    }
    return null;
  };

  const champDe = (cible: EventTarget | null): FieldDescriptor | null => {
    if (!(cible instanceof Element)) return null;
    let courant: Element | null = cible;
    while (courant !== null) {
      if (courant instanceof HTMLElement) {
        const champ = parElement.get(courant);
        if (champ !== undefined) return champ;
      }
      courant = courant.parentElement;
    }
    return null;
  };

  const redessiner = (): void => {
    surligneur.clear();
    if (mode !== "edition") {
      poignees.cacher();
      return;
    }

    if (toutesLesZones) {
      for (const element of resolus.values()) surligneur.frame(element, undefined, true);
    }

    const actif = survole ?? selectionne;
    if (actif !== null) {
      const element = resolus.get(actif);
      if (element !== undefined) {
        surligneur.frame(element, configuration.labels[actif]);
      }
    }
  };

  /* ── Survol et sélection ─────────────────────────────────────────────────── */

  document.addEventListener("mousemove", (evenement) => {
    if (mode !== "edition") return;

    const item = itemDe(evenement.target);
    if (item === null) poignees.cacher();
    else poignees.montrer(item.element, item.collectionId, item.itemId);

    const champ = champDe(evenement.target);
    const suivant = champ?.fieldId ?? null;
    if (suivant === survole) return;
    survole = suivant;
    envoyer(message("HOVER", { fieldId: suivant }));
    redessiner();
  });

  document.addEventListener(
    "click",
    (evenement) => {
      if (mode !== "edition") return;
      const champ = champDe(evenement.target);
      if (champ === null) return;

      selectionne = champ.fieldId;
      envoyer(message("FIELD_CLICK", { fieldId: champ.fieldId }));
      redessiner();

      if (estEditableEnLigne(champ.type)) {
        const element = resolus.get(champ.fieldId);
        if (element !== undefined) activerEditionEnLigne(element, champ);
      }
    },
    true,
  );

  /* ── Édition en place ────────────────────────────────────────────────────── */

  function activerEditionEnLigne(element: HTMLElement, champ: FieldDescriptor): void {
    if (element.isContentEditable) return;

    element.contentEditable = "true";
    element.spellcheck = true;
    element.focus();

    const surSaisie = (): void => {
      if (champ.type === "richtext") assainirEnPlace(element);
      envoyer(
        message("FIELD_INPUT", {
          fieldId: champ.fieldId,
          value:
            champ.type === "richtext" ? element.innerHTML : (element.textContent ?? ""),
        }),
      );
      redessiner();
    };

    // Un collage apporte du HTML de Word ou d'une page web : on ne garde que le
    // texte. Le §11 est explicite — « aucun HTML collé ».
    const surCollage = (evenement: ClipboardEvent): void => {
      evenement.preventDefault();
      const texte = evenement.clipboardData?.getData("text/plain") ?? "";
      document.execCommand("insertText", false, texte);
    };

    const surSortie = (): void => {
      element.contentEditable = "false";
      element.removeEventListener("input", surSaisie);
      element.removeEventListener("paste", surCollage);
      element.removeEventListener("blur", surSortie);
    };

    element.addEventListener("input", surSaisie);
    element.addEventListener("paste", surCollage);
    element.addEventListener("blur", surSortie);
  }

  /* ── Messages du panneau ─────────────────────────────────────────────────── */

  window.addEventListener("message", (evenement) => {
    // Origine vérifiée strictement : une iframe reçoit des messages de partout.
    if (evenement.origin !== configuration.parentOrigin) return;

    const msg = readToPreview(evenement.data);
    if (msg === null) return;

    switch (msg.type) {
      case "SET_VALUE": {
        const element = resolus.get(msg.payload.fieldId);
        if (element === undefined) {
          envoyer(
            message("ERROR", {
              message: "Ce champ n'existe plus dans la page.",
              fieldId: msg.payload.fieldId,
            }),
          );
          return;
        }
        if (element.isContentEditable) return; // l'utilisateur est en train d'y taper
        appliquerValeur(element, msg.payload.type, msg.payload.value);
        redessiner();
        return;
      }

      case "HIGHLIGHT": {
        selectionne = msg.payload.fieldId;
        toutesLesZones = msg.payload.showAll;
        redessiner();
        return;
      }

      case "SCROLL_TO": {
        resolus.get(msg.payload.fieldId)?.scrollIntoView({ block: "center" });
        redessiner();
        return;
      }

      case "SET_MODE": {
        mode = msg.payload.mode;
        if (mode === "apercu") {
          neutraliseur?.dispose();
          neutraliseur = null;
          removeStaticStylesheet();
        } else {
          neutraliseur ??= neutraliserInteractions();
          installStaticStylesheet();
        }
        redessiner();
        return;
      }

      case "SET_TOKEN": {
        document.documentElement.style.setProperty(msg.payload.cssVar, msg.payload.value);
        return;
      }

      case "SET_VIEWPORT":
      case "COLLECTION_OP":
        // Le cadrage est appliqué par le panneau, qui redimensionne l'iframe ;
        // une opération de collection passe par un rebuild de l'aperçu.
        return;
    }
  });

  window.addEventListener("scroll", () => {
    poignees.cacher();
    redessiner();
    envoyer(message("SCROLL_POS", { y: window.scrollY }));
  });
  window.addEventListener("resize", redessiner);

  envoyer(
    message("READY", {
      resolvedFieldIds: [...resolus.keys()],
      unresolvedFieldIds: irresolus,
      neutralized: neutralisation.libraries,
    }),
  );
}

function amorcer(): void {
  const configuration = lireConfiguration();
  if (configuration === null) return;
  demarrer(configuration);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", amorcer);
} else {
  amorcer();
}

export { appliquerValeur, assainirEnPlace, estEditableEnLigne } from "./apply";
export { Highlighter } from "./highlight";
export { Poignees } from "./poignees";
export { neutraliserInteractions } from "./neutralize";
export { resolveField, fingerprintOf, hashRapide, shapeDescriptor } from "./resolve";
export {
  installStaticMode,
  installStaticStylesheet,
  removeStaticStylesheet,
} from "./static-mode";
export type { FieldDescriptor } from "./resolve";
