import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { classerVitrine, estProspect, hote, VITRINE } from '../src/vitrine.mjs';
import { extraireEmails, deobfusquer, noterEmail, slug } from '../src/emails.mjs';
import { boiteAutour, decouper, tailleKm, versRectangleApi } from '../src/geo.mjs';
import { noterProspect, priorite } from '../src/score.mjs';
import { versCsv, versJson, COLONNES } from '../src/export.mjs';
import { analyserRobots, cheminAutorise } from '../src/enrich.mjs';
import { fusionner, normaliser } from '../src/normaliser.mjs';
import { resoudreSegments } from '../src/segments.mjs';

describe('classification de vitrine', () => {
  test('absence de lien = aucune vitrine', () => {
    for (const vide of [null, undefined, '', '   ', 'pas une url']) {
      assert.equal(classerVitrine(vide).vitrine, VITRINE.AUCUNE);
    }
  });

  test('reconnait les reseaux sociaux, sous-domaines compris', () => {
    assert.equal(classerVitrine('https://www.facebook.com/chez-marcel').vitrine, VITRINE.RESEAU_SOCIAL);
    assert.equal(classerVitrine('https://m.facebook.com/x').vitrine, VITRINE.RESEAU_SOCIAL);
    assert.equal(classerVitrine('instagram.com/salon').vitrine, VITRINE.RESEAU_SOCIAL);
  });

  test('reconnait les plateformes de reservation', () => {
    assert.equal(classerVitrine('https://www.planity.com/salon-x').vitrine, VITRINE.PLATEFORME);
    assert.equal(classerVitrine('https://www.thefork.fr/restaurant/y').vitrine, VITRINE.PLATEFORME);
    assert.equal(classerVitrine('https://www.doctolib.fr/kine/nantes/z').vitrine, VITRINE.PLATEFORME);
  });

  test('business.site, le mini-site Google ferme en 2024, est un lien mort', () => {
    assert.equal(classerVitrine('https://marcel.business.site').vitrine, VITRINE.SITE_MORT);
    assert.equal(classerVitrine('https://marcel.wixsite.com/monsite').vitrine, VITRINE.SITE_MORT);
  });

  test('un domaine propre reste un vrai site et sort de la cible', () => {
    assert.equal(classerVitrine('https://restaurant-marcel.fr').vitrine, VITRINE.SITE);
    assert.equal(estProspect(VITRINE.SITE), false);
    assert.equal(estProspect(VITRINE.AUCUNE), true);
  });

  test('un nom de domaine qui contient « facebook » n est pas Facebook', () => {
    assert.equal(classerVitrine('https://facebook-marketing-nantes.fr').vitrine, VITRINE.SITE);
  });

  test('hote() retire le www et la casse', () => {
    assert.equal(hote('HTTPS://WWW.Exemple.FR/page'), 'exemple.fr');
  });
});

describe('extraction d e-mails', () => {
  test('trouve une adresse dans un lien mailto avec parametres', () => {
    const r = extraireEmails('<a href="mailto:Contact@Salon.fr?subject=Bonjour">ecrire</a>');
    assert.equal(r[0].adresse, 'contact@salon.fr');
  });

  test('deobfusque les formes « at » et les entites HTML', () => {
    assert.match(deobfusquer('marcel [at] gmail [dot] com'), /marcel@gmail\.com/);
    assert.match(deobfusquer('info&#64;salon.fr'), /info@salon\.fr/);
  });

  test('rejette les noms de fichiers, traceurs et adresses de theme', () => {
    const bruit = 'logo@2x.png sprite@3x.jpg noreply@sentry.io hello@example.com abc@wixpress.com';
    assert.deepEqual(extraireEmails(bruit), []);
  });

  test('classe une adresse du domaine de l enseigne avant une boite gmail', () => {
    const html = 'ecrire a patron.perso@gmail.com ou contact@chez-marcel.fr';
    const r = extraireEmails(html, { nom: 'Chez Marcel' });
    assert.equal(r[0].adresse, 'contact@chez-marcel.fr');
    assert.ok(r[0].note > r[1].note);
  });

  test('une boite grand public reste retenue : c est la norme sur ces cibles', () => {
    const r = extraireEmails('salon.ludivine@orange.fr');
    assert.equal(r.length, 1);
    assert.ok(r[0].note >= 40);
  });

  test('deduplique en gardant la meilleure note', () => {
    const r = extraireEmails('contact@salon.fr <a href="mailto:contact@salon.fr">x</a>');
    assert.equal(r.length, 1);
  });

  test('slug neutralise accents et ponctuation', () => {
    assert.equal(slug("Crêperie de l'Île"), 'creperiedelile');
  });

  test('noterEmail borne le resultat entre 0 et 100', () => {
    const n = noterEmail('contact@chez-marcel.fr', { nom: 'Chez Marcel', hote: 'chez-marcel.fr' });
    assert.ok(n > 0 && n <= 100);
  });
});

