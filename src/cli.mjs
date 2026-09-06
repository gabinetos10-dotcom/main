#!/usr/bin/env node
/**
 * Collecteur d'enseignes sans site web.
 *
 *   node src/cli.mjs run --lieu "Nantes" --segments restaurant,coiffeur
 *
 * Chaine complete : Google Places -> filtre vitrine -> enrichissement e-mail
 * -> fichiers JSON et CSV a charger dans la console de prospection.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { rechercher, geocoder, ErreurPlaces } from './places.mjs';
import { boiteAutour, decouper, versRectangleApi, tailleKm } from './geo.mjs';
import { normaliser, fusionner } from './normaliser.mjs';
import { estProspect, VITRINE } from './vitrine.mjs';
import { resoudreSegments, SEGMENTS } from './segments.mjs';
import { enrichirProspect } from './enrich.mjs';
import { versCsv, versJson } from './export.mjs';
import { noterProspect } from './score.mjs';
import { jeuDemo } from './demo.mjs';

const AIDE = `
Prospection d'enseignes sans site web — collecteur Google Places

  node src/cli.mjs <commande> [options]

Commandes
  run        Collecte + enrichissement + export, en une fois
  collect    Interroge Google Places et filtre les enseignes sans vrai site
  enrich     Cherche une adresse e-mail sur les liens des fiches collectees
  export     Ecrit le CSV et le JSON a partir d'un fichier de collecte
  demo       Genere un jeu d'exemple (aucun appel facture)
  segments   Liste les segments disponibles

Options principales
  --lieu "Nantes"          Ville, code postal ou adresse a balayer
  --segments a,b,c         Segments a collecter (voir « segments »)
  --rayon 5                Rayon en km autour du centre du lieu (defaut : cadre Google)
  --cellule 2              Cote des cellules de balayage en km (defaut 2)
  --in / --out             Fichiers JSON d'entree / de sortie
  --csv fichier.csv        Chemin du CSV (defaut : a cote du JSON)
  --inclure-sites          Garde aussi les enseignes qui ont deja un vrai site
  --sans-enrichissement    Saute la recherche d'e-mails
  --pages-contact          Sur les mini-sites, explore aussi /contact et /mentions-legales
  --ignorer-robots         Ne lit pas robots.txt avant de telecharger une page
  --separateur ","         Separateur CSV (defaut « ; » pour Excel FR)
  --cle CLE                Cle API (sinon GOOGLE_MAPS_API_KEY)

Exemples
  node src/cli.mjs run --lieu "Rennes" --segments coiffeur,esthetique --rayon 6
  node src/cli.mjs run --lieu "44000" --segments restaurant --cellule 1.5
  node src/cli.mjs demo --out data/exemple.json
`;

function analyserArgs(argv) {
  const options = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) { options._.push(arg); continue; }
    const cle = arg.slice(2);
    const suivant = argv[i + 1];
    if (suivant === undefined || suivant.startsWith('--')) options[cle] = true;
    else { options[cle] = suivant; i += 1; }
  }
  return options;
}

function journal(...args) { console.error(...args); }

function cleApi(options) {
  const cle = options.cle || process.env.GOOGLE_MAPS_API_KEY;
  if (!cle || cle === true) {
    throw new Error(
      'Cle API manquante. Renseignez GOOGLE_MAPS_API_KEY (voir .env.example) ou passez --cle.',
    );
  }
  return cle;
}

async function ecrire(chemin, contenu) {
  const absolu = resolve(chemin);
  await mkdir(dirname(absolu), { recursive: true });
  await writeFile(absolu, contenu, 'utf8');
  return absolu;
}

async function lireJson(chemin) {
  return JSON.parse(await readFile(resolve(chemin), 'utf8'));
}

/** Prospects contenus dans un fichier, quel que soit son emballage. */
function prospectsDe(donnees) {
  if (Array.isArray(donnees)) return donnees;
  if (Array.isArray(donnees?.prospects)) return donnees.prospects;
  throw new Error('Fichier illisible : ni tableau, ni objet contenant « prospects ».');
}

// --------------------------------------------------------------- collect ---

