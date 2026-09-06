/**
 * Enrichissement e-mail.
 *
 * Limite a connaitre : Google Places ne renvoie JAMAIS d'adresse e-mail, quel
 * que soit le masque de champs. Pour un etablissement sans aucune presence web,
 * il n'y a donc rien a recolter automatiquement — c'est le telephone ou la
 * recherche manuelle (la console propose des liens tout prets).
 *
 * Ce module traite le cas intermediaire, qui est aussi le plus frequent : la
 * fiche pointe vers une page Facebook, une plateforme de reservation ou un
 * mini-site mort. Ces pages affichent souvent une adresse de contact.
 */
import { extraireEmails } from './emails.mjs';
import { hote } from './vitrine.mjs';
import { pause } from './places.mjs';

const UA_DEFAUT = 'ProspectionBot/1.0 (+https://github.com/) Node';

/** Pages ou une PME range son adresse de contact. */
export const CHEMINS_CONTACT = [
  '', '/contact', '/contact.html', '/contact.php', '/nous-contacter',
  '/contactez-nous', '/mentions-legales', '/a-propos', '/infos',
];

const robotsParOrigine = new Map();
const dernierAppelParHote = new Map();

/** Espace les requetes vers un meme hote (politesse et anti-blocage). */
async function attendreTour(h, delaiMs) {
  const precedent = dernierAppelParHote.get(h) || 0;
  const attente = precedent + delaiMs - Date.now();
  if (attente > 0) await pause(attente);
  dernierAppelParHote.set(h, Date.now());
}

/** Lecture minimale de robots.txt : les `Disallow` de `User-agent: *`. */
export function analyserRobots(texte) {
  const interdits = [];
  let dansEtoile = false;
  for (const ligne of String(texte).split('\n')) {
    const propre = ligne.split('#')[0].trim();
    if (!propre) continue;
    const [champBrut, ...reste] = propre.split(':');
    const champ = champBrut.trim().toLowerCase();
    const valeur = reste.join(':').trim();
    if (champ === 'user-agent') dansEtoile = valeur === '*';
    else if (dansEtoile && champ === 'disallow' && valeur) interdits.push(valeur);
    else if (dansEtoile && champ === 'allow' && valeur === '/') interdits.length = 0;
  }
  return interdits;
}

export function cheminAutorise(chemin, interdits) {
  const c = chemin || '/';
  return !interdits.some((i) => c.startsWith(i));
}

async function robotsPour(origine, ua, timeoutMs) {
  if (robotsParOrigine.has(origine)) return robotsParOrigine.get(origine);
  let interdits = [];
  try {
    const r = await fetch(`${origine}/robots.txt`, {
      headers: { 'User-Agent': ua },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    });
    if (r.ok) interdits = analyserRobots(await r.text());
  } catch {
    interdits = []; // pas de robots.txt lisible = pas d'interdiction
  }
  robotsParOrigine.set(origine, interdits);
  return interdits;
}

/**
 * Telecharge une page en texte, avec garde-fous.
 * @returns {Promise<{url: string, html: string}|null>}
 */
export async function telecharger(url, options = {}) {
  const {
    ua = UA_DEFAUT, timeoutMs = 12000, tailleMaxKo = 900,
    respecterRobots = true, delaiHoteMs = 1200,
  } = options;

  let cible;
  try {
    cible = new URL(url);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(cible.protocol)) return null;

  if (respecterRobots) {
    const interdits = await robotsPour(cible.origin, ua, 6000);
    if (!cheminAutorise(cible.pathname, interdits)) return null;
  }
  await attendreTour(cible.hostname, delaiHoteMs);

  try {
    const reponse = await fetch(cible, {
      headers: {
        'User-Agent': ua,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!reponse.ok) return null;
    const type = reponse.headers.get('content-type') || '';
    if (!/text\/html|text\/plain|application\/xhtml/i.test(type)) return null;

    const buffer = await reponse.arrayBuffer();
    const html = new TextDecoder('utf-8', { fatal: false })
      .decode(buffer.slice(0, tailleMaxKo * 1024));
    return { url: reponse.url, html };
  } catch {
    return null;
  }
}

/**
 * Cherche une adresse pour un prospect, en partant du lien affiche sur sa fiche.
 * @param {object} prospect
 * @returns {Promise<object>} le prospect, enrichi si une adresse a ete trouvee
 */
export async function enrichirProspect(prospect, options = {}) {
  if (!prospect.siteWeb) return prospect;

  const h = hote(prospect.siteWeb);
  const contexte = { nom: prospect.nom, hote: h };
  const candidats = [prospect.siteWeb];

  // Sur un mini-site, la page « contact » paie mieux que l'accueil. Sur une
  // plateforme tierce, ces chemins n'existent pas : on ne les tente pas.
  if (prospect.vitrine === 'SITE_MORT' || options.explorerContact) {
    const base = new URL(prospect.siteWeb);
    for (const chemin of CHEMINS_CONTACT.slice(1)) {
      candidats.push(new URL(chemin, base.origin).toString());
    }
  }

  const trouvees = new Map();
  for (const candidat of candidats.slice(0, options.pagesMax || 4)) {
    const page = await telecharger(candidat, options);
    if (!page) continue;
    for (const { adresse, note } of extraireEmails(page.html, contexte)) {
      if (!trouvees.has(adresse) || trouvees.get(adresse).note < note) {
        trouvees.set(adresse, { note, source: page.url });
      }
    }
    if ([...trouvees.values()].some((e) => e.note >= 80)) break; // assez sur
  }

  if (!trouvees.size) return prospect;

  const classees = [...trouvees.entries()]
    .map(([adresse, meta]) => ({ adresse, ...meta }))
    .sort((a, b) => b.note - a.note);

  const [meilleure, ...autres] = classees;
  return {
    ...prospect,
    email: meilleure.adresse,
    confianceEmail: meilleure.note,
    sourceEmail: meilleure.source,
    emailsAlternatifs: autres.slice(0, 4).map((e) => e.adresse),
  };
}
