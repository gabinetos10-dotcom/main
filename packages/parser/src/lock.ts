import type { LockReason } from "@calque/blueprint";
import {
  children,
  classList,
  getAttr,
  hasAttr,
  normalized,
  tagName,
  textContent,
  type Element,
} from "./tree";

/**
 * Verrouillage automatique (§9.2).
 *
 * Le verrouillage prime toujours sur la classification : un faux positif
 * destructeur — un élément structurel présenté comme éditable — est la seule
 * erreur du parser qui casse le site du client. Le critère du §9.3 est zéro.
 */

export interface LockDecision {
  reason: LockReason;
  detail?: string;
  /** Verrouiller le sous-arbre entier, sans même le parcourir. */
  subtree: boolean;
}

const BALISES_TECHNIQUES: Record<string, LockReason> = {
  script: "script",
  style: "style",
  noscript: "noscript",
  template: "head",
  link: "head",
  meta: "head",
  base: "head",
  title: "head",
};

const CONTROLES = new Set([
  "input",
  "select",
  "option",
  "optgroup",
  "textarea",
  "fieldset",
  "legend",
  "output",
  "progress",
  "meter",
  "datalist",
]);

const CLASSES_COMPTEUR = /^(?:counter|compteur|count|odometer|countup)/u;

export interface LockContext {
  /** Sélecteurs dont le texte est écrit par JavaScript (§8, `DYNAMIC_TEXT`). */
  dynamicMatchers: ReadonlyArray<(element: Element) => boolean>;
}

const MEDIAS = new Set(["img", "picture", "svg", "video", "iframe", "canvas", "source"]);

/** Un élément porte-t-il du contenu — texte ou média — lui-même ou en dessous ? */
export function carriesContent(element: Element): boolean {
  if (MEDIAS.has(tagName(element))) return true;
  if (normalized(textContent(element)).length > 0) return true;
  return children(element).some(carriesContent);
}

export function isCustomElement(element: Element): boolean {
  const balise = tagName(element);
  return balise.includes("-") && !balise.startsWith("data-");
}

export function isAnimatedCounter(element: Element): boolean {
  if (hasAttr(element, "data-count") || hasAttr(element, "data-counter")) return true;
  return classList(element).some((classe) => CLASSES_COMPTEUR.test(classe));
}

export function lockDecision(
  element: Element,
  contexte: LockContext,
): LockDecision | null {
  const balise = tagName(element);

  const technique = BALISES_TECHNIQUES[balise];
  if (technique !== undefined) return { reason: technique, subtree: true };

  if (CONTROLES.has(balise)) {
    return { reason: "structure-formulaire", subtree: true };
  }

  if (isCustomElement(element)) {
    return {
      reason: "shadow-dom",
      detail: `<${balise}> : son contenu réel vit dans un shadow root, hors d'atteinte d'un chemin DOM.`,
      subtree: true,
    };
  }

  if (getAttr(element, "aria-hidden") === "true") {
    return { reason: "decoratif", detail: 'aria-hidden="true"', subtree: true };
  }

  if (getAttr(element, "role") === "presentation") {
    return { reason: "decoratif", detail: 'role="presentation"', subtree: true };
  }

  if (isAnimatedCounter(element)) {
    return {
      reason: "compteur-anime",
      detail: "Valeur écrite par JavaScript au défilement.",
      subtree: true,
    };
  }

  for (const correspond of contexte.dynamicMatchers) {
    if (correspond(element)) {
      return {
        reason: "texte-dynamique",
        detail: "Contenu écrit par un script au chargement de la page.",
        subtree: true,
      };
    }
  }

  if (!carriesContent(element)) {
    return { reason: "wrapper-vide", subtree: true };
  }

  return null;
}

/**
 * Verrou de dernier recours, appliqué à un élément déjà reconnu comme texte :
 * un contenu d'un seul caractère est presque toujours une puce ou un séparateur.
 */
export function isTooShort(texte: string): boolean {
  return normalized(texte).length < 2;
}
