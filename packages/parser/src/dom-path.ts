/**
 * Calcul du `domPath` (§9.1), générique sur la forme de l'arbre.
 *
 * Le parser travaille sur l'arbre parse5 ; le banc de mesure du rappel travaille
 * sur l'arbre de cheerio, parce qu'il doit résoudre des sélecteurs CSS écrits à
 * la main dans `expected.json`. Deux implémentations du même chemin finiraient
 * par diverger sur un détail — un `<tbody>` implicite, un nœud texte — et la
 * mesure du rappel deviendrait fausse sans que rien n'échoue. D'où l'accesseur.
 */

export interface DomPathTree<N> {
  /** Nom de balise en minuscules, ou `null` si le nœud n'est pas un élément. */
  tagName(node: N): string | null;
  parentOf(node: N): N | null;
  childrenOf(node: N): readonly N[];
}

/**
 * `body > main:nth-of-type(1) > section:nth-of-type(2) > h2:nth-of-type(1)`
 *
 * L'indice est toujours écrit, même à un seul élément : un `domPath` sans indice
 * deviendrait ambigu dès qu'un second élément de même balise apparaît, et la
 * chaîne changerait de forme au lieu de changer d'indice.
 */
export function computeDomPath<N>(node: N, tree: DomPathTree<N>): string {
  const segments: string[] = [];

  let courant: N | null = node;
  while (courant !== null) {
    const balise = tree.tagName(courant);
    if (balise === null) break;

    const parent = tree.parentOf(courant);
    if (parent === null) {
      segments.unshift(balise);
      break;
    }

    let rang = 0;
    for (const enfant of tree.childrenOf(parent)) {
      if (tree.tagName(enfant) !== balise) continue;
      rang += 1;
      if (enfant === courant) break;
    }

    segments.unshift(
      balise === "html" || balise === "body" || balise === "head"
        ? balise
        : `${balise}:nth-of-type(${rang})`,
    );
    courant = parent;
  }

  // `html` n'apporte rien : toutes les pages en ont un et un seul.
  return segments[0] === "html" ? segments.slice(1).join(" > ") : segments.join(" > ");
}
