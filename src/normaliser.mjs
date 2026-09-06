/**
 * Traduction d'une fiche Google Places vers l'enregistrement utilise partout
 * ailleurs (export CSV, console de prospection). Les noms de champs sont en
 * francais : le fichier finit sous les yeux de l'utilisateur, pas seulement
 * dans du code.
 */
import { classerVitrine, LIBELLES_VITRINE } from './vitrine.mjs';
import { noterProspect } from './score.mjs';

function composant(lieu, type) {
  return lieu.addressComponents?.find((c) => c.types?.includes(type))?.longText || '';
}

/**
 * @param {object} lieu fiche brute renvoyee par Places
 * @param {{segment?: string, cellule?: string}} contexte
 */
export function normaliser(lieu, contexte = {}) {
  const { vitrine, hote } = classerVitrine(lieu.websiteUri);
  const prospect = {
    id: lieu.id,
    nom: lieu.displayName?.text || '(sans nom)',
    segment: contexte.segment || '',
    typeGoogle: lieu.primaryTypeDisplayName?.text || lieu.primaryType || '',
    adresse: lieu.formattedAddress || '',
    ville: composant(lieu, 'locality') || composant(lieu, 'postal_town'),
    codePostal: composant(lieu, 'postal_code'),
    telephone: lieu.nationalPhoneNumber || '',
    telephoneIntl: lieu.internationalPhoneNumber || '',
    siteWeb: lieu.websiteUri || '',
    hoteSiteWeb: hote || '',
    vitrine,
    vitrineLibelle: LIBELLES_VITRINE[vitrine],
    email: '',
    emailsAlternatifs: [],
    sourceEmail: '',
    confianceEmail: 0,
    note: typeof lieu.rating === 'number' ? Number(lieu.rating.toFixed(1)) : null,
    avis: lieu.userRatingCount ?? 0,
    statutGoogle: lieu.businessStatus || 'OPERATIONAL',
    mapsUrl: lieu.googleMapsUri || '',
    lat: lieu.location?.latitude ?? null,
    lng: lieu.location?.longitude ?? null,
    cellule: contexte.cellule || '',
  };
  prospect.score = noterProspect(prospect);
  return prospect;
}

/** Fusionne deux collectes en dedoublonnant sur l'identifiant Google. */
export function fusionner(...listes) {
  const parId = new Map();
  for (const liste of listes.flat()) {
    if (!liste?.id) continue;
    const existant = parId.get(liste.id);
    if (!existant) {
      parId.set(liste.id, liste);
      continue;
    }
    // Un meme etablissement peut sortir sur deux segments : on garde le plus
    // renseigne plutot que le premier vu.
    const gagnant = (liste.email ? 1 : 0) - (existant.email ? 1 : 0)
      || (liste.score || 0) - (existant.score || 0);
    if (gagnant > 0) parId.set(liste.id, { ...existant, ...liste });
  }
  return [...parId.values()];
}