describe('decoupage geographique', () => {
  const boite = boiteAutour(47.2184, -1.5536, 5);

  test('une boite de rayon 5 km mesure 10 km de cote', () => {
    const { largeur, hauteur } = tailleKm(boite);
    assert.ok(Math.abs(largeur - 10) < 0.1);
    assert.ok(Math.abs(hauteur - 10) < 0.1);
  });

  test('les cellules pavent la boite sans trou ni debordement', () => {
    const cellules = decouper(boite, 2);
    assert.equal(cellules.length, 25);
    assert.equal(Math.min(...cellules.map((c) => c.boite.sud)), boite.sud);
    assert.ok(Math.abs(Math.max(...cellules.map((c) => c.boite.nord)) - boite.nord) < 1e-9);
    // La largeur en km d'une cellule varie legerement avec sa latitude : on
    // verifie qu'aucune ne depasse la cible, a la marge de convergence pres.
    for (const c of cellules) {
      const t = tailleKm(c.boite);
      assert.ok(t.largeur <= 2.02 && t.hauteur <= 2.02, `cellule ${c.ref} : ${t.largeur} x ${t.hauteur}`);
    }
  });

  test('une zone plus petite que la cellule donne une seule cellule', () => {
    assert.equal(decouper(boiteAutour(47.2, -1.5, 0.3), 2).length, 1);
  });

  test('le rectangle API respecte le format low/high de Places', () => {
    const r = versRectangleApi(boite);
    assert.ok(r.low.latitude < r.high.latitude);
    assert.ok(r.low.longitude < r.high.longitude);
  });
});

describe('score prospect', () => {
  const base = { vitrine: VITRINE.AUCUNE, telephone: '02 40 00 00 00', avis: 50, note: 4.5, statutGoogle: 'OPERATIONAL' };

  test('un e-mail vaut plus qu un simple telephone', () => {
    assert.ok(noterProspect({ ...base, email: 'a@b.fr' }) > noterProspect(base));
  });

  test('un lien mort passe devant une page Facebook, elle-meme devant une plateforme', () => {
    const s = (v) => noterProspect({ ...base, vitrine: v });
    assert.ok(s(VITRINE.SITE_MORT) > s(VITRINE.RESEAU_SOCIAL));
    assert.ok(s(VITRINE.RESEAU_SOCIAL) > s(VITRINE.PLATEFORME));
  });

  test('un etablissement ferme tombe a zero', () => {
    assert.equal(noterProspect({ ...base, statutGoogle: 'CLOSED_PERMANENTLY' }), 0);
  });

  test('la note reste dans [0, 100] et l etiquette suit', () => {
    const parfait = noterProspect({ ...base, vitrine: VITRINE.SITE_MORT, email: 'a@b.fr', avis: 900, note: 5 });
    assert.ok(parfait <= 100);
    assert.equal(priorite(parfait), 'chaud');
    assert.equal(priorite(10), 'froid');
  });
});

