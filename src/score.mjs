/**
 * Notation d'un prospect, de 0 a 100.
 *
 * Le classement repond a une seule question : « chez qui une prise de contact a
 * le plus de chances d'aboutir aujourd'hui ? ». Trois facteurs pesent : le
 * manque de vitrine (le besoin), un canal de contact ouvert (la faisabilite),
 * et l'activite reelle de l'etablissement, mesuree par ses avis (la solvabilite).
 */
import { VITRINE } from './vitrine.mjs';

const POIDS_VITRINE = {
  [VITRINE.SITE_MORT]: 40,      // lien casse affiche aux clients : besoin criant
  [VITRINE.AUCUNE]: 36,
  [VITRINE.RESEAU_SOCIAL]: 30,
  [VITRINE.PLATEFORME]: 22,
  [VITRINE.SITE]: 0,
};

/**
 * @param {object} p prospect normalise
 * @returns {number} note entiere 0-100
 */
export function noterProspect(p) {
  if (p.statutGoogle && p.statutGoogle !== 'OPERATIONAL') return 0;

  let note = POIDS_VITRINE[p.vitrine] ?? 0;

  if (p.email) note += 26;
  else if (p.telephone) note += 8;
  if (p.email && p.telephone) note += 4;

  const avis = Number(p.avis) || 0;
  if (avis >= 200) note += 16;
  else if (avis >= 80) note += 14;
  else if (avis >= 30) note += 11;
  else if (avis >= 10) note += 7;
  else if (avis >= 3) note += 3;

  const etoiles = Number(p.note) || 0;
  if (etoiles >= 4.5) note += 6;
  else if (etoiles >= 4.0) note += 4;
  else if (etoiles > 0 && etoiles < 3.0) note -= 4; // reputation a redresser d'abord

  return Math.max(0, Math.min(100, Math.round(note)));
}

/** Etiquette de priorite derivee de la note. */
export function priorite(note) {
  if (note >= 75) return 'chaud';
  if (note >= 55) return 'tiede';
  return 'froid';
}
