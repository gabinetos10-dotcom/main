/**
 * Ecriture des fichiers de sortie.
 *
 * Le CSV vise Excel en francais : separateur point-virgule et BOM UTF-8, sinon
 * les accents partent en salade et tout tient dans une seule colonne.
 */
import { LIBELLES_VITRINE } from './vitrine.mjs';
import { priorite } from './score.mjs';

export const COLONNES = [
  ['nom', 'Enseigne'],
  ['segment', 'Segment'],
  ['typeGoogle', 'Type Google'],
  ['vitrineLibelle', 'Vitrine'],
  ['email', 'E-mail'],
  ['confianceEmail', 'Confiance e-mail'],
  ['telephone', 'Telephone'],
  ['adresse', 'Adresse'],
  ['codePostal', 'Code postal'],
  ['ville', 'Ville'],
  ['note', 'Note Google'],
  ['avis', 'Nombre d avis'],
  ['score', 'Score prospect'],
  ['prioriteLibelle', 'Priorite'],
  ['siteWeb', 'Lien affiche'],
  ['sourceEmail', 'Source e-mail'],
  ['emailsAlternatifsTexte', 'Autres e-mails'],
  ['mapsUrl', 'Fiche Google Maps'],
  ['id', 'Identifiant Google'],
];

function echapper(valeur, separateur) {
  if (valeur === null || valeur === undefined) return '';
  const texte = String(valeur);
  if (texte.includes('"') || texte.includes(separateur) || /[\r\n]/.test(texte)) {
    return `"${texte.replace(/"/g, '""')}"`;
  }
  return texte;
}

/** Ajoute les colonnes calculees attendues dans l'export. */
export function aplatir(p) {
  return {
    ...p,
    vitrineLibelle: p.vitrineLibelle || LIBELLES_VITRINE[p.vitrine] || p.vitrine,
    prioriteLibelle: priorite(p.score || 0),
    emailsAlternatifsTexte: (p.emailsAlternatifs || []).join(' | '),
    confianceEmail: p.email ? p.confianceEmail || '' : '',
  };
}

/** Serialise les prospects en CSV. */
export function versCsv(prospects, { separateur = ';', bom = true } = {}) {
  const lignes = [COLONNES.map(([, titre]) => echapper(titre, separateur)).join(separateur)];
  for (const brut of prospects) {
    const p = aplatir(brut);
    lignes.push(COLONNES.map(([cle]) => echapper(p[cle], separateur)).join(separateur));
  }
  return (bom ? '﻿' : '') + lignes.join('\r\n') + '\r\n';
}

/** Enveloppe JSON lue telle quelle par la console de prospection. */
export function versJson(prospects, meta = {}) {
  return {
    version: 1,
    genereLe: new Date().toISOString(),
    ...meta,
    total: prospects.length,
    avecEmail: prospects.filter((p) => p.email).length,
    prospects: prospects.map(aplatir),
  };
}