describe('exports', () => {
  const prospects = [{
    id: 'X1', nom: 'Le "Bon" ; Coin', segment: 'restaurant', vitrine: VITRINE.AUCUNE,
    email: 'a@b.fr', telephone: '02', adresse: 'rue A', ville: 'Nantes', codePostal: '44000',
    note: 4.5, avis: 12, score: 80, emailsAlternatifs: ['c@d.fr', 'e@f.fr'],
  }];

  test('le CSV echappe guillemets et separateurs', () => {
    const csv = versCsv(prospects);
    assert.ok(csv.includes('"Le ""Bon"" ; Coin"'));
  });

  test('le CSV porte un BOM et autant de colonnes que d en-tetes', () => {
    const csv = versCsv(prospects);
    assert.ok(csv.startsWith('﻿'));
    const [entete, ligne] = csv.replace(/^﻿/, '').trim().split('\r\n');
    assert.equal(entete.split(';').length, COLONNES.length);
    assert.equal(ligne.match(/;/g).length >= COLONNES.length - 1, true);
  });

  test('le separateur virgule est respecte', () => {
    assert.ok(versCsv(prospects, { separateur: ',' }).includes('Enseigne,Segment'));
  });

  test('l enveloppe JSON annonce les totaux', () => {
    const j = versJson(prospects, { lieu: 'Nantes' });
    assert.equal(j.total, 1);
    assert.equal(j.avecEmail, 1);
    assert.equal(j.lieu, 'Nantes');
    assert.equal(j.prospects[0].emailsAlternatifsTexte, 'c@d.fr | e@f.fr');
  });
});

describe('robots.txt', () => {
  test('ne retient que le bloc User-agent: *', () => {
    const interdits = analyserRobots('User-agent: *\nDisallow: /admin\n\nUser-agent: GPTBot\nDisallow: /');
    assert.deepEqual(interdits, ['/admin']);
    assert.equal(cheminAutorise('/contact', interdits), true);
    assert.equal(cheminAutorise('/admin/list', interdits), false);
  });

  test('les commentaires et lignes vides sont ignores', () => {
    assert.deepEqual(analyserRobots('# rien\n\nUser-agent: *\nDisallow: /prive # secret'), ['/prive']);
  });
});

describe('normalisation et fusion', () => {
  const lieu = {
    id: 'C1', displayName: { text: 'Chez Marcel' }, formattedAddress: '1 rue A, 44000 Nantes',
    addressComponents: [{ longText: 'Nantes', types: ['locality'] }, { longText: '44000', types: ['postal_code'] }],
    nationalPhoneNumber: '02 40 00 00 00', rating: 4.5, userRatingCount: 30,
    businessStatus: 'OPERATIONAL', location: { latitude: 47.2, longitude: -1.5 },
  };

  test('extrait ville et code postal des composants d adresse', () => {
    const p = normaliser(lieu, { segment: 'restaurant' });
    assert.equal(p.ville, 'Nantes');
    assert.equal(p.codePostal, '44000');
    assert.equal(p.vitrine, VITRINE.AUCUNE);
    assert.ok(p.score > 0);
  });

  test('la fusion garde la fiche qui porte un e-mail', () => {
    const sans = normaliser(lieu, { segment: 'restaurant' });
    const avec = { ...sans, email: 'contact@marcel.fr', score: 90 };
    const r = fusionner([sans], [avec]);
    assert.equal(r.length, 1);
    assert.equal(r[0].email, 'contact@marcel.fr');
  });

  test('les fiches sans identifiant sont ecartees', () => {
    assert.equal(fusionner([{ nom: 'orphelin' }]).length, 0);
  });
});

describe('segments', () => {
  test('resout une liste et rejette un segment inconnu', () => {
    assert.equal(resoudreSegments('restaurant,coiffeur').length, 2);
    assert.throws(() => resoudreSegments('licorne'), /Segment inconnu/);
  });
});
