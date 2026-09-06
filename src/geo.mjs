/**
 * Decoupage geographique.
 *
 * Une recherche Google Places plafonne a 60 resultats (3 pages de 20). Sur une
 * ville, « restaurant » en renvoie des centaines : sans decoupage on ne voit que
 * le haut du panier — exactement les enseignes qui ont deja un site. On balaie
 * donc la zone en cellules assez petites pour que chacune tienne sous le
 * plafond.
 */

const KM_PAR_DEGRE_LAT = 110.574;

/** Kilometres couverts par un degre de longitude a cette latitude. */
export function kmParDegreLng(lat) {
  return 111.32 * Math.cos((lat * Math.PI) / 180);
}

/**
 * Boite englobante carree autour d'un centre.
 * @param {number} lat @param {number} lng @param {number} rayonKm
 */
export function boiteAutour(lat, lng, rayonKm) {
  const dLat = rayonKm / KM_PAR_DEGRE_LAT;
  const dLng = rayonKm / Math.max(kmParDegreLng(lat), 0.0001);
  return {
    sud: lat - dLat,
    ouest: lng - dLng,
    nord: lat + dLat,
    est: lng + dLng,
  };
}

/** Dimensions approximatives d'une boite, en kilometres. */
export function tailleKm(boite) {
  const latMoyenne = (boite.sud + boite.nord) / 2;
  return {
    hauteur: (boite.nord - boite.sud) * KM_PAR_DEGRE_LAT,
    largeur: (boite.est - boite.ouest) * kmParDegreLng(latMoyenne),
  };
}

/**
 * Decoupe une boite en cellules d'environ `celluleKm` de cote.
 * @returns {Array<{boite: object, ligne: number, colonne: number, ref: string}>}
 */
export function decouper(boite, celluleKm = 2) {
  const { hauteur, largeur } = tailleKm(boite);
  // La tolerance evite qu'un 10.0000000000001 / 2 arrondi vers le haut ajoute
  // une rangee entiere de cellules — donc autant d'appels Places factures.
  const compter = (distance) => Math.max(1, Math.ceil(distance / celluleKm - 1e-6));
  const lignes = compter(hauteur);
  const colonnes = compter(largeur);
  const pasLat = (boite.nord - boite.sud) / lignes;
  const pasLng = (boite.est - boite.ouest) / colonnes;

  const cellules = [];
  for (let l = 0; l < lignes; l += 1) {
    for (let c = 0; c < colonnes; c += 1) {
      cellules.push({
        ligne: l,
        colonne: c,
        // Reference lisible facon carte : A1, B3... utile dans les journaux.
        ref: `${String.fromCharCode(65 + (c % 26))}${l + 1}`,
        boite: {
          sud: boite.sud + l * pasLat,
          ouest: boite.ouest + c * pasLng,
          nord: boite.sud + (l + 1) * pasLat,
          est: boite.ouest + (c + 1) * pasLng,
        },
      });
    }
  }
  return cellules;
}

/** Centre d'une boite. */
export function centre(boite) {
  return {
    lat: (boite.sud + boite.nord) / 2,
    lng: (boite.ouest + boite.est) / 2,
  };
}

/** Traduit une boite au format attendu par l'API Places. */
export function versRectangleApi(boite) {
  return {
    low: { latitude: boite.sud, longitude: boite.ouest },
    high: { latitude: boite.nord, longitude: boite.est },
  };
}
