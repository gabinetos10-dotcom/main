/**
 * Application d'une valeur dans le DOM vivant (§11).
 *
 * Rien n'est publié depuis ici : ce module ne sert qu'à ce que le client voie
 * sa modification **immédiatement**, sans rechargement. La vérité reste le
 * calque de contenu, et c'est le builder qui écrira le site final.
 */

const INLINE_AUTORISES = new Set([
  "B",
  "STRONG",
  "I",
  "EM",
  "U",
  "A",
  "BR",
  "SPAN",
  "SMALL",
  "SUP",
  "SUB",
]);

/**
 * Assainit un fragment collé, en place.
 *
 * Le §11 impose « aucun HTML collé » : un client qui copie depuis Word ou une
 * page web amène des styles, des polices et parfois des scripts. On garde le
 * texte et la mise en forme reconnue, on déballe le reste.
 */
export function assainirEnPlace(racine: Element): void {
  for (const element of Array.from(racine.querySelectorAll("*"))) {
    if (!INLINE_AUTORISES.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      continue;
    }
    for (const attribut of Array.from(element.attributes)) {
      const nom = attribut.name.toLowerCase();
      const garde =
        (element.tagName === "A" &&
          nom === "href" &&
          !/^\s*javascript:/iu.test(attribut.value)) ||
        nom === "data-calque-field";
      if (!garde) element.removeAttribute(attribut.name);
    }
  }
}

function objet(valeur: unknown): Record<string, unknown> {
  return typeof valeur === "object" && valeur !== null
    ? (valeur as Record<string, unknown>)
    : {};
}

/** Écrit une valeur sur un élément selon son type. Renvoie faux si inapplicable. */
export function appliquerValeur(
  element: HTMLElement,
  type: string,
  valeur: unknown,
): boolean {
  switch (type) {
    case "text":
    case "contact":
      element.textContent = String(valeur ?? "");
      return true;

    case "richtext": {
      element.innerHTML = String(valeur ?? "");
      assainirEnPlace(element);
      return true;
    }

    case "image": {
      const image = objet(valeur);
      const src = String(image["src"] ?? "");
      if (element instanceof HTMLImageElement) {
        element.src = src;
        element.alt = String(image["alt"] ?? "");
        // Un `srcset` figé continuerait de servir l'ancienne image.
        element.removeAttribute("srcset");
        return true;
      }
      if (element.tagName === "PICTURE") {
        const interne = element.querySelector("img");
        for (const source of Array.from(element.querySelectorAll("source"))) {
          source.remove();
        }
        if (interne !== null) {
          interne.src = src;
          interne.alt = String(image["alt"] ?? "");
          return true;
        }
        return false;
      }
      element.style.backgroundImage = `url("${src.replace(/"/gu, "%22")}")`;
      return true;
    }

    case "link":
    case "cta": {
      const lien = objet(valeur);
      element.textContent = String(lien["label"] ?? "");
      const href = String(lien["href"] ?? "#");
      element.setAttribute("href", /^\s*javascript:/iu.test(href) ? "#" : href);
      return true;
    }

    case "social": {
      const reseau = objet(valeur);
      element.setAttribute("href", String(reseau["href"] ?? "#"));
      return true;
    }

    case "map-embed": {
      const carte = objet(valeur);
      const adresse = String(carte["address"] ?? "");
      if (adresse.length > 0 && element instanceof HTMLIFrameElement) {
        element.src = `https://www.google.com/maps?q=${encodeURIComponent(adresse)}&output=embed`;
        return true;
      }
      return false;
    }

    case "video-embed": {
      const video = objet(valeur);
      if (element instanceof HTMLIFrameElement) {
        element.src = String(video["src"] ?? "");
        return true;
      }
      return false;
    }

    case "form-endpoint": {
      const formulaire = objet(valeur);
      element.setAttribute("action", String(formulaire["action"] ?? ""));
      return true;
    }

    default:
      return false;
  }
}

/** Le type se prête-t-il à l'édition en place dans l'aperçu ? */
export function estEditableEnLigne(type: string): boolean {
  return type === "text" || type === "richtext" || type === "contact";
}
