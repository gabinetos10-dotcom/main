/**
 * Jeu de donnees d'exemple.
 *
 * Sert a deux choses : essayer toute la chaine sans consommer un seul appel
 * facture, et remplir la console au premier lancement pour qu'elle s'ouvre sur
 * un ecran de travail plutot que sur un formulaire vide. Ces enseignes sont
 * inventees — les noms, telephones et adresses ne designent personne.
 */
import { normaliser } from './normaliser.mjs';
import { noterProspect } from './score.mjs';

const RUES = ['rue Crebillon', 'rue du Calvaire', 'quai de la Fosse', 'rue Paul Bellamy',
  'boulevard des Poilus', 'rue de Verdun', 'place du Bouffay', 'rue Jean-Jacques Rousseau',
  'route de Vannes', 'rue du Marechal Joffre', 'avenue de la Liberation', 'rue Sainte-Catherine'];

const FICHES = [
  ['Le Comptoir de Camille', 'restaurant', 'Restaurant', null, 4.6, 214],
  ['Chez Nino Pizzeria', 'pizzeria', 'Pizzeria', 'https://www.facebook.com/chez-nino-pizzeria', 4.4, 98],
  ['Bistrot des Halles', 'restaurant', 'Restaurant', 'https://bistrotdeshalles.business.site', 4.3, 156],
  ['La Table de Yann', 'restaurant', 'Restaurant francais', 'https://www.thefork.fr/restaurant/la-table-de-yann', 4.7, 302],
  ['Cantine Vietnamienne Sen', 'restaurant', 'Restaurant vietnamien', null, 4.5, 41],
  ['Le Petit Beurre', 'cafe', 'Salon de the', 'https://www.instagram.com/lepetitbeurre.nantes', 4.8, 67],
  ['Brasserie du Port', 'brasserie', 'Brasserie', null, 3.9, 188],
  ['Boulangerie Moreau', 'boulangerie', 'Boulangerie', null, 4.5, 129],
  ['Fournil Saint-Michel', 'boulangerie', 'Boulangerie-patisserie', 'https://www.facebook.com/fournilsaintmichel', 4.2, 74],
  ['Traiteur Maree Haute', 'traiteur', 'Traiteur', 'https://mareehaute-traiteur.fr', 4.6, 52],
  ['Boucherie Lemoine', 'boucherie', 'Boucherie', null, 4.7, 88],
  ['Salon Ludivine Coiffure', 'coiffeur', 'Salon de coiffure', 'https://www.planity.com/salon-ludivine-nantes', 4.9, 176],
  ['Atelier Coiffure & Co', 'coiffeur', 'Salon de coiffure', null, 4.4, 63],
  ['Coiffure Eclat', 'coiffeur', 'Salon de coiffure', 'https://coiffure-eclat.wixsite.com/monsite', 4.1, 39],
  ['Le Barbier de Nantes', 'barbier', 'Barbier', 'https://www.instagram.com/lebarbierdenantes', 4.8, 221],
  ['Barber Shop Erdre', 'barbier', 'Barbier', null, 4.3, 47],
  ['Institut Belle Epoque', 'esthetique', 'Institut de beaute', 'https://www.treatwell.fr/salon/belle-epoque', 4.6, 112],
  ['Nails & Co', 'ongles', 'Onglerie', 'https://www.facebook.com/nailsandco.nantes', 4.2, 58],
  ['Spa Zen Attitude', 'massage', 'Spa', null, 4.7, 93],
  ['Encre Noire Tattoo', 'tatoueur', 'Salon de tatouage', 'https://www.instagram.com/encrenoire.tattoo', 5.0, 84],
  ['Fleurs de Loire', 'fleuriste', 'Fleuriste', null, 4.5, 71],
  ['Garage Bertin', 'garage', 'Garage automobile', null, 4.4, 145],
  ['Auto Services Cheviré', 'garage', 'Garage automobile', 'https://autoservices-chevire.business.site', 4.0, 62],
  ['Carrosserie Guerin', 'carrosserie', 'Carrossier', null, 4.6, 37],
  ['Plomberie Riviere', 'plombier', 'Plombier', null, 4.8, 29],
  ['Elec Ouest', 'electricien', 'Electricien', 'https://www.facebook.com/elecouest44', 4.3, 24],
  ['Menuiserie Daniel & Fils', 'menuisier', 'Menuisier', null, 4.9, 18],
  ['Peinture Decor 44', 'peintre', 'Peintre en batiment', null, 4.2, 15],
  ['Serrurier Express Nantes', 'serrurier', 'Serrurier', 'https://www.pagesjaunes.fr/pros/serrurier-express', 3.6, 41],
  ['Jardins de l Erdre', 'paysagiste', 'Paysagiste', null, 4.7, 33],
  ['Pressing du Centre', 'pressing', 'Pressing', null, 3.8, 56],
  ['Cordonnerie Talon Minute', 'cordonnier', 'Cordonnerie', null, 4.4, 44],
  ['Optique Graslin', 'optique', 'Opticien', 'https://optique-graslin.fr', 4.6, 108],
  ['Bijoux Amethyste', 'bijouterie', 'Bijouterie', 'https://www.facebook.com/bijouxamethyste', 4.5, 51],
  ['Dressing Vintage', 'pretaporter', 'Magasin de vetements', 'https://www.instagram.com/dressingvintage.nantes', 4.7, 79],
  ['Toilettage Patte de Velours', 'animalerie', 'Toilettage', null, 4.9, 66],
  ['Clinique Veterinaire des Dervallieres', 'veterinaire', 'Veterinaire', 'https://vetodervallieres.fr', 4.4, 187],
  ['Cabinet Kine Beaulieu', 'kine', 'Kinesitherapeute', 'https://www.doctolib.fr/kine/nantes/cabinet-beaulieu', 4.8, 96],
  ['Immo Loire Conseil', 'immobilier', 'Agence immobiliere', 'https://immoloireconseil.com', 4.1, 73],
  ['Fitness Club Beaujoire', 'sport', 'Salle de sport', 'https://www.facebook.com/fitnessclubbeaujoire', 4.0, 204],
  ['Auto-ecole du Rond-Point', 'autoecole', 'Auto-ecole', null, 4.3, 87],
  ['Le Relais des Voyageurs', 'hotel', 'Hotel', 'https://www.booking.com/hotel/fr/relais-voyageurs', 4.2, 341],
];

