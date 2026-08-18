import type { FieldType, SourceRange } from "@calque/blueprint";
import {
  attributeValueRange,
  children,
  classList,
  getAttr,
  innerRange,
  normalized,
  ownText,
  tagName,
  textContent,
  type Element,
} from "./tree";

/**
 * Règles de classification du §9.2, appliquées dans l'ordre du tableau.
 *
 * Une règle renvoie un candidat, ou `null` si elle ne s'applique pas. Le premier
 * candidat gagne. `descend` distingue les deux natures de champ :
 *
 *  • `descend: false` — l'élément *est* le champ, son contenu lui appartient
 *    (un titre, une image, un lien) ;
 *  • `descend: true` — l'élément porte un champ *et* reste un conteneur : une
 *    section avec `background-image`, un `<form>` dont on n'édite que la
 *    destination mais dont les libellés sont des champs à part entière.
 */

export interface FieldCandidate {
  type: FieldType;
  value: unknown;
  valueRanges: Record<string, SourceRange>;
  descend: boolean;
  constraints?: Record<string, unknown>;
}

export interface ClassifyContext {
  /** Page d'entrée du site : un lien qui y mène est structurel, pas du contenu. */
  entry: string;
  pagePath: string;
  source: string;
}

/** Balises de mise en forme : leur présence ne fait pas d'un texte un conteneur. */
const INLINE = new Set([
  "a",
  "abbr",
  "b",
  "br",
  "code",
  "em",
  "i",
  "mark",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "time",
  "u",
  "wbr",
]);

const CLASSES_CTA = /(?:^|[-_])(?:btn|button|bouton|cta)(?:$|[-_])|^(?:btn|bouton|cta)/u;

const RESEAUX: ReadonlyArray<[RegExp, string]> = [
  [/instagram\.com/u, "instagram"],
  [/facebook\.com/u, "facebook"],
  [/linkedin\.com/u, "linkedin"],
  [/tiktok\.com/u, "tiktok"],
  [/(?:^|\/\/)(?:www\.)?(?:x\.com|twitter\.com)/u, "x"],
  [/youtube\.com|youtu\.be/u, "youtube"],
  [/pinterest\./u, "pinterest"],
];

function range(
  valeurs: Array<[string, SourceRange | undefined]>,
): Record<string, SourceRange> {
  const resultat: Record<string, SourceRange> = {};
  for (const [nom, etendue] of valeurs) if (etendue) resultat[nom] = etendue;
  return resultat;
}

function entierPositif(valeur: string | undefined): number | undefined {
  if (valeur === undefined) return undefined;
  const nombre = Number.parseInt(valeur, 10);
  return Number.isFinite(nombre) && nombre > 0 ? nombre : undefined;
}

/* ── Image de fond en style inline (§9.2) ──────────────────────────────────── */

export interface BackgroundImage {
  url: string;
  /** Étendue de l'URL seule, à l'intérieur de l'attribut `style`. */
  range?: SourceRange;
}

/**
 * Lit `background-image: url(...)` dans un attribut `style`.
 *
 * Balayage caractère par caractère plutôt qu'expression régulière : il faut
 * l'offset exact de l'URL pour que le builder la remplace sans resérialiser
 * l'attribut, et une URL peut contenir des parenthèses échappées.
 */
export function backgroundImage(
  element: Element,
  source: string,
): BackgroundImage | null {
  const style = getAttr(element, "style");
  if (style === undefined) return null;

  const propriete = style.toLowerCase().indexOf("background-image");
  const raccourci = style.toLowerCase().indexOf("background:");
  const depart = propriete !== -1 ? propriete : raccourci;
  if (depart === -1) return null;

  const ouvrante = style.indexOf("url(", depart);
  if (ouvrante === -1) return null;

  const fermante = style.indexOf(")", ouvrante);
  if (fermante === -1) return null;

  let debut = ouvrante + 4;
  let fin = fermante;
  while (debut < fin && /\s/u.test(style[debut] as string)) debut += 1;
  while (fin > debut && /\s/u.test(style[fin - 1] as string)) fin -= 1;

  const guillemet = style[debut];
  if (guillemet === '"' || guillemet === "'") {
    debut += 1;
    if (style[fin - 1] === guillemet) fin -= 1;
  }

  const url = style.slice(debut, fin);
  if (url.length === 0) return null;

  const attribut = attributeValueRange(element, "style", source);
  return {
    url,
    ...(attribut
      ? {
          range: {
            startOffset: attribut.startOffset + debut,
            endOffset: attribut.startOffset + fin,
          },
        }
      : {}),
  };
}

