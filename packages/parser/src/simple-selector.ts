import { classList, elementId, getAttr, hasAttr, tagName, type Element } from "./tree";

/**
 * Filtre de sélecteur *simple* — une seule séquence composée, sans combinateur.
 *
 * Il ne s'agit pas de réimplémenter un moteur CSS : ces sélecteurs viennent des
 * scripts du site (`document.querySelector('.counter')`) et servent à décider
 * d'un verrou. Un sélecteur qu'on ne sait pas interpréter est *ignoré* plutôt
 * qu'approximé : verrouiller trop large ferait disparaître des champs légitimes.
 */

type Predicat = (element: Element) => boolean;

const COMPOSE = /^(?<tag>[a-z][a-z0-9-]*)?(?<reste>(?:[#.][A-Za-z0-9_-]+|\[[^\]]+\])*)$/u;

const ATTRIBUT =
  /^\[\s*(?<nom>[A-Za-z_:][-A-Za-z0-9_:.]*)\s*(?:(?<operateur>[|^$*~]?=)\s*(?<valeur>"[^"]*"|'[^']*'|[^\]\s]+)\s*)?\]$/u;

function comparer(operateur: string, reel: string, attendu: string): boolean {
  switch (operateur) {
    case "=":
      return reel === attendu;
    case "^=":
      return reel.startsWith(attendu);
    case "$=":
      return reel.endsWith(attendu);
    case "*=":
      return reel.includes(attendu);
    case "~=":
      return reel.split(/\s+/u).includes(attendu);
    case "|=":
      return reel === attendu || reel.startsWith(`${attendu}-`);
    default:
      return false;
  }
}

/**
 * Compile un sélecteur simple en prédicat, ou renvoie `null` s'il sort du
 * périmètre (combinateur, pseudo-classe, liste).
 */
export function compileSimpleSelector(selecteur: string): Predicat | null {
  const propre = selecteur.trim();
  if (propre.length === 0) return null;
  if (/[\s>+~,:()]/u.test(propre)) return null;

  const correspondance = COMPOSE.exec(propre);
  if (correspondance?.groups === undefined) return null;

  const balise = correspondance.groups["tag"];
  const reste = correspondance.groups["reste"] ?? "";
  const predicats: Predicat[] = [];

  if (balise !== undefined) {
    predicats.push((element) => tagName(element) === balise);
  }

  const morceaux = reste.match(/[#.][A-Za-z0-9_-]+|\[[^\]]+\]/gu) ?? [];
  for (const morceau of morceaux) {
    if (morceau.startsWith("#")) {
      const identifiant = morceau.slice(1);
      predicats.push((element) => elementId(element) === identifiant);
    } else if (morceau.startsWith(".")) {
      const classe = morceau.slice(1);
      predicats.push((element) => classList(element).includes(classe));
    } else {
      const attribut = ATTRIBUT.exec(morceau);
      if (attribut?.groups === undefined) return null;
      const nom = attribut.groups["nom"] as string;
      const operateur = attribut.groups["operateur"];
      const brut = attribut.groups["valeur"];

      if (operateur === undefined || brut === undefined) {
        predicats.push((element) => hasAttr(element, nom));
      } else {
        const attendu = /^["']/u.test(brut) ? brut.slice(1, -1) : brut;
        predicats.push((element) => {
          const reel = getAttr(element, nom);
          return reel !== undefined && comparer(operateur, reel, attendu);
        });
      }
    }
  }

  if (predicats.length === 0) return null;
  return (element) => predicats.every((predicat) => predicat(element));
}
