/**
 * Extraction et qualification d'adresses e-mail depuis du HTML.
 *
 * Sur ce type de cibles (petits commerces), l'adresse est presque toujours soit
 * un role generique sur le domaine de l'enseigne, soit une boite grand public
 * (gmail, orange, free...). Les deux sont exploitables ; ce qui ne l'est pas,
 * c'est le bruit technique : traceurs, exemples de theme, noms de fichiers.
 */

const MOTIF_EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,24}/g;

/** Domaines qui ne sont jamais ceux d'un commercant. */
const DOMAINES_BRUIT = [
  'sentry.io', 'sentry-next.wixpress.com', 'wixpress.com', 'wix.com',
  'example.com', 'example.org', 'exemple.fr', 'domain.com', 'yourdomain.com',
  'votredomaine.fr', 'email.com', 'mail.com', 'test.com', 'localhost',
  'godaddy.com', 'squarespace.com', 'shopify.com', 'woocommerce.com',
  'wordpress.org', 'automattic.com', 'elementor.com', 'themeforest.net',
  'jquery.com', 'schema.org', 'w3.org', 'adobe.com', 'google.com',
  'facebook.com', 'instagram.com', 'gstatic.com', 'googleapis.com',
  'cloudflare.com', 'jsdelivr.net', 'unpkg.com', 'bootstrapcdn.com',
];

/** Prefixes techniques : delivrables mais jamais lus par un patron. */
const PREFIXES_BRUIT = [
  'noreply', 'no-reply', 'donotreply', 'do-not-reply', 'ne-pas-repondre',
  'postmaster', 'mailer-daemon', 'abuse', 'hostmaster', 'root@',
  'sentry', 'wordpress', 'user', 'your', 'votre', 'nom', 'name', 'prenom',
  'email', 'adresse', 'exemple', 'example', 'test', 'demo', 'sample',
];

/** Extensions de fichiers : « logo@2x.png » n'est pas une adresse. */
const EXTENSIONS_FICHIER = /\.(png|jpe?g|gif|webp|svg|ico|css|js|mjs|json|woff2?|ttf|eot|mp4|webm|pdf|zip)$/i;

/** Roles qui aboutissent reellement chez le decideur d'un commerce. */
const ROLES_UTILES = [
  'contact', 'info', 'infos', 'bonjour', 'hello', 'salut', 'accueil',
  'reservation', 'reservations', 'commande', 'commandes', 'boutique',
  'direction', 'gerance', 'gerant', 'patron', 'resa', 'rdv', 'devis',
  'restaurant', 'salon', 'bar', 'cafe', 'boulangerie', 'garage', 'sav',
];

/** Boites grand public : tres frequentes chez les petits commercants. */
export const FOURNISSEURS_GRAND_PUBLIC = [
  'gmail.com', 'googlemail.com', 'hotmail.fr', 'hotmail.com', 'outlook.fr',
  'outlook.com', 'live.fr', 'msn.com', 'yahoo.fr', 'yahoo.com',
  'orange.fr', 'wanadoo.fr', 'free.fr', 'sfr.fr', 'neuf.fr', 'laposte.net',
  'bbox.fr', 'numericable.fr', 'aliceadsl.fr', 'club-internet.fr', 'icloud.com',
];

/** Remet a plat les obfuscations courantes avant de lancer la regex. */
export function deobfusquer(html) {
  if (!html) return '';
  return String(html)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&commat;|&#64;/gi, '@')
    .replace(/&(?:amp|nbsp|quot|apos);/gi, ' ')
    .replace(/\s*[[({<]\s*(?:at|arobase|chez)\s*[\])}>]\s*/gi, '@')
    .replace(/\s+(?:at|arobase)\s+/gi, '@')
    .replace(/\s*[[({<]\s*(?:dot|point)\s*[\])}>]\s*/gi, '.')
    .replace(/\s+(?:dot|point)\s+/gi, '.');
}

function estBruit(adresse) {
  const bas = adresse.toLowerCase();
  const [local, domaine] = bas.split('@');
  if (!local || !domaine) return true;
  if (EXTENSIONS_FICHIER.test(bas)) return true;
  if (/^\d+x?$/.test(local)) return true;               // « @2x » des images retina
  if (local.length > 64 || bas.length > 254) return true;
  if (/^[0-9a-f]{16,}$/.test(local)) return true;        // hash de traceur
  if (DOMAINES_BRUIT.some((d) => domaine === d || domaine.endsWith(`.${d}`))) return true;
  if (PREFIXES_BRUIT.some((p) => local === p || local.startsWith(`${p}.`) || local.startsWith(`${p}-`))) return true;
  return false;
}

/** Retire les accents et la ponctuation : « Chez Marcel ! » -> « chezmarcel ». */
export function slug(texte) {
  return String(texte || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Note une adresse de 0 a 100 selon sa probabilite d'atteindre le decideur.
 * @param {string} adresse
 * @param {{nom?: string, hote?: string|null}} contexte
 */
export function noterEmail(adresse, contexte = {}) {
  const bas = adresse.toLowerCase();
  const [local, domaine] = bas.split('@');
  let note = 40;

  if (ROLES_UTILES.includes(local)) note += 30;
  else if (ROLES_UTILES.some((r) => local.startsWith(r))) note += 20;

  const grandPublic = FOURNISSEURS_GRAND_PUBLIC.includes(domaine);
  if (grandPublic) note += 10;

  const nomSlug = slug(contexte.nom);
  const domaineSlug = slug(domaine.split('.')[0]);
  if (!grandPublic && nomSlug && domaineSlug) {
    if (domaineSlug === nomSlug) note += 25;
    else if (nomSlug.length >= 5 && domaineSlug.includes(nomSlug)) note += 20;
    else if (domaineSlug.length >= 5 && nomSlug.includes(domaineSlug)) note += 20;
  }
  if (contexte.hote && domaine === slug(contexte.hote)) note += 5;
  if (/^[a-z]\.[a-z]+$/.test(local) || /^[a-z]+\.[a-z]+$/.test(local)) note += 10; // prenom.nom
  if (local.includes('webmaster') || local.includes('admin')) note -= 15;
  if (domaine.endsWith('.fr') || domaine.endsWith('.corsica') || domaine.endsWith('.paris')) note += 5;

  return Math.max(0, Math.min(100, note));
}

/**
 * Extrait toutes les adresses plausibles d'un document HTML ou texte.
 * @param {string} html
 * @param {{nom?: string, hote?: string|null}} contexte
 * @returns {Array<{adresse: string, note: number}>} triees, meilleure d'abord
 */
export function extraireEmails(html, contexte = {}) {
  const texte = deobfusquer(html);
  const vues = new Map();

  const ajouter = (brut, bonus = 0) => {
    const adresse = brut.trim().replace(/^[.,;:'"<(]+|[.,;:'"?!>)]+$/g, '').toLowerCase();
    if (!adresse.includes('@') || estBruit(adresse)) return;
    const note = Math.min(100, noterEmail(adresse, contexte) + bonus);
    if (!vues.has(adresse) || vues.get(adresse) < note) vues.set(adresse, note);
  };

  // Les liens mailto: sont l'intention explicite du site : on les privilegie.
  for (const m of texte.matchAll(/mailto:([^"'?\s>]+)/gi)) {
    ajouter(decodeURIComponent(m[1]), 15);
  }
  for (const m of texte.matchAll(MOTIF_EMAIL)) ajouter(m[0]);

  return [...vues.entries()]
    .map(([adresse, note]) => ({ adresse, note }))
    .sort((a, b) => b.note - a.note || a.adresse.localeCompare(b.adresse));
}