async function commandeCollect(options) {
  const cle = cleApi(options);
  const segments = resoudreSegments(options.segments || 'restaurant');
  if (!options.lieu) throw new Error('Precisez le secteur avec --lieu "Nantes".');

  journal(`Geocodage de « ${options.lieu} »...`);
  const zone = await geocoder({ cle, adresse: String(options.lieu) });
  const boite = options.rayon
    ? boiteAutour(zone.centre.lat, zone.centre.lng, Number(options.rayon))
    : zone.boite;
  const { largeur, hauteur } = tailleKm(boite);
  const cellules = decouper(boite, Number(options.cellule || 2));

  journal(`Zone : ${zone.libelle}`);
  journal(`Surface balayee : ${largeur.toFixed(1)} x ${hauteur.toFixed(1)} km, ${cellules.length} cellules`);
  journal(`Segments : ${segments.map((s) => s.libelle).join(', ')}`);
  journal(`Requetes prevues : ~${cellules.length * segments.length} (x3 pages max)\n`);

  const tous = [];
  let appels = 0;
  let saturees = 0;

  for (const segment of segments) {
    let collectesSegment = 0;
    for (const cellule of cellules) {
      const rectangle = versRectangleApi(cellule.boite);
      let resultat;
      try {
        resultat = await rechercher({
          cle, requete: segment.requete, typeInclus: segment.type, rectangle,
        });
      } catch (erreur) {
        // Un type retire de la nomenclature Google renvoie 400 : on retente au
        // mot-cle seul plutot que d'abandonner la cellule.
        if (erreur instanceof ErreurPlaces && erreur.statut === 400 && segment.type) {
          resultat = await rechercher({ cle, requete: segment.requete, rectangle });
        } else throw erreur;
      }
      appels += resultat.pages;
      if (resultat.sature) saturees += 1;
      for (const lieu of resultat.lieux) {
        tous.push(normaliser(lieu, { segment: segment.cle, cellule: cellule.ref }));
      }
      collectesSegment += resultat.lieux.length;
      process.stderr.write(`\r  ${segment.libelle} : ${collectesSegment} fiches (cellule ${cellule.ref})      `);
    }
    process.stderr.write('\n');
  }

  const uniques = fusionner(tous);
  const gardes = options['inclure-sites']
    ? uniques
    : uniques.filter((p) => estProspect(p.vitrine) && p.statutGoogle === 'OPERATIONAL');
  const ecartes = uniques.length - gardes.length;

  journal(`\n${uniques.length} etablissements uniques, ${ecartes} ecartes (site autonome ou ferme).`);
  if (saturees) {
    journal(`${saturees} cellule(s) ont atteint le plafond de 60 resultats : reduisez --cellule pour ne rien manquer.`);
  }
  journal(`Appels Places factures : ${appels}`);

  return {
    prospects: gardes.sort((a, b) => b.score - a.score),
    meta: {
      lieu: zone.libelle, boite, cellules: cellules.length,
      segments: segments.map((s) => s.cle), appelsPlaces: appels,
      ecartesAvecSite: ecartes, cellulesSaturees: saturees,
    },
  };
}

// ---------------------------------------------------------------- enrich ---

