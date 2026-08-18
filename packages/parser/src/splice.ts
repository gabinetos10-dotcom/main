/**
 * Remplacements par intervalle d'octets.
 *
 * Le gabarit d'item d'une collection est *découpé dans le source*, pas
 * resérialisé : c'est la seule façon qu'un item ajouté par le client porte
 * exactement les mêmes classes, attributs et espaces que ses voisins.
 *
 * Le builder du P3 réutilisera cette fonction, pour la même raison — l'identité
 * byte-à-byte ne survit pas à un aller-retour par un sérialiseur.
 */

export interface Splice {
  startOffset: number;
  endOffset: number;
  replacement: string;
}

export function applySplices(source: string, splices: readonly Splice[]): string {
  const ordonnes = [...splices].sort((a, b) => b.startOffset - a.startOffset);

  let precedent = Number.POSITIVE_INFINITY;
  let resultat = source;

  for (const remplacement of ordonnes) {
    if (remplacement.endOffset > precedent) {
      throw new Error(
        `Remplacements chevauchants : [${remplacement.startOffset}, ${remplacement.endOffset}] ` +
          `déborde sur ${precedent}.`,
      );
    }
    resultat =
      resultat.slice(0, remplacement.startOffset) +
      remplacement.replacement +
      resultat.slice(remplacement.endOffset);
    precedent = remplacement.startOffset;
  }

  return resultat;
}
