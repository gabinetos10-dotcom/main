/**
 * Client minimal de l'API Google Places (New) et de l'API Geocoding.
 *
 * On reste sur l'API officielle : le scraping des pages maps.google.com viole
 * les conditions d'utilisation, casse a chaque changement de balisage, et fait
 * bannir la cle. Le cout est la contrepartie ; voir README pour le detail.
 */

const URL_RECHERCHE = 'https://places.googleapis.com/v1/places:searchText';
const URL_GEOCODAGE = 'https://maps.googleapis.com/maps/api/geocode/json';

/**
 * Champs demandes. Le masque conditionne la facturation : chaque champ
 * supplementaire peut faire basculer la requete dans un palier superieur, donc
 * on ne demande que ce qui sert reellement a la prospection.
 */
export const MASQUE_CHAMPS = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.addressComponents',
  'places.location',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.primaryType',
  'places.primaryTypeDisplayName',
  'places.businessStatus',
  'places.googleMapsUri',
  'nextPageToken',
].join(',');

export class ErreurPlaces extends Error {
  constructor(message, statut, details) {
    super(message);
    this.name = 'ErreurPlaces';
    this.statut = statut;
    this.details = details;
  }
}

async function postJson(url, corps, cle, masque, { essais = 3 } = {}) {
  let derniere;
  for (let tentative = 0; tentative < essais; tentative += 1) {
    let reponse;
    try {
      reponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': cle,
          'X-Goog-FieldMask': masque,
        },
        body: JSON.stringify(corps),
      });
    } catch (cause) {
      derniere = new ErreurPlaces(`Reseau injoignable : ${cause.message}`, 0);
      await pause(500 * 2 ** tentative);
      continue;
    }

    if (reponse.ok) return reponse.json();

    const texte = await reponse.text();
    derniere = new ErreurPlaces(
      `Places a repondu ${reponse.status} : ${texte.slice(0, 400)}`,
      reponse.status,
      texte,
    );
    // 429/5xx : la charge peut retomber. 4xx : la requete est fautive, on sort.
    if (reponse.status !== 429 && reponse.status < 500) throw derniere;
    await pause(1000 * 2 ** tentative);
  }
  throw derniere;
}

export function pause(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Recherche textuelle dans un rectangle, pagination comprise (60 max par appel).
 * @returns {Promise<{lieux: object[], pages: number, sature: boolean}>}
 */
export async function rechercher({
  cle, requete, typeInclus, rectangle,
  langue = 'fr', region = 'FR', pagesMax = 3, entreDeuxPagesMs = 250,
}) {
  const lieux = [];
  let pageToken;
  let pages = 0;

  do {
    const corps = {
      textQuery: requete,
      pageSize: 20,
      languageCode: langue,
      regionCode: region,
      ...(typeInclus ? { includedType: typeInclus, strictTypeFiltering: false } : {}),
      ...(rectangle ? { locationRestriction: { rectangle } } : {}),
      ...(pageToken ? { pageToken } : {}),
    };
    const donnees = await postJson(URL_RECHERCHE, corps, cle, MASQUE_CHAMPS);
    lieux.push(...(donnees.places || []));
    pageToken = donnees.nextPageToken;
    pages += 1;
    if (pageToken && pages < pagesMax) await pause(entreDeuxPagesMs);
  } while (pageToken && pages < pagesMax);

  // 60 resultats pile signifie presque toujours que la cellule deborde.
  return { lieux, pages, sature: Boolean(pageToken) || lieux.length >= 60 };
}

/**
 * Resout un lieu ecrit en clair (« Nantes », « 44000 ») en boite englobante.
 * @returns {Promise<{boite: object, libelle: string}>}
 */
export async function geocoder({ cle, adresse, region = 'fr', langue = 'fr' }) {
  const url = new URL(URL_GEOCODAGE);
  url.searchParams.set('address', adresse);
  url.searchParams.set('region', region);
  url.searchParams.set('language', langue);
  url.searchParams.set('key', cle);

  const reponse = await fetch(url);
  if (!reponse.ok) {
    throw new ErreurPlaces(`Geocoding a repondu ${reponse.status}`, reponse.status);
  }
  const donnees = await reponse.json();
  if (donnees.status !== 'OK' || !donnees.results?.length) {
    throw new ErreurPlaces(
      `Lieu introuvable : « ${adresse} » (${donnees.status}${donnees.error_message ? ` — ${donnees.error_message}` : ''})`,
      200,
      donnees,
    );
  }
  const premier = donnees.results[0];
  const cadre = premier.geometry.bounds || premier.geometry.viewport;
  return {
    libelle: premier.formatted_address,
    centre: premier.geometry.location,
    boite: {
      sud: cadre.southwest.lat,
      ouest: cadre.southwest.lng,
      nord: cadre.northeast.lat,
      est: cadre.northeast.lng,
    },
  };
}
