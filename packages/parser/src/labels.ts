import type { FieldType } from "@calque/blueprint";
import { classList, elementId, getAttr, normalized, tagName, type Element } from "./tree";

/**
 * Libellés lisibles (§9.2) — « critique pour l'UX ».
 *
 * Le client final ne doit jamais voir `h2:nth-of-type(3)` (§21). Ordre du §9.2 :
 * `aria-label` > `alt` > `id` > classe sémantique > texte tronqué à 40 > défaut
 * selon la balise.
 *
 * Une passe IA (§19) réécrira ces libellés en français naturel plus tard ; elle
 * s'applique comme un calque séparé (`labelPatch`), jamais en bloquant l'analyse.
 */

/**
 * Classes utilitaires à ne jamais transformer en libellé.
 *
 * Sans ce filtre, un site Tailwind produit « Mt 3 » ou « Text 4xl » comme nom de
 * champ, ce qui est pire que pas de nom du tout.
 */
const CLASSE_UTILITAIRE =
  /^(?:[mp][trblxyse]?-|-?[a-z]+-\[|text-|bg-|font-|leading-|tracking-|w-|h-|min-|max-|gap-|space-|grid|flex|col-|row-|rounded|border|shadow|opacity-|z-|top-|left-|right-|bottom-|inset-|order-|object-|overflow-|cursor-|transition|duration-|ease-|hover:|focus:|group|antialiased|absolute$|relative$|fixed$|sticky$|static$|hidden$|block$|inline|container$|backdrop|divide-|underline|italic$|uppercase$|lowercase$|capitalize$|truncate$|sr-only$)/u;

const CLASSE_ETAT = /^(?:actif|active|is-|js-|has-|reveal$|show$|open$)/u;

function estClasseSemantique(classe: string): boolean {
  if (classe.length < 3) return false;
  if (classe.includes(":")) return false;
  if (/\d/u.test(classe) && classe.length < 8) return false;
  if (CLASSE_UTILITAIRE.test(classe)) return false;
  if (CLASSE_ETAT.test(classe)) return false;
  return true;
}

/** `plat-prix` → « Plat prix » ; `bloc__entete` → « Bloc entete ». */
export function humanize(brut: string): string {
  const mots = brut
    .replace(/[_\-.]+/gu, " ")
    .replace(/([a-z])([A-Z])/gu, "$1 $2")
    .replace(/\s+/gu, " ")
    .trim()
    .toLowerCase();
  if (mots.length === 0) return "";
  return mots.charAt(0).toUpperCase() + mots.slice(1);
}

export function truncate(texte: string, longueur = 40): string {
  const propre = normalized(texte);
  return propre.length <= longueur
    ? propre
    : `${propre.slice(0, longueur - 1).trimEnd()}…`;
}

/** Libellé de repli par balise, en français, sans jargon (§21). */
const DEFAUT_PAR_BALISE: Record<string, string> = {
  h1: "Titre principal",
  h2: "Titre de section",
  h3: "Sous-titre",
  h4: "Sous-titre",
  h5: "Sous-titre",
  h6: "Sous-titre",
  p: "Paragraphe",
  span: "Texte",
  li: "Élément de liste",
  td: "Cellule",
  th: "En-tête de colonne",
  dt: "Intitulé",
  dd: "Valeur",
  summary: "Question",
  blockquote: "Citation",
  cite: "Signature",
  caption: "Titre du tableau",
  figcaption: "Légende",
  label: "Libellé de champ",
  button: "Texte du bouton",
  img: "Image",
  picture: "Image",
  a: "Lien",
  form: "Destination du formulaire",
  iframe: "Contenu intégré",
  svg: "Icône",
  section: "Section",
  header: "En-tête",
  footer: "Pied de page",
  nav: "Navigation",
};

const DEFAUT_PAR_TYPE: Partial<Record<FieldType, string>> = {
  image: "Image",
  cta: "Bouton",
  link: "Lien",
  contact: "Coordonnée",
  social: "Réseau social",
  "video-embed": "Vidéo",
  "map-embed": "Adresse affichée sur le plan",
  "form-endpoint": "Destination du formulaire",
  icon: "Icône",
  boolean: "Affichage de la section",
};

export function labelForField(element: Element, type: FieldType, texte: string): string {
  const aria = getAttr(element, "aria-label");
  if (aria !== undefined && normalized(aria).length > 0) return truncate(aria);

  const alt = getAttr(element, "alt");
  if (alt !== undefined && normalized(alt).length > 0) return truncate(alt);

  // Écart assumé au §9.2, qui place l'`id` et la classe avant le texte : une
  // classe est du jargon (« Btn primaire », « Py 5 »), et le §21 l'interdit dans
  // l'interface du client. Le texte visible est ce qu'il reconnaît.
  const contenu = normalized(texte);
  if (contenu.length > 0) return truncate(contenu);

  const identifiant = elementId(element);
  if (identifiant !== undefined && estClasseSemantique(identifiant)) {
    return humanize(identifiant);
  }

  const classe = classList(element).find(estClasseSemantique);
  if (classe !== undefined) return humanize(classe);

  return (
    DEFAUT_PAR_TYPE[type] ?? DEFAUT_PAR_BALISE[tagName(element)] ?? "Élément éditable"
  );
}

/**
 * Libellé d'un bloc : le titre qu'il contient, s'il en a un.
 *
 * Le §9.2 ne cadre que les champs. Pour un bloc, le premier titre est de loin le
 * meilleur repère — « Nos services » plutôt que « Services » tiré de l'`id`.
 */
export function labelForBlock(element: Element, titre: string | null): string {
  const aria = getAttr(element, "aria-label");
  if (aria !== undefined && normalized(aria).length > 0) return truncate(aria);

  if (titre !== null && normalized(titre).length > 0) return truncate(titre);

  const identifiant = elementId(element);
  if (identifiant !== undefined && estClasseSemantique(identifiant)) {
    return humanize(identifiant);
  }

  const classe = classList(element).find(estClasseSemantique);
  if (classe !== undefined) return humanize(classe);

  return DEFAUT_PAR_BALISE[tagName(element)] ?? "Section";
}
