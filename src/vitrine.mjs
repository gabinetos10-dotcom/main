/**
 * Classification de la « vitrine » d'un etablissement.
 *
 * Google Places renvoie un champ `websiteUri` qui melange trois realites tres
 * differentes pour un prospecteur : un vrai site, une page Facebook, ou un lien
 * mort vers un constructeur ferme. On les separe ici, parce que la valeur
 * commerciale d'un prospect en depend directement.
 */

/** Reseaux sociaux : l'enseigne existe en ligne mais n'a aucun site a elle. */
export const RESEAUX_SOCIAUX = [
  'facebook.com', 'fb.com', 'fb.me', 'm.facebook.com',
  'instagram.com', 'instagr.am',
  'tiktok.com', 'twitter.com', 'x.com',
  'linkedin.com', 'youtube.com', 'snapchat.com',
  'linktr.ee', 'linktree.com', 'beacons.ai', 'bio.link', 'taplink.cc',
  'wa.me', 'api.whatsapp.com',
];

/** Plateformes tierces : la fiche appartient a l'agregateur, pas a l'enseigne. */
export const PLATEFORMES = [
  // Restauration
  'thefork.fr', 'thefork.com', 'lafourchette.com', 'zenchef.com', 'guestonline.fr',
  'ubereats.com', 'deliveroo.fr', 'just-eat.fr', 'justeat.fr', 'foodora.fr',
  'tripadvisor.fr', 'tripadvisor.com', 'yelp.fr', 'yelp.com',
  'michelin.com', 'guide.michelin.com', 'petitfute.com', 'lebonguide.com',
  'restaurantguru.com', 'theforkmanager.com', 'malou.io',
  // Beaute / bien-etre
  'planity.com', 'treatwell.fr', 'treatwell.com', 'flexy.fr', 'kiute.com',
  'wavy.beauty', 'balinea.com', 'lookoom.com',
  // Sante / divers
  'doctolib.fr', 'maiia.com', 'keldoc.com',
  'pagesjaunes.fr', 'mappy.com', 'yellowpages.fr', 'hoodspot.fr',
  'booking.com', 'expedia.fr', 'airbnb.fr',
  'wanteed.fr', 'leboncoin.fr', 'etsy.com', 'amazon.fr',
];

/**
 * Constructeurs gratuits et pages mortes. `business.site` merite une mention :
 * c'etait le mini-site fourni par Google Business Profile, arrete en mars 2024.
 * Une fiche qui pointe encore dessus affiche un lien casse a ses clients — le
 * meilleur prospect de la liste.
 */
export const SITES_MORTS = [
  'business.site', 'negocio.site', 'company.site',
  'sites.google.com', 'wixsite.com', 'e-monsite.com', 'jimdosite.com',
  'jimdofree.com', 'weebly.com', 'over-blog.com', 'blogspot.com',
  'wordpress.com', 'pagesperso-orange.fr', 'free.fr', 'monsite.com',
  'webnode.fr', 'site123.me', 'yolasite.com', 'wixstudio.com',
];

export const VITRINE = {
  AUCUNE: 'AUCUNE',
  SITE_MORT: 'SITE_MORT',
  RESEAU_SOCIAL: 'RESEAU_SOCIAL',
  PLATEFORME: 'PLATEFORME',
  SITE: 'SITE',
};

/** Libelles affiches dans les exports et la console. */
export const LIBELLES_VITRINE = {
  AUCUNE: 'Aucune presence web',
  SITE_MORT: 'Lien mort / constructeur gratuit',
  RESEAU_SOCIAL: 'Reseau social uniquement',
  PLATEFORME: 'Plateforme tierce uniquement',
  SITE: 'Site web autonome',
};

/** Les vitrines qui font d'un etablissement un prospect. */
export const VITRINES_PROSPECT = [
  VITRINE.AUCUNE, VITRINE.SITE_MORT, VITRINE.RESEAU_SOCIAL, VITRINE.PLATEFORME,
];

/** Extrait le hote d'une URL, sans `www.`, en minuscules. `null` si invalide. */
export function hote(url) {
  if (!url || typeof url !== 'string') return null;
  let brut = url.trim();
  if (!brut) return null;
  if (!/^https?:\/\//i.test(brut)) brut = `http://${brut}`;
  try {
    return new URL(brut).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** Vrai si `h` est `domaine` ou un sous-domaine de `domaine`. */
function correspond(h, domaine) {
  return h === domaine || h.endsWith(`.${domaine}`);
}

/**
 * Classe l'URL d'un etablissement.
 * @param {string|null|undefined} url la valeur de `websiteUri`
 * @returns {{vitrine: string, hote: string|null, libelle: string}}
 */
export function classerVitrine(url) {
  const h = hote(url);
  if (!h) return { vitrine: VITRINE.AUCUNE, hote: null, libelle: LIBELLES_VITRINE.AUCUNE };

  const table = [
    [SITES_MORTS, VITRINE.SITE_MORT],
    [RESEAUX_SOCIAUX, VITRINE.RESEAU_SOCIAL],
    [PLATEFORMES, VITRINE.PLATEFORME],
  ];
  for (const [domaines, vitrine] of table) {
    if (domaines.some((d) => correspond(h, d))) {
      return { vitrine, hote: h, libelle: LIBELLES_VITRINE[vitrine] };
    }
  }
  return { vitrine: VITRINE.SITE, hote: h, libelle: LIBELLES_VITRINE.SITE };
}

/** Vrai si la vitrine justifie de garder l'etablissement dans la liste. */
export function estProspect(vitrine) {
  return VITRINES_PROSPECT.includes(vitrine);
}