/* ── Prédicats partagés ────────────────────────────────────────────────────── */

export function socialNetwork(href: string): string | null {
  for (const [motif, reseau] of RESEAUX) if (motif.test(href)) return reseau;
  return null;
}

export function isContactHref(href: string): boolean {
  return href.startsWith("tel:") || href.startsWith("mailto:");
}

export function looksLikeCta(element: Element): boolean {
  return classList(element).some((classe) => CLASSES_CTA.test(classe));
}

/** Un lien vers la page d'accueil n'est pas du contenu : c'est de la structure. */
function pointsToEntry(href: string, entry: string): boolean {
  const propre = href.trim();
  return (
    propre === "/" ||
    propre === "./" ||
    propre === "#" ||
    propre === entry ||
    propre === `./${entry}` ||
    propre === `/${entry}`
  );
}

/** Enfants qui empêchent de traiter l'élément comme un texte d'un seul tenant. */
export function hasStructuralChildren(element: Element): boolean {
  // Un parent qui n'apporte aucun texte propre n'est pas un texte enrichi : c'est
  // un conteneur autour de ses liens. `<li><a>La carte</a></li>` doit donner un
  // champ lien, pas un champ « texte enrichi » qui avalerait la destination.
  const sansTextePropre = normalized(ownText(element)).length === 0;

  return children(element).some((enfant) => {
    const balise = tagName(enfant);
    if (!INLINE.has(balise)) return true;
    if (balise === "a") {
      const href = getAttr(enfant, "href") ?? "";
      // Un lien de contact ou de réseau social est toujours un champ à lui seul.
      if (isContactHref(href) || socialNetwork(href) !== null) return true;
      if (sansTextePropre) return true;
    }
    return false;
  });
}

function hasInlineMarkup(element: Element): boolean {
  return children(element).length > 0;
}

/* ── Classification ────────────────────────────────────────────────────────── */