async function enrichirTous(prospects, options) {
  const aTraiter = prospects.filter((p) => p.siteWeb && !p.email);
  journal(`\nRecherche d'e-mails sur ${aTraiter.length} fiche(s) qui affichent un lien.`);
  const sansLien = prospects.length - aTraiter.length;
  if (sansLien > 0) {
    journal(`${sansLien} fiche(s) sans lien exploitable : Google ne fournit pas d'e-mail, la console propose des pistes de recherche manuelle.`);
  }

  const parId = new Map(prospects.map((p) => [p.id, p]));
  let trouves = 0;
  let fait = 0;

  for (const prospect of aTraiter) {
    const enrichi = await enrichirProspect(prospect, {
      ua: process.env.PROSPECT_USER_AGENT || undefined,
      respecterRobots: !options['ignorer-robots'],
      explorerContact: Boolean(options['pages-contact']),
    });
    if (enrichi.email) trouves += 1;
    enrichi.score = noterProspect(enrichi);
    parId.set(enrichi.id, enrichi);
    fait += 1;
    process.stderr.write(`\r  ${fait}/${aTraiter.length} explorees, ${trouves} adresse(s) trouvee(s)      `);
  }
  process.stderr.write('\n');
  return [...parId.values()].sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------- export ---

async function ecrireSorties(prospects, meta, options) {
  const cheminJson = options.out || 'data/prospects.json';
  const cheminCsv = options.csv || cheminJson.replace(/\.json$/i, '.csv');
  const enveloppe = versJson(prospects, meta);

  const jsonEcrit = await ecrire(cheminJson, `${JSON.stringify(enveloppe, null, 2)}\n`);
  const csvEcrit = await ecrire(
    cheminCsv,
    versCsv(prospects, { separateur: options.separateur === true ? ';' : (options.separateur || ';') }),
  );

  const avecEmail = prospects.filter((p) => p.email).length;
  const chauds = prospects.filter((p) => p.score >= 75).length;
  journal('\nResultat');
  journal(`  ${prospects.length} prospects retenus`);
  journal(`  ${avecEmail} avec e-mail (${prospects.length ? Math.round((avecEmail / prospects.length) * 100) : 0} %)`);
  journal(`  ${chauds} en priorite chaude`);
  journal(`  JSON : ${jsonEcrit}`);
  journal(`  CSV  : ${csvEcrit}`);
  journal('\nChargez le JSON dans la console de prospection (bouton « Importer »).');
}

// ------------------------------------------------------------------ main ---

async function principal() {
  const options = analyserArgs(process.argv.slice(2));
  const commande = options._[0] || 'aide';

  switch (commande) {
    case 'segments': {
      const large = Math.max(...Object.keys(SEGMENTS).map((c) => c.length));
      for (const [cle, s] of Object.entries(SEGMENTS)) {
        console.log(`${cle.padEnd(large)}  ${s.libelle}`);
      }
      return;
    }

    case 'demo': {
      const prospects = jeuDemo().filter((p) => estProspect(p.vitrine));
      await ecrireSorties(prospects, {
        lieu: 'Nantes (jeu d\'exemple)', exemple: true,
        segments: [...new Set(prospects.map((p) => p.segment))],
        ecartesAvecSite: jeuDemo().length - prospects.length,
      }, { ...options, out: options.out || 'data/exemple.json' });
      return;
    }

    case 'collect': {
      const { prospects, meta } = await commandeCollect(options);
      await ecrireSorties(prospects, meta, { ...options, out: options.out || 'data/collecte.json' });
      return;
    }

    case 'enrich': {
      if (!options.in) throw new Error('Precisez le fichier de collecte avec --in data/collecte.json');
      const donnees = await lireJson(options.in);
      const prospects = await enrichirTous(prospectsDe(donnees), options);
      await ecrireSorties(prospects, donnees.meta || {}, { ...options, out: options.out || options.in });
      return;
    }

    case 'export': {
      if (!options.in) throw new Error('Precisez le fichier a exporter avec --in data/collecte.json');
      const donnees = await lireJson(options.in);
      const prospects = prospectsDe(donnees);
      await ecrireSorties(prospects, donnees.meta || {}, { ...options, out: options.out || options.in });
      return;
    }

    case 'run': {
      const { prospects, meta } = await commandeCollect(options);
      const finaux = options['sans-enrichissement']
        ? prospects
        : await enrichirTous(prospects, options);
      await ecrireSorties(finaux, meta, { ...options, out: options.out || 'data/prospects.json' });
      return;
    }

    default:
      console.log(AIDE);
      if (commande !== 'aide' && commande !== '--help') process.exitCode = 1;
  }
}

principal().catch((erreur) => {
  console.error(`\nErreur : ${erreur.message}`);
  if (erreur instanceof ErreurPlaces && erreur.statut === 403) {
    console.error('Verifiez que « Places API (New) » est activee et que la cle n\'est pas restreinte a un referent HTTP.');
  }
  process.exitCode = 1;
});