// Adresses attribuees a une partie des fiches : sur le terrain, une bonne
// moitie des enseignes sans site n'expose aucun e-mail trouvable.
const EMAILS = {
  'Chez Nino Pizzeria': ['contact@cheznino-pizza.fr', 88],
  'Bistrot des Halles': ['bistrotdeshalles44@gmail.com', 62],
  'Cantine Vietnamienne Sen': ['sen.cantine@orange.fr', 58],
  'Le Petit Beurre': ['bonjour@lepetitbeurre-nantes.fr', 92],
  'Boulangerie Moreau': ['boulangerie.moreau@wanadoo.fr', 55],
  'Fournil Saint-Michel': ['fournilstmichel@gmail.com', 60],
  'Atelier Coiffure & Co': ['ateliercoiffureco@gmail.com', 61],
  'Coiffure Eclat': ['contact@coiffure-eclat.fr', 90],
  'Le Barbier de Nantes': ['lebarbierdenantes@gmail.com', 63],
  'Institut Belle Epoque': ['institut.belleepoque@orange.fr', 57],
  'Nails & Co': ['nailsandco.nantes@gmail.com', 59],
  'Encre Noire Tattoo': ['encrenoire.tattoo@gmail.com', 64],
  'Garage Bertin': ['garage.bertin@wanadoo.fr', 56],
  'Auto Services Cheviré': ['contact@autoservices-chevire.fr', 87],
  'Carrosserie Guerin': ['carrosserie.guerin@free.fr', 54],
  'Plomberie Riviere': ['plomberie.riviere@gmail.com', 60],
  'Elec Ouest': ['elecouest44@gmail.com', 61],
  'Menuiserie Daniel & Fils': ['menuiserie.daniel@orange.fr', 58],
  'Fleurs de Loire': ['fleursdeloire@gmail.com', 59],
  'Jardins de l Erdre': ['jardinsdelerdre@gmail.com', 58],
  'Toilettage Patte de Velours': ['pattedevelours.toilettage@gmail.com', 60],
  'Cordonnerie Talon Minute': ['talonminute.nantes@orange.fr', 55],
  'Bijoux Amethyste': ['contact@bijoux-amethyste.fr', 91],
  'Dressing Vintage': ['dressingvintage.nantes@gmail.com', 62],
  'Auto-ecole du Rond-Point': ['autoecole.rondpoint@wanadoo.fr', 57],
  'Spa Zen Attitude': ['contact@spa-zenattitude.fr', 89],
};

/** Generateur pseudo-aleatoire deterministe : le jeu d'exemple ne bouge pas. */
function tirage(graine) {
  let etat = graine;
  return () => {
    etat = (etat * 1664525 + 1013904223) % 4294967296;
    return etat / 4294967296;
  };
}

/** Construit le jeu d'exemple, deja normalise et note. */
export function jeuDemo() {
  const alea = tirage(20260906);
  return FICHES.map(([nom, segment, typeGoogle, site, note, avis], i) => {
    const numero = 1 + Math.floor(alea() * 180);
    const rue = RUES[Math.floor(alea() * RUES.length)];
    const lieu = {
      id: `DEMO_${String(i + 1).padStart(3, '0')}`,
      displayName: { text: nom },
      formattedAddress: `${numero} ${rue}, 44000 Nantes, France`,
      addressComponents: [
        { longText: 'Nantes', types: ['locality'] },
        { longText: '44000', types: ['postal_code'] },
      ],
      location: { latitude: 47.2 + alea() * 0.05, longitude: -1.58 + alea() * 0.07 },
      nationalPhoneNumber: `02 40 ${String(10 + Math.floor(alea() * 89))} ${String(10 + Math.floor(alea() * 89))} ${String(10 + Math.floor(alea() * 89))}`,
      websiteUri: site,
      rating: note,
      userRatingCount: avis,
      primaryTypeDisplayName: { text: typeGoogle },
      businessStatus: 'OPERATIONAL',
      googleMapsUri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nom + ' Nantes')}`,
    };
    const p = normaliser(lieu, { segment, cellule: `${String.fromCharCode(65 + (i % 5))}${1 + (i % 4)}` });
    const email = EMAILS[nom];
    if (email) {
      p.email = email[0];
      p.confianceEmail = email[1];
      p.sourceEmail = site || 'saisie manuelle';
    }
    // Le score depend de la presence d'un e-mail : on le recalcule apres coup.
    p.score = noterProspect(p);
    return p;
  });
}