export function classify(
  element: Element,
  contexte: ClassifyContext,
): FieldCandidate | null {
  const balise = tagName(element);
  const { source } = contexte;

  if (balise === "img") {
    const src = getAttr(element, "src");
    if (src === undefined) return null;
    return {
      type: "image",
      value: {
        src,
        alt: getAttr(element, "alt") ?? "",
        width: entierPositif(getAttr(element, "width")),
        height: entierPositif(getAttr(element, "height")),
      },
      valueRanges: range([
        ["src", attributeValueRange(element, "src", source)],
        ["alt", attributeValueRange(element, "alt", source)],
      ]),
      descend: false,
    };
  }

  if (balise === "picture") {
    const image = children(element).find((enfant) => tagName(enfant) === "img");
    if (image === undefined) return null;
    const candidat = classify(image, contexte);
    // La valeur et les étendues restent celles du `<img>` : les `<source>` sont
    // des variantes que le builder régénère, jamais une valeur éditable.
    return candidat === null ? null : { ...candidat, descend: false };
  }

  if (balise === "iframe") {
    const src = getAttr(element, "src") ?? "";
    if (/google\.[a-z.]+\/maps|maps\.google\./u.test(src)) {
      return {
        type: "map-embed",
        value: { address: "", src },
        valueRanges: range([["src", attributeValueRange(element, "src", source)]]),
        descend: false,
      };
    }
    if (/youtube\.com|youtu\.be|vimeo\.com/u.test(src)) {
      return {
        type: "video-embed",
        value: {
          provider: /vimeo/u.test(src) ? "vimeo" : "youtube",
          src,
          title: getAttr(element, "title"),
        },
        valueRanges: range([["src", attributeValueRange(element, "src", source)]]),
        descend: false,
      };
    }
    return null;
  }

  if (balise === "video") {
    const src =
      getAttr(element, "src") ??
      children(element)
        .find((enfant) => tagName(enfant) === "source")
        ?.attrs.find((attribut) => attribut.name === "src")?.value;
    if (src === undefined) return null;
    return {
      type: "video-embed",
      value: { provider: "file", src },
      valueRanges: {},
      descend: false,
    };
  }

  if (balise === "svg") {
    return {
      type: "icon",
      value: { set: "inline-svg", name: getAttr(element, "aria-label") ?? "svg" },
      valueRanges: {},
      descend: false,
    };
  }

  if (balise === "i" || balise === "span") {
    const icone = classList(element).find((classe) =>
      /^(?:fa-|fas$|far$|fab$|lucide-|icon-|bi-)/u.test(classe),
    );
    if (icone !== undefined && normalized(textContent(element)).length === 0) {
      return {
        type: "icon",
        value: {
          set: icone.startsWith("lucide-") ? "lucide" : "fontawesome",
          name: icone,
        },
        valueRanges: {},
        descend: false,
      };
    }
  }

  if (balise === "form") {
    const action = getAttr(element, "action");
    if (action === undefined) return null;
    const methode = (getAttr(element, "method") ?? "POST").toUpperCase();
    return {
      type: "form-endpoint",
      value: { action, method: methode === "GET" ? "GET" : "POST" },
      valueRanges: range([["action", attributeValueRange(element, "action", source)]]),
      descend: true,
    };
  }

  if (balise === "a") {
    const href = getAttr(element, "href");
    if (href === undefined || hasStructuralChildren(element)) return null;

    const libelle = normalized(textContent(element));
    const etendues = range([
      ["label", innerRange(element)],
      ["href", attributeValueRange(element, "href", source)],
    ]);

    if (isContactHref(href)) {
      return {
        type: "contact",
        value: libelle,
        valueRanges: range([
          ["text", innerRange(element)],
          ["href", attributeValueRange(element, "href", source)],
        ]),
        descend: false,
      };
    }

    const reseau = socialNetwork(href);
    if (reseau !== null) {
      return {
        type: "social",
        value: { network: reseau, href },
        valueRanges: range([["href", attributeValueRange(element, "href", source)]]),
        descend: false,
      };
    }

    // Le lien de marque — logo ou nom du site renvoyant à l'accueil — n'a pas de
    // destination éditable : ce que le client veut changer, c'est le texte.
    if (pointsToEntry(href, contexte.entry) && libelle.length >= 2) {
      return {
        type: "text",
        value: libelle,
        valueRanges: range([["text", innerRange(element)]]),
        descend: false,
      };
    }

    const cible = getAttr(element, "target") === "_blank" ? "_blank" : "_self";
    return {
      type: looksLikeCta(element) ? "cta" : "link",
      value: { label: libelle, href, target: cible, rel: getAttr(element, "rel") },
      valueRanges: etendues,
      descend: false,
    };
  }

  if (balise === "button") {
    if (hasStructuralChildren(element)) return null;
    const libelle = normalized(textContent(element));
    if (libelle.length < 2) return null;
    // Un bouton de formulaire n'a pas de destination : le seul contenu éditable
    // est son texte. Le classer `cta` obligerait à inventer un `href` vide.
    return {
      type: "text",
      value: libelle,
      valueRanges: range([["text", innerRange(element)]]),
      descend: false,
    };
  }

  const fond = backgroundImage(element, source);
  if (fond !== null) {
    return {
      type: "image",
      value: { src: fond.url, alt: "" },
      valueRanges: range([["backgroundUrl", fond.range]]),
      descend: true,
      constraints: { isBackground: true },
    };
  }

  const texte = normalized(textContent(element));
  if (texte.length >= 2 && !hasStructuralChildren(element)) {
    const riche = hasInlineMarkup(element);
    return riche
      ? {
          type: "richtext",
          value: sliceInner(element, source),
          valueRanges: range([["html", innerRange(element)]]),
          descend: false,
        }
      : {
          type: "text",
          value: texte,
          valueRanges: range([["text", innerRange(element)]]),
          descend: false,
        };
  }

  return null;
}

/** Contenu HTML intérieur, pris au source plutôt que resérialisé. */
export function sliceInner(element: Element, source: string): string {
  const etendue = innerRange(element);
  if (etendue === undefined) return "";
  return source.slice(etendue.startOffset, etendue.endOffset).trim();
}
